// Needed by EventListItem.jsx
export const TYPE_LABELS = {
  racing: "Racing",
  practice: "Practice",
  club_meet: "Club Meet",
  championship_round: "Championship Round",
  state_titles: "State Titles",
  national_titles: "National Titles",
};

// Needed by EventListItem.jsx
export function isNominationsOpen(event) {
  if (!event?.nominations_open || !event?.nominations_close) return false;

  const now = new Date();
  const open = new Date(event.nominations_open);
  const close = new Date(event.nominations_close);

  return now >= open && now <= close;
}

// Extract unique years from events
export function extractYearsFromEvents(events) {
  const years = new Set();

  events.forEach((e) => {
    if (e.event_date) {
      const y = new Date(e.event_date).getFullYear();
      years.add(y);
    }
  });

  return Array.from(years).sort((a, b) => b - a);
}

// Format date for display
export function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-AU", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}
