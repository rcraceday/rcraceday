export function eventClassMinimumEntries(event) {
  const raw = event?.class_minimum_entries;
  if (raw == null || raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function classMeetsMinimumEntryCount(count, minimum) {
  if (minimum == null) return true;
  return Number(count) >= minimum;
}

export function countEntriesByClass(racingEntries) {
  const counts = {};
  (racingEntries || []).forEach((entry) => {
    if (!entry?.class_id) return;
    counts[entry.class_id] = (counts[entry.class_id] || 0) + 1;
  });
  return counts;
}

export function shouldIncludeClassInLiveTime(event, classId, entryCountByClass) {
  const minimum = eventClassMinimumEntries(event);
  if (minimum == null) return true;
  const count = entryCountByClass?.[classId] ?? 0;
  if (classMeetsMinimumEntryCount(count, minimum)) return true;
  return !!event?.class_minimum_livetime_when_unmet;
}
