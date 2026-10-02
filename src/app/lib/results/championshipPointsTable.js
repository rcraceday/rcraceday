import { DEFAULT_CHAMPIONSHIP_POINTS } from "./championshipStandings.js";

export { DEFAULT_CHAMPIONSHIP_POINTS };

export function normalizePointsTable(table) {
  const out = {};
  if (!table || typeof table !== "object") return out;
  Object.entries(table).forEach(([key, value]) => {
    const pos = Number(key);
    if (Number.isFinite(pos) && pos >= 1) {
      out[pos] = Number(value) || 0;
    }
  });
  return out;
}

export function pointsTableFromChampionship(champ) {
  const raw = champ?.points_table;
  if (raw?.positions) return normalizePointsTable(raw.positions);
  return normalizePointsTable(raw) || { ...DEFAULT_CHAMPIONSHIP_POINTS };
}

export function spreadFromChampionship(champ) {
  if (champ?.points_spread) return champ.points_spread;
  if (champ?.points_table?.spread) return champ.points_table.spread;
  return null;
}

/** Linear: 1st = firstPlace, each place lower by step (min belowLast). */
export function buildPointsTableFromSpread({
  firstPlace = 36,
  step = 2,
  positionCount = 20,
  belowLast = 1,
}) {
  const count = Math.max(1, Math.min(99, Number(positionCount) || 20));
  const first = Number(firstPlace) || 0;
  const decrement = Math.max(0, Number(step) || 0);
  const floor = Math.max(0, Number(belowLast) || 0);
  const table = {};
  for (let pos = 1; pos <= count; pos++) {
    const value = first - (pos - 1) * decrement;
    table[pos] = Math.max(floor, Math.round(value));
  }
  return table;
}

export function sortedPositionKeys(table) {
  return Object.keys(normalizePointsTable(table))
    .map(Number)
    .sort((a, b) => a - b);
}

export function addPositionToTable(table) {
  const normalized = normalizePointsTable(table);
  const keys = sortedPositionKeys(normalized);
  const nextPos = keys.length ? Math.max(...keys) + 1 : 1;
  const lastPts = keys.length ? normalized[keys[keys.length - 1]] : 1;
  return { ...normalized, [nextPos]: Math.max(1, lastPts - 1) };
}

export function removeLastPosition(table) {
  const normalized = normalizePointsTable(table);
  const keys = sortedPositionKeys(normalized);
  if (keys.length <= 1) return normalized;
  const next = { ...normalized };
  delete next[keys[keys.length - 1]];
  return next;
}

export function scoringPointsTable(table) {
  return normalizePointsTable(table);
}
