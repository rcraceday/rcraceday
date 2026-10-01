import { parseDriverName } from "./driverName.js";
import {
  parseConsistencyPct,
  parseLapsTime,
  parseResultLabel,
  parseStatusFromLabel,
  parseTimeToMs,
} from "./resultTime.js";
import { assignOverallPositions } from "./overallOrder.js";
import { readSpreadsheetGrid } from "./readXlsGrid.js";

const RACE_TITLE = /^(.+?)\s*\(([ABC])(\d+)\s*Main\)/i;
const LAPS_TIME = /^\d+\s*\/\s*\d+:\d+/;

function cell(row, col) {
  const value = row?.[col];
  if (value == null) return "";
  return String(value).replace(/\s+/g, " ").trim();
}

function cellsOf(row) {
  return (row || []).map((value) => cell([value], 0));
}

function findHeaderMap(row) {
  const map = {};
  (row || []).forEach((value, col) => {
    const key = cell([value], 0).toLowerCase();
    if (key === "driver name") map.driverName = col;
    if (key === "car #") map.car = col;
    if (key === "mfr") map.manufacturer = col;
    if (key === "laps/time") map.lapsTime = col;
    if (key === "fast lap") map.fastLap = col;
    if (key === "avg lap") map.avgLap = col;
    if (key === "seed #") map.seed = col;
    if (key === "top 3 con") map.top3 = col;
    if (key === "consistency") map.consistency = col;
  });
  if (map.driverName == null) return null;
  map.position = Math.max(0, map.driverName - 2);
  return map;
}

function parseRaceTitle(text) {
  const match = String(text || "").replace(/\s+/g, " ").trim().match(RACE_TITLE);
  if (!match) return null;
  return {
    className: match[1].trim(),
    mainLetter: match[2].toUpperCase(),
    mainNumber: Number(match[3]),
  };
}

function parseRaceEntry(row, header) {
  const name = cell(row, header.driverName);
  if (!name || /^driver name$/i.test(name)) return null;
  const positionText = cell(row, header.position);
  const position = Number(positionText);
  if (!Number.isFinite(position)) return null;
  const parsedName = parseDriverName(name);
  const lapsTimeLabel = cell(row, header.lapsTime);
  const lapsTime = parseLapsTime(lapsTimeLabel);
  return {
    position,
    ...parsedName,
    carNumber: cell(row, header.car) || null,
    manufacturer: cell(row, header.manufacturer) || null,
    ...lapsTime,
    fastLapMs: parseTimeToMs(cell(row, header.fastLap)),
    avgLapMs: parseTimeToMs(cell(row, header.avgLap)),
    seed: cell(row, header.seed) ? Number(cell(row, header.seed)) : null,
    top3ConMs: parseTimeToMs(cell(row, header.top3)),
    consistencyPct: parseConsistencyPct(cell(row, header.consistency)),
    status: parseStatusFromLabel(lapsTimeLabel),
  };
}

function parseMultiMainRow(row) {
  const values = cellsOf(row).filter(Boolean);
  if (values.length < 3) return null;
  const position = Number(values[0]);
  if (!Number.isFinite(position) || /fin/i.test(values[0])) return null;
  if (LAPS_TIME.test(values[1]) || values[1].startsWith("[")) return null;
  const parsedName = parseDriverName(values[1]);
  const rest = values.slice(2);
  const mains = [];
  let i = 0;
  while (i + 1 < rest.length && mains.length < 3) {
    const finish = Number(rest[i]);
    const label = rest[i + 1];
    if (!Number.isFinite(finish) || !String(label).startsWith("[")) break;
    mains.push({
      mainNumber: mains.length + 1,
      finish,
      resultLabel: label,
      ...parseResultLabel(label),
    });
    i += 2;
  }
  const leftover = rest.slice(i);
  let ifmarPoints = null;
  let tieBreaker = null;
  leftover.forEach((value) => {
    if (String(value).startsWith("[")) tieBreaker = value;
    else if (Number.isFinite(Number(value))) ifmarPoints = Number(value);
  });
  return {
    position,
    ...parsedName,
    ifmarPoints,
    tieBreaker,
    mains,
  };
}

export function parseLiveTimeRoundResultGrid(rows, meta = {}) {
  const races = [];
  const overallBlocks = [];
  let currentRace = null;
  let header = null;
  let currentOverall = null;
  let sourceIndex = 0;

  (rows || []).forEach((row) => {
    const joined = cellsOf(row).join(" | ");
    const titleCell = cellsOf(row).map(parseRaceTitle).find(Boolean);
    if (titleCell) {
      currentRace = {
        ...titleCell,
        roundLabel: /Round:\s*(\S+)/i.exec(joined)?.[1] || "M",
        raceKind: "main",
        sortIndex: races.length,
        entries: [],
      };
      races.push(currentRace);
      header = null;
      currentOverall = null;
      return;
    }

    if (/multi main results/i.test(joined)) {
      currentOverall = {
        className: currentRace?.className || "",
        mainLetter: currentRace?.mainLetter || "A",
        sourceIndex: sourceIndex++,
        rows: [],
      };
      overallBlocks.push(currentOverall);
      header = null;
      return;
    }

    if (currentOverall) {
      if (/fin/i.test(joined) && /driver name/i.test(joined) && /result/i.test(joined)) {
        return;
      }
      const parsed = parseMultiMainRow(row);
      if (parsed) currentOverall.rows.push(parsed);
      return;
    }

    const nextHeader = findHeaderMap(row);
    if (nextHeader) {
      header = nextHeader;
      return;
    }

    if (currentRace && header) {
      const entry = parseRaceEntry(row, header);
      if (entry) currentRace.entries.push(entry);
    }
  });

  const overall = [];
  overallBlocks.forEach((block) => {
    block.rows.forEach((row) => {
      overall.push({
        ...row,
        className: block.className,
        mainLetter: block.mainLetter,
        sourceIndex: block.sourceIndex,
      });
    });
  });

  const latest = new Map();
  overall.forEach((row) => {
    const key = `${row.className}::${row.mainLetter}::${normalizeKey(row.driverNameRaw)}`;
    const prev = latest.get(key);
    if (!prev || row.sourceIndex >= prev.sourceIndex) latest.set(key, row);
  });

  return {
    source: "livetime_xls",
    sourceLabel: meta.sourceLabel || "LiveTime Round Result",
    sourceUrl: meta.sourceUrl || null,
    livercEventId: null,
    title: meta.title || "Main Results",
    races,
    overall: assignOverallPositions([...latest.values()]),
  };
}

function normalizeKey(name) {
  return String(name || "").trim().toLowerCase();
}

export async function parseLiveTimeRoundResultFile(file) {
  const rows = await readSpreadsheetGrid(file);
  return parseLiveTimeRoundResultGrid(rows, {
    sourceLabel: file.name || "LiveTime Round Result",
  });
}
