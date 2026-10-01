import { parseLapsTime, parseTimeToMs } from "./resultTime.js";

/** LiveRC view_round_ranking `o` query values. */
export const LIVE_RC_QUAL_ORDERS = [
  "top_5_average",
  "laps_time",
  "fastest_lap",
  "top_3_consecutive",
  "top_2_consecutive",
];

export const DEFAULT_LIVE_RC_QUAL_ORDER = "top_5_average";

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
    if (value && LIVE_RC_QUAL_ORDERS.includes(value)) return value;
  } catch {
    // ignore
  }
  return null;
}

export function withQualifyingOrder(url, order = DEFAULT_LIVE_RC_QUAL_ORDER) {
  try {
    const parsed = new URL(url);
    if (parsed.searchParams.get("p") !== "view_round_ranking") return url;
    parsed.searchParams.set("o", order);
    return parsed.toString();
  } catch {
    return url;
  }
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
