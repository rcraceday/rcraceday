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

/** LiveRC overall "Result" cells: `[2] [4] 8/5:32` or `5th (16/5:14)`. */
export function parseOverallResultFinishes(value) {
  const text = String(value || "").trim();
  if (!text) return [];
  const bracketed = [...text.matchAll(/\[(\d+)\]/g)].map((match) => Number(match[1]));
  if (bracketed.length) return bracketed;
  const ordinal = text.match(/^(\d+)(?:st|nd|rd|th)\b/i);
  return ordinal ? [Number(ordinal[1])] : [];
}

export function looksLikeOverallResultCell(value) {
  const text = String(value || "").trim();
  if (!text) return false;
  if (/^\[\d+\]/.test(text)) return true;
  if (/^\d+(?:st|nd|rd|th)\b/i.test(text)) return true;
  if (/^\d+\s*\/\s*\d+:\d+/.test(text)) return true;
  return false;
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

function mainLetterRank(letter) {
  const normalized = String(letter || "A").toUpperCase();
  const code = normalized.charCodeAt(0);
  if (code >= 65 && code <= 90) return code - 64;
  return 99;
}

/** Qualifying before mains; A-main before B-main; then by main number. */
export function compareRacesForDisplay(a, b) {
  const aQual = a?.raceKind === "qualifying" ? 0 : 1;
  const bQual = b?.raceKind === "qualifying" ? 0 : 1;
  if (aQual !== bQual) return aQual - bQual;
  const letterCmp = mainLetterRank(a?.mainLetter) - mainLetterRank(b?.mainLetter);
  if (letterCmp !== 0) return letterCmp;
  return (a?.mainNumber || 0) - (b?.mainNumber || 0);
}

/** Qualifying Rnd 1, A1 Main, B2 Main, … */
export function raceTabLabel(race) {
  if (!race) return "";
  if (race.raceKind === "qualifying") {
    const n = String(race.roundLabel || "Q1").match(/(\d+)/)?.[1] || "1";
    return `Qualifying Rnd ${n}`;
  }
  const letter = String(race.mainLetter || "").toUpperCase();
  const segment = race.mainNumber ?? 1;
  return letter ? `${letter}${segment} Main` : "Main";
}

/** Stable key for per-race result tabs. */
export function raceTabKey(race, index = 0) {
  if (!race) return `race:${index}`;
  if (race.id) return `id:${race.id}`;
  if (race.raceKind === "qualifying") {
    return `qual:${race.roundLabel || "Q"}:${index}`;
  }
  const letter = String(race.mainLetter || "?").toUpperCase();
  const segment = race.mainNumber ?? 1;
  return `main:${letter}:${segment}:${index}`;
}

export function raceTitle(race) {
  if (!race) return "";
  const tab = raceTabLabel(race);
  if (race.raceKind === "qualifying") {
    const method = race.qualifyingRankLabel || race.qualifyingRankMethod || "";
    return method
      ? `${race.className} · ${tab} (${method})`.trim()
      : `${race.className} · ${tab}`.trim();
  }
  if (race.mainLetter) {
    return `${race.className} (${tab})`;
  }
  return race.className || "";
}
