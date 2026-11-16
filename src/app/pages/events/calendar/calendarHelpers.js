import { parseStoredTimestamp } from "@/app/lib/eventDatetime";

export { EVENT_TYPE_COLORS } from "./eventTypeChipStyles";

export function parseCalendarLocalDate(value) {
  if (value == null || value === "") return null;
  const s = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return new Date(`${s}T12:00:00`);
  }
  const d = parseStoredTimestamp(s) || new Date(s);
  return d && !Number.isNaN(d.getTime()) ? d : null;
}

function collectEventCalendarDates(event, yearFilter) {
  const dates = [];
  const push = (raw) => {
    const d = parseCalendarLocalDate(raw);
    if (!d) return;
    if (yearFilter != null && d.getFullYear() !== yearFilter) return;
    dates.push(d);
  };

  if (event.is_multi_day && Array.isArray(event.days)) {
    event.days.forEach((day) => push(day?.date));
  }
  if (Array.isArray(event.classes_by_day)) {
    event.classes_by_day.forEach((day) => push(day?.date));
  }
  push(event.event_date);

  const seen = new Set();
  return dates
    .filter((d) => {
      const key = d.toISOString().slice(0, 10);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => a - b);
}

/** All calendar dates for an event that fall in the given year. */
export function calendarDatesForEvent(event, year) {
  return collectEventCalendarDates(event, year);
}

/** All calendar dates for an event (every year). */
export function allCalendarDatesForEvent(event) {
  return collectEventCalendarDates(event, null);
}

/** Sorted year/month buckets that contain at least one event date. */
export function yearMonthSections(events) {
  const keys = new Set();
  (events || []).forEach((event) => {
    allCalendarDatesForEvent(event).forEach((d) => {
      keys.add(`${d.getFullYear()}-${d.getMonth()}`);
    });
  });
  return [...keys]
    .map((key) => {
      const [y, m] = key.split("-").map(Number);
      return { year: y, monthIndex: m };
    })
    .sort((a, b) => a.year - b.year || a.monthIndex - b.monthIndex);
}

export function eventTouchesYear(event, year) {
  return calendarDatesForEvent(event, year).length > 0;
}

export function eventInMonth(event, year, monthIndex) {
  return calendarDatesForEvent(event, year).some((d) => d.getMonth() === monthIndex);
}

export function sortKeyInMonth(event, year, monthIndex) {
  const inMonth = calendarDatesForEvent(event, year).filter(
    (d) => d.getMonth() === monthIndex
  );
  return inMonth[0]?.getTime() ?? 0;
}

export function monthsWithEvents(events, year) {
  const months = new Set();
  (events || []).forEach((event) => {
    calendarDatesForEvent(event, year).forEach((d) => months.add(d.getMonth()));
  });
  return [...months].sort((a, b) => a - b);
}

export function eventsForDay(events, year, monthIndex, dayOfMonth) {
  return (events || []).filter((event) =>
    calendarDatesForEvent(event, year).some(
      (d) => d.getMonth() === monthIndex && d.getDate() === dayOfMonth
    )
  );
}

export function getEventEndLocalDate(event) {
  let dateStr = event?.event_date;
  if (event?.is_multi_day && Array.isArray(event.days) && event.days.length > 0) {
    dateStr = event.days[event.days.length - 1]?.date || dateStr;
  }
  if (Array.isArray(event?.classes_by_day) && event.classes_by_day.length > 0) {
    const sorted = event.classes_by_day
      .map((day) => day?.date)
      .filter(Boolean)
      .sort();
    if (sorted.length) dateStr = sorted[sorted.length - 1];
  }
  return parseCalendarLocalDate(dateStr);
}

export function startOfLocalDay(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function isEventPast(event, now = new Date()) {
  const end = getEventEndLocalDate(event);
  if (!end) return false;
  const endDay = startOfLocalDay(end);
  return endDay < startOfLocalDay(now);
}

export function isCalendarDayPast(year, monthIndex, day, now = new Date()) {
  const cell = new Date(year, monthIndex, day);
  return startOfLocalDay(cell) < startOfLocalDay(now);
}

export function daysInMonthWithEvents(events, year, monthIndex) {
  const days = new Set();
  (events || [])
    .filter((event) => eventInMonth(event, year, monthIndex))
    .forEach((event) => {
      calendarDatesForEvent(event, year).forEach((d) => {
        if (d.getMonth() === monthIndex) days.add(d.getDate());
      });
    });
  return [...days].sort((a, b) => a - b);
}
