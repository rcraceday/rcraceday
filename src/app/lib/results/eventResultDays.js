import { normalizeDayRecord } from "@/app/pages/admin/events/eventDefaults";

export function getEventDayRecords(event) {
  if (!event?.is_multi_day) return [];
  const raw = event?.days || event?.classes_by_day || [];
  return raw.map(normalizeDayRecord);
}

export function eventDaySelectLabel(day, index, formatDate) {
  const custom = String(day?.label || "").trim();
  if (custom) return custom;
  if (day?.date && formatDate) return formatDate(day.date);
  return `Day ${index + 1}`;
}

export function resultDayIndexFromEvent(event, dayIndex) {
  if (!event?.is_multi_day) return { resultDayIndex: null, resultDayDate: event?.event_date || null };
  const days = getEventDayRecords(event);
  const day = days[dayIndex] || {};
  return {
    resultDayIndex: dayIndex,
    resultDayDate: day.date || null,
  };
}