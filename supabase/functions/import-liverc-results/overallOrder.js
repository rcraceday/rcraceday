export function assignOverallPositions(rows) {
  const grouped = new Map();
  rows.forEach((row) => {
    const key = row.className;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(row);
  });

  const next = [];
  grouped.forEach((classRows) => {
    const sorted = [...classRows].sort((a, b) => {
      const letter = String(a.mainLetter || "A").localeCompare(String(b.mainLetter || "A"));
      if (letter !== 0) return letter;
      return (a.position || 0) - (b.position || 0);
    });
    sorted.forEach((row, index) => {
      next.push({ ...row, overallPosition: row.overallPosition || index + 1 });
    });
  });
  return next;
}

export function latestOverallByClassLetter(overallRows) {
  const latest = new Map();
  overallRows.forEach((row) => {
    const key = `${row.className}::${row.mainLetter || "A"}`;
    const prev = latest.get(key);
    if (!prev || (row.sourceIndex || 0) >= (prev.sourceIndex || 0)) {
      latest.set(key, row);
    }
  });
  return [...latest.values()];
}

import { isDisplayableClassName, normalizeResultClassName } from "./classNames.js";

export function uniqueClassNames({ races = [], overall = [] }) {
  const names = [];
  const seen = new Set();
  [...races, ...overall].forEach((row) => {
    const name = normalizeResultClassName(row.className);
    if (!name || seen.has(name) || !isDisplayableClassName(name)) return;
    seen.add(name);
    names.push(name);
  });
  return names;
}

export function pickInitialResultClass(bundle, driverIds, normalizeName) {
  const classes = uniqueClassNames(bundle || { races: [], overall: [] });
  if (!classes.length) return "";
  const overall = bundle?.overall || [];
  const hasDriver = (row) => {
    if (row.driverId && driverIds?.has(row.driverId)) return true;
    if (normalizeName && row.driverNameRaw) {
      return normalizeName(row.driverNameRaw);
    }
    return false;
  };
  const mine = classes.find((className) =>
    overall.some((row) => row.className === className && hasDriver(row))
  );
  return mine || classes[0];
}
