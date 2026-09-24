// src/app/pages/events/EventDetailsSections/EventDetailsClasses.jsx

import useTheme from "@/app/providers/useTheme";
import {
  getDayClassLimit,
  getEffectiveDayClassIds,
  getEventClassLimit,
  isOpenPracticeDay,
} from "@/app/lib/eventClassLimit";

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

/* ===========================
   FLATTENED COMPONENT
   =========================== */

export default function EventDetailsClasses({ event, trackClassIds = [], classNameMap = {} }) {
  const { palette } = useTheme();
  const classesByDay = Array.isArray(event.classes_by_day)
    ? event.classes_by_day
    : [];

  if (classesByDay.length === 0) return null;

  return (
    <div className="space-y-6" style={{ color: palette?.text || "#1f2937" }}>

      {event.is_multi_day && (getEventClassLimit(event) != null || getDayClassLimit(event) != null) && (
        <div className="text-sm space-y-1">
          {getEventClassLimit(event) != null && (
            <div>Max classes per driver (event): {getEventClassLimit(event)}</div>
          )}
          {getDayClassLimit(event) != null && (
            <div>Max classes per day: {getDayClassLimit(event)}</div>
          )}
        </div>
      )}

      {classesByDay.map((day, index) => {
        const label = day.label?.trim() || `Day ${index + 1}`;
        const dateFormatted = formatDate(day.date);
        const classes = getEffectiveDayClassIds(event, index, trackClassIds);
        const openPractice = isOpenPracticeDay(event, index);

        return (
          <div key={index} className="space-y-2">

            {/* DAY HEADER */}
            <div className="font-semibold text-base">
              {label} — {dateFormatted}
            </div>

            {openPractice && (
              <p className="text-sm text-gray-600">Practice day — all track classes</p>
            )}

            {/* CLASS LIST */}
            {classes.length > 0 ? (
              <ul className="text-sm leading-tight space-y-1">
                {classes.map((cls, i) => (
                  <li key={i}>• {classNameMap[cls] || cls}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm">
                No classes listed for this day.
              </p>
            )}

          </div>
        );
      })}

    </div>
  );
}
