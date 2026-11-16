const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function monthKeyFromDate(date) {
  if (!date) return null;
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function monthShortLabel(monthKey) {
  if (!monthKey) return "";
  const [, month] = monthKey.split("-").map(Number);
  if (!month) return monthKey;
  return MONTH_SHORT[month - 1] || monthKey;
}

/** Best (lowest) finish per calendar month. */
export function aggregateFinishesByMonth(finishPoints) {
  const byMonth = new Map();
  (finishPoints || []).forEach((point) => {
    const key = monthKeyFromDate(point.eventDate);
    if (!key || point.finish == null) return;
    const existing = byMonth.get(key);
    if (!existing || point.finish < existing.finish) {
      byMonth.set(key, {
        monthKey: key,
        monthLabel: monthShortLabel(key),
        finish: point.finish,
        eventDate: point.eventDate,
        eventId: point.eventId,
        driverNameRaw: point.driverNameRaw,
      });
    }
  });
  return [...byMonth.values()].sort((a, b) => a.monthKey.localeCompare(b.monthKey));
}

/** Best (fastest) lap per calendar month. */
export function aggregateLapsByMonth(lapPoints) {
  const byMonth = new Map();
  (lapPoints || []).forEach((point) => {
    const key = monthKeyFromDate(point.eventDate);
    if (!key || !point.fastLapMs) return;
    const existing = byMonth.get(key);
    if (!existing || point.fastLapMs < existing.fastLapMs) {
      byMonth.set(key, {
        monthKey: key,
        monthLabel: monthShortLabel(key),
        fastLapMs: point.fastLapMs,
        eventDate: point.eventDate,
        eventId: point.eventId,
        driverNameRaw: point.driverNameRaw,
      });
    }
  });
  return [...byMonth.values()].sort((a, b) => a.monthKey.localeCompare(b.monthKey));
}