const LAPS_TIME = /^(\d+)\s*\/\s*(\d+):(\d+(?:\.\d+)?)$/;
const MIN_SEC = /^(\d+):(\d+(?:\.\d+)?)$/;
const SECONDS = /^(\d+(?:\.\d+)?)$/;
const CONSISTENCY = /^(\d+(?:\.\d+)?)\s*%$/;
const RESULT_LABEL = /^\[(\d+)\]\s*(.+)$/;

export function parseTimeToMs(value) {
  const text = String(value || "").trim();
  if (!text || text === "9999") return null;
  const minSec = text.match(MIN_SEC);
  if (minSec) {
    return Math.round((Number(minSec[1]) * 60 + Number(minSec[2])) * 1000);
  }
  const sec = text.match(SECONDS);
  if (sec) return Math.round(Number(sec[1]) * 1000);
  return null;
}

export function parseLapsTime(value) {
  const text = String(value || "").trim();
  const match = text.match(LAPS_TIME);
  if (!match) {
    return { laps: null, totalTimeMs: null, lapsTimeLabel: text || null };
  }
  return {
    laps: Number(match[1]),
    totalTimeMs: Math.round((Number(match[2]) * 60 + Number(match[3])) * 1000),
    lapsTimeLabel: `${match[1]}/${match[2]}:${match[3]}`,
  };
}

export function parseStatusFromLabel(label) {
  const text = String(label || "");
  if (/\bDNS\b/i.test(text)) return "DNS";
  if (/\bDNF\b/i.test(text)) return "DNF";
  return null;
}

export function parseConsistencyPct(value) {
  const text = String(value || "").trim();
  const match = text.match(CONSISTENCY);
  if (!match) return null;
  return Number(match[1]);
}

export function parseResultLabel(value) {
  const text = String(value || "").trim();
  const match = text.match(RESULT_LABEL);
  const body = match ? match[2] : text;
  const lapsTime = parseLapsTime(body.replace(/\s*\((DNS|DNF)\)\s*$/i, "").trim());
  return {
    finish: match ? Number(match[1]) : null,
    label: text,
    status: parseStatusFromLabel(text),
    ...lapsTime,
  };
}

export function formatMs(ms) {
  if (ms == null || Number.isNaN(Number(ms))) return "—";
  const total = Number(ms) / 1000;
  if (total >= 60) {
    const minutes = Math.floor(total / 60);
    const seconds = (total - minutes * 60).toFixed(3);
    return `${minutes}:${seconds.padStart(6, "0")}`;
  }
  return total.toFixed(3);
}

export function positionsGained(seed, finish) {
  if (seed == null || finish == null) return null;
  return Number(seed) - Number(finish);
}

export function raceTitle(race) {
  if (!race) return "";
  if (race.raceKind === "qualifying") {
    const round = race.roundLabel || "Q1";
    const method = race.qualifyingRankLabel || race.qualifyingRankMethod || "";
    return method
      ? `${race.className} · ${round} (${method})`.trim()
      : `${race.className} · ${round}`.trim();
  }
  if (race.mainLetter && race.mainNumber) {
    return `${race.className} (${race.mainLetter}${race.mainNumber} Main)`;
  }
  return race.className || "";
}
