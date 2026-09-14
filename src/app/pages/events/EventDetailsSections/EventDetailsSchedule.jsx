// src/app/pages/events/EventDetailsSections/EventDetailsSchedule.jsx

/* ===========================
   HELPERS
   =========================== */

function formatDate(dateString) {
  if (!dateString) return "";
  const d = new Date(dateString);
  return d.toLocaleDateString("en-AU", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(dateString) {
  if (!dateString) return "";
  const d = new Date(dateString);
  return d.toLocaleTimeString("en-AU", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/* ===========================
   FLATTENED COMPONENT
   =========================== */

export default function EventDetailsSchedule({ event }) {
  const days = Array.isArray(event.days) ? event.days : [];

  if (days.length === 0) return null;

  return (
    <div className="space-y-6">

      {days.map((day, index) => {
        const label = day.label?.trim() || `Day ${index + 1}`;
        const dateFormatted = formatDate(day.date);

        return (
          <div key={index} className="space-y-2">

            {/* DAY HEADER */}
            <div className="font-semibold text-base">
              {label} — {dateFormatted}
            </div>

            {/* TIMES */}
            <ul className="text-sm text-text-muted leading-tight space-y-1">
              {day.gates_open_at && (
                <li>
                  <strong>Gates Open:</strong> {formatTime(day.gates_open_at)}
                </li>
              )}

              {day.practice_at && (
                <li>
                  <strong>Practice:</strong> {formatTime(day.practice_at)}
                </li>
              )}

              {day.drivers_brief_at && (
                <li>
                  <strong>Drivers Brief:</strong> {formatTime(day.drivers_brief_at)}
                </li>
              )}

              {day.race_start_at && (
                <li>
                  <strong>Racing Starts:</strong> {formatTime(day.race_start_at)}
                </li>
              )}
            </ul>

          </div>
        );
      })}

    </div>
  );
}
