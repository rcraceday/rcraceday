import { parseLapsTime, parseTimeToMs } from "./resultTime.js";

/** LiveRC view_round_ranking `o` query values. */
export const LIVE_RC_QUAL_ORDERS = [
  "top_5_average",
  "laps_time",
  "fastest_lap",
  "top_3_consecutive",
];

export const DEFAULT_LIVE_RC_QUAL_ORDER = "top_5_average";

/** LiveRC `view_round_ranking` `o=` query values (internal keys differ for top 5). */
const LIVE_RC_QUAL_PARAM = {
  top_5_average: "avg_top_5",
  laps_time: "laps_time",
  fastest_lap: "fastest_lap",
  top_3_consecutive: "top_3_consecutive",
};

const LIVE_RC_PARAM_TO_ORDER = {
  avg_top_5: "top_5_average",
};

export function toLiveRcQualifyingParam(order = DEFAULT_LIVE_RC_QUAL_ORDER) {
  return LIVE_RC_QUAL_PARAM[order] || order;
}

export function fromLiveRcQualifyingParam(param) {
  if (!param) return null;
  if (LIVE_RC_QUAL_ORDERS.includes(param)) return param;
  return LIVE_RC_PARAM_TO_ORDER[param] || null;
}

export function qualifyingOrderLabel(order, t) {
  const key = `results.qualOrder.${order}`;
  const label = t?.(key);
  if (label && label !== key) return label;
  const fallbacks = {
    top_5_average: "Top 5 average",
    laps_time: "Laps / time",
    fastest_lap: "Fastest lap",
    top_3_consecutive: "Top 3 consecutive",
    top_2_consecutive: "Top 2 consecutive",
  };
  return fallbacks[order] || order;
}

export function qualifyingOrderFromUrl(url) {
  try {
    const value = new URL(url).searchParams.get("o");
    const mapped = fromLiveRcQualifyingParam(value);
    if (mapped) return mapped;
  } catch {
    // ignore
  }
  return null;
}

export function withQualifyingOrder(url, order = DEFAULT_LIVE_RC_QUAL_ORDER) {
  try {
    const parsed = new URL(url);
    if (parsed.searchParams.get("p") !== "view_round_ranking") return url;
    parsed.searchParams.set("o", toLiveRcQualifyingParam(order));
    return parsed.toString();
  } catch {
    return url;
  }
}

/** Re-rank stored qualifying races (e.g. after changing the admin dropdown). */
export function reapplyQualifyingOrderToRaces(races, order = DEFAULT_LIVE_RC_QUAL_ORDER) {
  if (!Array.isArray(races)) return races;
  return races.map((race) => {
    if (race.raceKind !== "qualifying" || !race.qualifyingRankMethod) return race;
    return {
      ...race,
      qualifyingRankMethod: order,
      qualifyingRankLabel: qualifyingOrderLabel(order),
      entries: sortQualifyingEntries(race.entries, order),
    };
  });
}

/** LiveRC cells often prefix values, e.g. "0022.702 22.702" or combined lap rows. */
export function parseLiveRcMetricCell(raw) {
  const text = String(raw || "").trim();
  if (!text) return null;
  const lapSegments = text.split(/\s+/).filter((part) => /\d+\/\d+:\d/.test(part));
  if (lapSegments.length) {
    const best = lapSegments[lapSegments.length - 1].replace(/^0+/, "");
    const parsed = parseLapsTime(best.match(/(\d+\/\d+:\d+(?:\.\d+)?)/)?.[1] || best);
    if (parsed.laps != null) return parsed;
  }
  const parts = text.split(/\s+/).filter(Boolean);
  const timeToken =
    parts.find((part) => /^\d+:\d+(?:\.\d+)?$/.test(part)) ||
    parts.find((part) => /^\d+(?:\.\d+)?$/.test(part)) ||
    parts[parts.length - 1];
  const ms = parseTimeToMs(timeToken);
  return ms != null ? { metricMs: ms } : null;
}

export function primaryQualifyingMetric(entry, order) {
  if (!entry) return null;
  switch (order) {
    case "top_5_average":
      return entry.top5AvgMs ?? entry.avgLapMs;
    case "fastest_lap":
      return entry.fastLapMs;
    case "top_3_consecutive":
      return entry.top3ConMs;
    case "top_2_consecutive":
      return entry.top2ConMs;
    case "laps_time":
    default:
      return entry.totalTimeMs;
  }
}

/** Lower is better for lap-time metrics; laps/time uses more laps then less total time. */
export function compareQualifyingEntries(a, b, order = "laps_time") {
  if (order === "laps_time") {
    const lapsA = Number(a?.laps) || 0;
    const lapsB = Number(b?.laps) || 0;
    if (lapsB !== lapsA) return lapsB - lapsA;
    const timeA = a?.totalTimeMs ?? Number.POSITIVE_INFINITY;
    const timeB = b?.totalTimeMs ?? Number.POSITIVE_INFINITY;
    return timeA - timeB;
  }

  const metricA = primaryQualifyingMetric(a, order);
  const metricB = primaryQualifyingMetric(b, order);
  if (metricA == null && metricB == null) return 0;
  if (metricA == null) return 1;
  if (metricB == null) return -1;
  return metricA - metricB;
}

export function sortQualifyingEntries(entries, order = DEFAULT_LIVE_RC_QUAL_ORDER) {
  if (!Array.isArray(entries) || entries.length < 2) return entries || [];
  const sorted = [...entries].sort((a, b) => compareQualifyingEntries(a, b, order));
  return sorted.map((entry, index) => ({
    ...entry,
    position: index + 1,
    seed: index + 1,
  }));
}
