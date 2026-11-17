/** Stable value for results event dropdown (one row per published import / day). */
export function formatResultSelectionKey(eventId, dayIndex) {
  if (!eventId) return "";
  if (dayIndex == null || Number.isNaN(Number(dayIndex))) return eventId;
  return `${eventId}:day:${dayIndex}`;
}

export function parseResultSelectionKey(value) {
  if (!value) return { eventId: "", dayIndex: null };
  const token = ":day:";
  const idx = value.indexOf(token);
  if (idx === -1) return { eventId: value, dayIndex: null };
  const dayIndex = Number(value.slice(idx + token.length));
  return {
    eventId: value.slice(0, idx),
    dayIndex: Number.isFinite(dayIndex) ? dayIndex : null,
  };
}