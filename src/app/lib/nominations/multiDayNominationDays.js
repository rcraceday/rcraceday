import { isOpenPracticeDay, isPracticeDay } from "@/app/lib/eventClassLimit";

export function nominationSelectionFromMerch(nomination) {
  const merch = nomination?.merchandise;
  if (!merch || typeof merch !== "object") return null;
  const snapshot = merch.selection_snapshot;
  return snapshot && typeof snapshot === "object" ? snapshot : null;
}

/** Maps nomination_entries.order_index → day index for multi-day events. */
export function buildRacingEntryOrderDayMap(event, selection) {
  const map = new Map();
  if (!event?.is_multi_day || !selection) return map;

  let order = 1;
  const dayCount = (event.days || event.classes_by_day || []).length;
  for (let dayIndex = 0; dayIndex < dayCount; dayIndex += 1) {
    if (!selection.racingDays?.[dayIndex]) continue;
    if (isOpenPracticeDay(event, dayIndex)) continue;
    const slots = selection.classesByDay?.[dayIndex];
    if (!Array.isArray(slots)) continue;
    if (isPracticeDay(event, dayIndex)) {
      slots.filter(Boolean).forEach(() => {
        map.set(order, dayIndex);
        order += 1;
      });
      continue;
    }
    slots.filter(Boolean).forEach(() => {
      map.set(order, dayIndex);
      order += 1;
    });
  }
  return map;
}

export function entryMatchesExportDay(event, nomination, entry, exportDayIndex) {
  if (exportDayIndex == null || exportDayIndex === "all") return true;
  if (!event?.is_multi_day) return Number(exportDayIndex) === 0;
  const selection = nominationSelectionFromMerch(nomination);
  if (!selection) return true;
  const map = buildRacingEntryOrderDayMap(event, selection);
  const day = map.get(entry.order_index);
  return day === Number(exportDayIndex);
}