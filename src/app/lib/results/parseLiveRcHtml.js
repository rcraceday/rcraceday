import { normalizeDriverName, parseDriverName } from "./driverName.js";
import {
  parseConsistencyPct,
  parseLapsTime,
  parseOverallResultFinishes,
  parseResultLabel,
  parseStatusFromLabel,
  parseTimeToMs,
  looksLikeOverallResultCell,
} from "./resultTime.js";
import { assignOverallPositions } from "./overallOrder.js";
import { compareRacesForDisplay } from "./resultTime.js";
import { enrichOverallRowsFromRaces } from "./aggregateDriverStats.js";
import {
  DEFAULT_LIVE_RC_QUAL_ORDER,
  parseLiveRcMetricCell,
  qualifyingOrderFromUrl,
  qualifyingOrderLabel,
  sortQualifyingEntries,
  withQualifyingOrder,
} from "./qualifyingRank.js";
import { isDisplayableClassName, normalizeResultClassName } from "./classNames.js";

function decodeEntities(text) {
  return String(text || "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&quot;/gi, '"');
}

function stripTags(html) {
  return decodeEntities(String(html || "").replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

export function extractTables(html) {
  const tables = [];
  const source = String(html || "");
  const tableRe = /<table\b[^>]*>([\s\S]*?)<\/table>/gi;
  let tableMatch;
  while ((tableMatch = tableRe.exec(source))) {
    const rows = [];
    const rowRe = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
    let rowMatch;
    while ((rowMatch = rowRe.exec(tableMatch[1]))) {
      const cells = [];
      const cellRe = /<t[hd]\b[^>]*>([\s\S]*?)<\/t[hd]>/gi;
      let cellMatch;
      while ((cellMatch = cellRe.exec(rowMatch[1]))) {
        cells.push(stripTags(cellMatch[1]));
      }
      if (cells.some(Boolean)) rows.push(cells);
    }
    if (rows.length) tables.push(rows);
  }
  return tables;
}

export function extractLinks(html, baseUrl) {
  const links = [];
  const re = /href=["']([^"']+)["']/gi;
  let match;
  while ((match = re.exec(String(html || "")))) {
    try {
      links.push(new URL(match[1].replace(/&amp;/g, "&"), baseUrl).toString());
    } catch {
      // ignore invalid hrefs
    }
  }
  return [...new Set(links)];
}

export function classifyLiveRcUrl(url) {
  try {
    const parsed = new URL(url);
    const page = parsed.searchParams.get("p") || "";
    const id = parsed.searchParams.get("id") || "";
    if (page === "view_race_result") return { kind: "race", id, url };
    if (page === "view_multi_main_result") return { kind: "multi", id, url };
    if (page === "event_overall_ranking") return { kind: "overall", id, url };
    if (page === "view_round_ranking") return { kind: "qualifying", id, url };
    if (page === "view_entry_list" || page === "view_heat_sheet" || page === "view_points") {
      return { kind: "skip", id, url };
    }
    return { kind: "index", id, url };
  } catch {
    return { kind: "index", id: "", url };
  }
}

function uniqueRows(rows) {
  const seen = new Set();
  return rows.filter((row) => {
    const key = row.join("|").toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const RACE_TITLE = /(.+?)\s*\(([A-Z])(\d+)-Main\)/i;
const RACE_TITLE_LIVERC = /Race\s+\d+:\s*(.+?)\s+([A-Z])(\d+)-Main/i;
const RACE_TITLE_LETTER_MAIN = /(.+?)\s*\(([A-Z])\s*-?\s*Main\)/i;
const RACE_HEAT = /(.+?)\s*\(Heat\s+(\d+)\/(\d+)\)/i;
const MULTI_TITLE = /(.+?)\s+(?:Triple|Double|Single)?\s*([A-Z])-Main\s+Results/i;

function shortClassName(name) {
  return normalizeResultClassName(name) || "";
}

function tryAssignClassLabel(current, next) {
  const cleaned = normalizeResultClassName(next);
  return cleaned || current;
}

function pageTitleTag(html) {
  return stripTags((String(html || "").match(/<title[\s\S]*?<\/title>/i) || [""])[0]);
}

function parseMultiMainHeading(text) {
  const source = String(text || "").trim();
  if (!source) return null;
  const patterns = [
    /^(.+?)\s+(?:Triple|Double|Single)\s+([A-Z])-Main\s+Results/i,
    /^(.+?)\s+([A-Z])-Main\s+Results/i,
    MULTI_TITLE,
  ];
  for (const pattern of patterns) {
    const match = source.match(pattern);
    if (match) {
      return {
        className: shortClassName(match[1].trim()),
        mainLetter: match[2].toUpperCase(),
      };
    }
  }
  return null;
}

function parseMultiMainMeta(html) {
  const title = pageTitleTag(html);
  const h1 = stripTags((String(html || "").match(/<h1[\s\S]*?<\/h1>/i) || ["", ""])[1] || "");
  const titleParts = title.split("::").map((part) => part.trim()).filter(Boolean);
  const candidates = [
    h1,
    ...titleParts.filter((part) => /main\s+results/i.test(part)),
    title,
  ];
  for (const candidate of candidates) {
    const parsed = parseMultiMainHeading(candidate);
    if (parsed?.mainLetter) return parsed;
  }
  const th = parseRaceMainFromHtml(html);
  if (th?.mainLetter) {
    return { className: shortClassName(th.className), mainLetter: th.mainLetter };
  }
  return { className: "", mainLetter: "" };
}

function parseRaceMainFromHtml(html) {
  const th = String(html || "").match(/<th[^>]*colspan[^>]*>([\s\S]*?)<\/th>/i);
  const text = stripTags(th?.[1] || "");
  const match = text.match(/(?:\d+\s+)?(.+?)\s+([A-Z])(\d+)?\s*-?\s*Main/i);
  if (!match) return null;
  return {
    className: match[1].trim(),
    mainLetter: match[2].toUpperCase(),
    mainNumber: match[3] ? Number(match[3]) : 1,
  };
}

function headerIndex(row, ...names) {
  const lowered = row.map((cell) => cell.toLowerCase());
  for (const name of names) {
    const needle = name.toLowerCase();
    const exact = lowered.indexOf(needle);
    if (exact >= 0) return exact;
    const partial = lowered.findIndex((cell) => cell.includes(needle));
    if (partial >= 0) return partial;
  }
  return -1;
}

function parseRaceTables(url, html) {
  const tables = extractTables(html).map(uniqueRows);
  const titleText = stripTags((html.match(/<h1[\s\S]*?<\/h1>|<h2[\s\S]*?<\/h2>|<h3[\s\S]*?<\/h3>/i) || [""])[0]);
  let className = "";
  let mainLetter = null;
  let mainNumber = null;
  let raceKind = "main";
  const thMain = parseRaceMainFromHtml(html);
  const mainMatch =
    titleText.match(RACE_TITLE) ||
    html.match(RACE_TITLE) ||
    titleText.match(RACE_TITLE_LIVERC) ||
    html.match(RACE_TITLE_LIVERC);
  const heatMatch = titleText.match(RACE_HEAT) || html.match(RACE_HEAT);
  if (thMain) {
    className = thMain.className;
    mainLetter = thMain.mainLetter;
    mainNumber = thMain.mainNumber;
  } else if (mainMatch) {
    className = shortClassName(mainMatch[1].replace(/Results.*$/i, "").trim());
    mainLetter = mainMatch[2].toUpperCase();
    mainNumber = Number(mainMatch[3]);
  } else {
    const letterMain =
      titleText.match(RACE_TITLE_LETTER_MAIN) ||
      html.match(RACE_TITLE_LETTER_MAIN) ||
      titleText.match(/Race\s+\d+:\s*(.+?)\s+([A-Z])\s*-?\s*Main/i) ||
      html.match(/Race\s+\d+:\s*(.+?)\s+([A-Z])\s*-?\s*Main/i);
    if (letterMain) {
      className = shortClassName(letterMain[1].replace(/Results.*$/i, "").trim());
      mainLetter = letterMain[2].toUpperCase();
      mainNumber = 1;
    }
  }
  if (!mainLetter && !mainNumber && heatMatch) {
    className = heatMatch[1].replace(/Results.*$/i, "").trim();
    raceKind = "qualifying";
  }

  const entries = [];
  tables.forEach((rows) => {
    const header = rows.find((row) => headerIndex(row, "pos") >= 0 && headerIndex(row, "driver") >= 0);
    if (!header) return;
    const posCol = headerIndex(header, "pos");
    const driverCol = headerIndex(header, "driver");
    const qualCol = headerIndex(header, "qual");
    const lapsCol = headerIndex(header, "laps/time");
    const fastCol = headerIndex(header, "fastest lap", "fastest lap (lap #)");
    const avgCol = headerIndex(header, "avg lap");
    const top3Col = headerIndex(header, "top 3 consecutive");
    const consCol = headerIndex(header, "consistency");
    rows.forEach((row) => {
      if (row === header) return;
      const position = Number(row[posCol]);
      if (!Number.isFinite(position)) return;
      let driverCell = row[driverCol] || "";
      driverCell = driverCell.replace(/\s*view laps\s*$/i, "").trim();
      const carMatch = driverCell.match(/^(\d+)\s+(.+)$/);
      const parsedName = parseDriverName(carMatch ? carMatch[2] : driverCell);
      const lapsTimeLabel = lapsCol >= 0 ? row[lapsCol] : "";
      entries.push({
        position,
        ...parsedName,
        carNumber: carMatch ? carMatch[1] : null,
        seed: qualCol >= 0 && row[qualCol] ? Number(row[qualCol]) : null,
        ...parseLapsTime(lapsTimeLabel),
        fastLapMs: fastCol >= 0 ? parseTimeToMs(String(row[fastCol] || "").split(" ")[0]) : null,
        avgLapMs: avgCol >= 0 ? parseTimeToMs(String(row[avgCol] || "").split(" ")[0]) : null,
        top3ConMs: top3Col >= 0 ? parseTimeToMs(row[top3Col]) : null,
        consistencyPct: consCol >= 0 ? parseConsistencyPct(row[consCol]) : null,
        status: parseStatusFromLabel(lapsTimeLabel),
      });
    });
  });

  if (!entries.length) return null;
  if (raceKind === "main" && mainLetter && (mainNumber == null || !Number.isFinite(mainNumber))) {
    mainNumber = 1;
  }
  return {
    className: className || "Unknown",
    mainLetter,
    mainNumber,
    roundLabel: raceKind === "qualifying" ? "Q" : "M",
    raceKind,
    sourceRaceId: classifyLiveRcUrl(url).id,
    entries,
  };
}

function segmentColumnsForMain(header, mainLetter) {
  const letter = String(mainLetter || "A").toUpperCase();
  const letterCols = header
    .map((cell, index) => {
      const key = String(cell).trim().replace(/\s+/g, "");
      const match = /^([A-Z])(\d+)$/i.exec(key);
      return match && match[1].toUpperCase() === letter ? index : -1;
    })
    .filter((index) => index >= 0);
  if (letterCols.length) return letterCols;
  const letterLower = letter.toLowerCase();
  return header
    .map((cell, index) => {
      const trimmed = String(cell).trim();
      return new RegExp(`^${letterLower}\\d+$`, "i").test(trimmed) ? index : -1;
    })
    .filter((index) => index >= 0);
}

function parseMultiMainTables(html) {
  const { className, mainLetter } = parseMultiMainMeta(html);
  if (!mainLetter) return [];
  const tables = extractTables(html).map(uniqueRows);
  const rowsOut = [];
  tables.forEach((rows) => {
    const header = rows.find((row) => headerIndex(row, "pos") >= 0 && headerIndex(row, "driver") >= 0);
    if (!header) return;
    const posCol = headerIndex(header, "pos");
    const driverCol = headerIndex(header, "driver");
    const pointsCol = headerIndex(header, "points");
    const aCols = segmentColumnsForMain(header, mainLetter);
    rows.forEach((row) => {
      if (row === header) return;
      const position = Number(row[posCol]);
      if (!Number.isFinite(position)) return;
      const parsedName = parseDriverName(row[driverCol]);
      const mains = aCols.map((col, index) => {
        const label = row[col] || "";
        const finishMatch = label.match(/^(\d+)(?:st|nd|rd|th)/i);
        const lapsPart = parseResultLabel(
          label.replace(/^\d+(?:st|nd|rd|th)\s*\([^)]*\)\s*:\s*/i, "")
        );
        return {
          letter: mainLetter,
          mainNumber: index + 1,
          resultLabel: label,
          ...lapsPart,
          finish: finishMatch ? Number(finishMatch[1]) : lapsPart.finish,
        };
      });
      rowsOut.push({
        className,
        mainLetter,
        position,
        ...parsedName,
        ifmarPoints:
          pointsCol >= 0 && /^\d+(\.\d+)?$/.test(String(row[pointsCol] || "").trim())
            ? Number(row[pointsCol])
            : null,
        tieBreaker: null,
        mains,
      });
    });
  });
  return rowsOut;
}

export function parseMainLetterFromOverallLabel(raceLabel) {
  const text = String(raceLabel || "").trim();
  if (!text) return null;
  const patterns = [
    /\b([A-Z])\s*\d+\s*-?\s*Main\b/i,
    /\b([A-Z])\s*-?\s*Main\b/i,
    /\b([A-Z])\s*\d+\s*Main\b/i,
    /^([A-Z])\d+\b/i,
    /^([A-Z])\s+Main$/i,
    /\b([A-Z])\s*Main\b/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1].toUpperCase();
  }
  return null;
}

function overallRowRaceLabel(row) {
  const mainCell = row.findIndex((cell) =>
    /\bmain\b|[A-Z]\s*\d+\s*-?\s*Main|^[A-Z]\d+$/i.test(String(cell))
  );
  if (mainCell >= 0) return String(row[mainCell] || "").trim();
  return String(row[row.length - 1] || "").trim();
}

function parseMainNumberFromOverallLabel(raceLabel) {
  const text = String(raceLabel || "").trim();
  const numbered = text.match(/\b([A-Z])\s*(\d+)\s*-?\s*Main\b/i) || text.match(/^([A-Z])(\d+)\b/i);
  if (numbered) return Number(numbered[2]);
  return 1;
}

function fallbackDriverCell(row) {
  const index = row.findIndex(
    (cell, cellIndex) =>
      cellIndex > 0 &&
      /[a-z]/i.test(cell) &&
      !/\bmain\b/i.test(cell) &&
      !looksLikeOverallResultCell(cell) &&
      !/^[A-Z]\d+$/i.test(String(cell).trim())
  );
  return index >= 0 ? row[index] : row[3] || row[1] || "";
}

function mainsFromOverallResult(resultText, letter, mainNumber) {
  const finishes = parseOverallResultFinishes(resultText);
  if (!finishes.length) return [];
  const countingSum = finishes.slice(1).reduce((sum, value) => sum + value, 0);
  const positions =
    finishes.length >= 2 && finishes[0] === countingSum ? finishes.slice(1) : finishes;
  const start = positions.length === 1 ? mainNumber || 1 : 1;
  return positions.map((finish, index) => ({
    letter,
    mainNumber: start + index,
    finish,
  }));
}

function parseOverallRanking(html) {
  const tables = extractTables(html).map(uniqueRows);
  const results = [];
  let currentClass = "";
  tables.forEach((rows) => {
    let header = null;
    rows.forEach((row) => {
      if (row.length === 1 && row[0] && !/pos/i.test(row[0])) {
        currentClass = tryAssignClassLabel(currentClass, row[0]);
        return;
      }
      if (headerIndex(row, "pos") >= 0 && headerIndex(row, "driver") >= 0) {
        header = row;
        currentClass = currentClass || tryAssignClassLabel("", row[0]);
        return;
      }
      const posCol = header ? headerIndex(header, "pos") : 0;
      const position = Number(row[posCol] ?? row[0]);
      if (!Number.isFinite(position)) {
        if (row[0] && !/pos|brand|country/i.test(row[0])) {
          currentClass = tryAssignClassLabel(currentClass, row[0]);
        }
        return;
      }
      const driverCol = header ? headerIndex(header, "driver") : -1;
      const pointsCol = header ? headerIndex(header, "points") : -1;
      const resultCol = header ? headerIndex(header, "result") : -1;
      const raceCol = header ? headerIndex(header, "race") : -1;
      const driverName =
        driverCol >= 0 && row[driverCol] && !looksLikeOverallResultCell(row[driverCol])
          ? row[driverCol]
          : fallbackDriverCell(row);
      const raceLabel = raceCol >= 0 ? String(row[raceCol] || "").trim() : overallRowRaceLabel(row);
      const parsedLetter = parseMainLetterFromOverallLabel(raceLabel);
      const mainLetter = parsedLetter || "A";
      const mainNumber = parseMainNumberFromOverallLabel(raceLabel);
      const pointsValue = pointsCol >= 0 ? Number(row[pointsCol]) : NaN;
      const resultText =
        resultCol >= 0
          ? row[resultCol]
          : pointsCol < 0
            ? row[raceCol > 0 ? raceCol - 1 : row.length - 2]
            : "";
      const mains = mainsFromOverallResult(resultText, mainLetter, mainNumber);
      results.push({
        className: shortClassName(currentClass),
        mainLetter,
        position,
        overallPosition: position,
        ...parseDriverName(driverName),
        ifmarPoints: Number.isFinite(pointsValue) ? pointsValue : null,
        tieBreaker: resultText || null,
        resultLabel: resultText || null,
        mains,
      });
    });
  });
  return results;
}

function parseQualifyingRoundLabel(html) {
  const title = pageTitleTag(html);
  const match = title.match(/Qualifier\s+Round\s+(\d+)/i);
  return match ? `Q${match[1]}` : "Q1";
}

function parseQualifyingTables(url, html, options = {}) {
  const qualifyingRankMethod =
    options.qualifyingRankMethod ||
    qualifyingOrderFromUrl(url) ||
    DEFAULT_LIVE_RC_QUAL_ORDER;
  const roundLabel = parseQualifyingRoundLabel(html);
  const tables = extractTables(html).map(uniqueRows);
  const races = [];
  let currentClass = "";
  tables.forEach((rows) => {
    const header = rows.find((row) => headerIndex(row, "pos") >= 0 && headerIndex(row, "driver") >= 0);
    if (!header) {
      const maybeClass = rows.find((row) => row.length === 1)?.[0];
      if (maybeClass) currentClass = tryAssignClassLabel(currentClass, maybeClass);
      return;
    }
    const posCol = headerIndex(header, "pos");
    const driverCol = headerIndex(header, "driver");
    const lapsCol = headerIndex(header, "laps/time");
    const fastCol = headerIndex(header, "fastest lap");
    const avgCol = headerIndex(header, "avg lap");
    const top2Col = headerIndex(header, "top 2 consecutive");
    const top3Col = headerIndex(header, "top 3 consecutive");
    const top5Col = headerIndex(header, "top 5 average");
    const heatCol = headerIndex(header, "heat");
    const entries = [];
    rows.forEach((row) => {
      if (row.length === 1) {
        currentClass = tryAssignClassLabel(currentClass, row[0]);
        return;
      }
      if (row === header) return;
      const position = Number(row[posCol]);
      if (!Number.isFinite(position)) return;
      const lapsParsed = parseLiveRcMetricCell(row[lapsCol]);
      const top5Parsed = parseLiveRcMetricCell(row[top5Col]);
      const top3Parsed = parseLiveRcMetricCell(row[top3Col]);
      const top2Parsed = parseLiveRcMetricCell(row[top2Col]);
      const fastParsed = parseLiveRcMetricCell(row[fastCol]);
      const avgParsed = parseLiveRcMetricCell(row[avgCol]);
      entries.push({
        position,
        ...parseDriverName(row[driverCol]),
        laps: lapsParsed?.laps ?? null,
        totalTimeMs: lapsParsed?.totalTimeMs ?? null,
        lapsTimeLabel: lapsParsed?.lapsTimeLabel ?? null,
        fastLapMs: fastParsed?.metricMs ?? null,
        avgLapMs: avgParsed?.metricMs ?? null,
        top2ConMs: top2Parsed?.metricMs ?? null,
        top3ConMs: top3Parsed?.metricMs ?? null,
        top5AvgMs: top5Parsed?.metricMs ?? null,
        qualHeatLabel: heatCol >= 0 ? String(row[heatCol] || "").trim() || null : null,
        seed: position,
        consistencyPct: null,
        status: parseStatusFromLabel(String(row[lapsCol] || "")),
      });
    });
    if (entries.length) {
      races.push({
        className: shortClassName(currentClass) || "Unknown",
        mainLetter: null,
        mainNumber: null,
        roundLabel,
        raceKind: "qualifying",
        qualifyingRankMethod,
        qualifyingRankLabel: qualifyingOrderLabel(qualifyingRankMethod),
        sourceRaceId: classifyLiveRcUrl(url).id,
        entries: sortQualifyingEntries(entries, qualifyingRankMethod),
      });
    }
  });
  return races;
}

function isRoundQualifyingRace(race) {
  return race?.raceKind === "qualifying" && Boolean(race.qualifyingRankMethod);
}

function isQualifyingHeatRace(race) {
  return race?.raceKind === "qualifying" && !race.qualifyingRankMethod;
}

/** One qualifier round + A1–A3 heads-up mains; drop per-class qual heats when round rankings exist. */
function applyHeadsUpGridSeeds(classRaces) {
  const qual = classRaces.find(isRoundQualifyingRace);
  const qualPosByDriver = new Map();
  if (qual) {
    (qual.entries || []).forEach((entry) => {
      qualPosByDriver.set(normalizeDriverName(entry.driverNameRaw), entry.position);
    });
  }

  const mains = classRaces
    .filter((race) => race.raceKind !== "qualifying" && race.mainNumber != null)
    .sort((a, b) => (a.mainNumber || 0) - (b.mainNumber || 0));

  const finishByDriverAndMain = new Map();
  mains.forEach((race) => {
    (race.entries || []).forEach((entry) => {
      finishByDriverAndMain.set(
        `${race.mainNumber}::${normalizeDriverName(entry.driverNameRaw)}`,
        entry.position
      );
    });
  });

  return classRaces.map((race) => {
    if (race.raceKind === "qualifying" || race.mainNumber == null) return race;
    const entries = (race.entries || []).map((entry) => {
      if (entry.seed != null && entry.seed !== "" && Number.isFinite(Number(entry.seed))) {
        return entry;
      }
      const driverKey = normalizeDriverName(entry.driverNameRaw);
      const seed =
        race.mainNumber === 1
          ? qualPosByDriver.get(driverKey)
          : finishByDriverAndMain.get(`${race.mainNumber - 1}::${driverKey}`);
      if (seed == null) return entry;
      return { ...entry, seed };
    });
    return { ...race, entries };
  });
}

function sortRacesForDisplay(races) {
  return [...races].sort((a, b) => {
    const classCmp = String(a.className).localeCompare(String(b.className));
    if (classCmp !== 0) return classCmp;
    return compareRacesForDisplay(a, b);
  });
}

export function detectLiveRcRaceFormat(races, pages = []) {
  const hasRoundQual = races.some(isRoundQualifyingRace);
  const hasQualHeats = races.some(isQualifyingHeatRace);
  const mainNumbers = races
    .filter((race) => race.raceKind !== "qualifying")
    .map((race) => race.mainNumber ?? 1);
  const maxMain = mainNumbers.length ? Math.max(...mainNumbers) : 0;
  const hasTriple = [1, 2, 3].every((n) => mainNumbers.includes(n));
  const hasMulti = (pages || []).some((page) => classifyLiveRcUrl(page.url).kind === "multi");
  const mainLetters = new Set(
    races
      .filter((race) => race.raceKind !== "qualifying" && race.mainLetter)
      .map((race) => String(race.mainLetter).toUpperCase())
  );
  const clubStyleLadder = mainLetters.size > 1;

  if (hasRoundQual && hasTriple && !clubStyleLadder) return "triple_heads_up";
  if (hasRoundQual && maxMain <= 1 && !clubStyleLadder) return "single_main";
  if (!hasRoundQual && hasQualHeats) return "qual_heats";
  if (hasMulti && hasTriple && !clubStyleLadder) return "triple_heads_up";
  return "club_mains";
}

function normalizeLiveRcRaceList(races, raceFormat = "auto", pages = []) {
  const resolved = raceFormat === "auto" ? detectLiveRcRaceFormat(races, pages) : raceFormat;
  const hasRoundQual = races.some(isRoundQualifyingRace);
  let list = [...races];

  if (resolved !== "qual_heats" && hasRoundQual) {
    list = list.filter((race) => !isQualifyingHeatRace(race));
  }

  if (resolved === "triple_heads_up") {
    list = list.filter((race) => {
      if (race.raceKind === "qualifying") return true;
      const letter = String(race.mainLetter || "A").toUpperCase();
      const segment = race.mainNumber ?? 1;
      if (letter !== "A") return true;
      return segment >= 1 && segment <= 3;
    });
  } else if (resolved === "single_main") {
    list = list.filter(
      (race) => race.raceKind === "qualifying" || (race.mainNumber ?? 1) === 1
    );
  }

  const byClass = new Map();
  list.forEach((race) => {
    const key = race.className || "Unknown";
    if (!byClass.has(key)) byClass.set(key, []);
    byClass.get(key).push(race);
  });

  list = [];
  byClass.forEach((classRaces) => {
    list.push(...applyHeadsUpGridSeeds(classRaces));
  });
  return sortRacesForDisplay(list);
}

export function finalizeLiveRcRaces(races, options = {}) {
  const list = normalizeLiveRcRaceList(
    races,
    options.raceFormat || "auto",
    options.pages || []
  );
  list.forEach((race, index) => {
    race.sortIndex = index;
  });
  return list;
}

export function parseLiveRcPages(pages, meta = {}) {
  let races = [];
  let overall = [];
  const rankingOverall = [];
  (pages || []).forEach((page, index) => {
    const classified = classifyLiveRcUrl(page.url);
    if (classified.kind === "race") {
      const race = parseRaceTables(page.url, page.html);
      if (race) {
        race.sortIndex = races.length;
        races.push(race);
      }
    } else if (classified.kind === "multi") {
      parseMultiMainTables(page.html).forEach((row) => {
        overall.push({ ...row, sourceIndex: index });
      });
    } else if (classified.kind === "overall") {
      rankingOverall.push(...parseOverallRanking(page.html));
    } else if (classified.kind === "qualifying") {
      const qualifyingRankMethod =
        meta.qualifyingOrder ?? qualifyingOrderFromUrl(page.url) ?? DEFAULT_LIVE_RC_QUAL_ORDER;
      parseQualifyingTables(page.url, page.html, {
        qualifyingRankMethod,
      }).forEach((race) => {
        race.sortIndex = races.length;
        races.push(race);
      });
    }
  });

  if (rankingOverall.length) {
    const multiRows = [...overall];
    const multiMainKey = (row) =>
      `${normalize(shortClassName(row.className))}::${normalize(row.mainLetter || "A")}::${normalize(row.driverNameRaw)}`;
    const letterNameKey = (row) =>
      `${normalize(row.mainLetter || "A")}::${normalize(row.driverNameRaw)}`;
    const byKey = new Map();
    const byLetterName = new Map();
    multiRows.forEach((row) => {
      const key = multiMainKey(row);
      const prev = byKey.get(key);
      if (!prev || (row.sourceIndex || 0) >= (prev.sourceIndex || 0)) {
        byKey.set(key, row);
      }
      const letterKey = letterNameKey(row);
      const prevLetter = byLetterName.get(letterKey);
      if (!prevLetter || (row.sourceIndex || 0) >= (prevLetter.sourceIndex || 0)) {
        byLetterName.set(letterKey, row);
      }
    });

    const mergedRanking = rankingOverall.map((row) => {
      const match = byKey.get(multiMainKey(row)) || byLetterName.get(letterNameKey(row));
      const sameLetter =
        match && String(match.mainLetter || "A").toUpperCase() === String(row.mainLetter || "A").toUpperCase();
      const mains = sameLetter && match?.mains?.length ? match.mains : row.mains;
      return {
        ...row,
        className: shortClassName(row.className),
        mains: mains?.length ? mains : row.mains,
        ifmarPoints: row.ifmarPoints ?? (sameLetter ? match?.ifmarPoints : null) ?? null,
        position: row.position ?? match?.position,
        overallPosition: row.overallPosition ?? row.position,
      };
    });

    overall = assignOverallPositions(mergedRanking);
  } else {
    const latest = new Map();
    overall.forEach((row) => {
      const key = `${row.className}::${row.mainLetter}::${normalize(row.driverNameRaw)}`;
      const prev = latest.get(key);
      if (!prev || row.sourceIndex >= prev.sourceIndex) latest.set(key, row);
    });
    overall = assignOverallPositions([...latest.values()]);
  }

  races.forEach((race) => {
    race.className = normalizeResultClassName(race.className) || race.className;
  });
  overall.forEach((row) => {
    row.className = normalizeResultClassName(row.className) || row.className;
  });

  races = finalizeLiveRcRaces(races, {
    raceFormat: meta.raceFormat || "auto",
    pages,
  });

  overall = enrichOverallRowsFromRaces(overall, races);

  const raceFormat =
    meta.raceFormat && meta.raceFormat !== "auto"
      ? meta.raceFormat
      : detectLiveRcRaceFormat(races, pages);

  return {
    source: "liverc_url",
    sourceLabel: meta.sourceLabel || "LiveRC",
    sourceUrl: meta.sourceUrl || pages?.[0]?.url || null,
    livercEventId: meta.livercEventId || null,
    title: meta.title || "LiveRC Results",
    qualifyingOrder: meta.qualifyingOrder ?? null,
    raceFormat,
    races: races.filter((race) => isDisplayableClassName(race.className)),
    overall: overall.filter((row) => isDisplayableClassName(row.className)),
  };
}

function normalize(name) {
  return String(name || "").trim().toLowerCase();
}

export function collectLiveRcChildUrls(indexHtml, indexUrl, options = {}) {
  const classified = extractLinks(indexHtml, indexUrl)
    .map(classifyLiveRcUrl)
    .filter((item) => ["race", "multi", "overall", "qualifying"].includes(item.kind));
  const seen = new Set();
  return classified.filter((item) => {
    let url = item.url;
    if (item.kind === "qualifying" && options.qualifyingOrder) {
      url = withQualifyingOrder(url, options.qualifyingOrder);
      item.url = url;
    }
    if (seen.has(url)) return false;
    seen.add(url);
    return true;
  });
}

export function extractLiveRcEventMeta(html, url) {
  const classified = classifyLiveRcUrl(url);
  const idFromLink = extractLinks(html, url)
    .map(classifyLiveRcUrl)
    .find((item) => item.kind === "overall" && item.id);
  const title =
    stripTags((html.match(/<h1[\s\S]*?<\/h1>/i) || [""])[0]) ||
    stripTags((html.match(/<title[\s\S]*?<\/title>/i) || [""])[0]);
  return {
    livercEventId: classified.id || idFromLink?.id || null,
    title: title.replace(/::.*$/, "").trim(),
  };
}
