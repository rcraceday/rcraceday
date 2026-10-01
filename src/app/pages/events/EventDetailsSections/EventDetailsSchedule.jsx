// src/app/pages/events/EventDetailsSections/EventDetailsSchedule.jsx

import { useTranslation } from "@/app/i18n/I18nContext";

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
  const { t } = useTranslation();
  const days = Array.isArray(event.days) ? event.days : [];

  if (days.length === 0) return null;

  return (
    <div className="space-y-6">

      {days.map((day, index) => {
        const label = day.label?.trim() || t("events.dayN", { n: index + 1 });
        const dateFormatted = formatDate(day.date);

        return (
          <div key={index} className="space-y-2">

            <div className="font-semibold text-base">
              {label} — {dateFormatted}
            </div>

            <ul className="text-sm text-text-muted leading-tight space-y-1">
              {day.gates_open_at && (
                <li>
                  <strong>{t("events.scheduleGatesOpen")}</strong> {formatTime(day.gates_open_at)}
                </li>
              )}

              {day.practice_at && (
                <li>
                  <strong>{t("events.schedulePractice")}</strong> {formatTime(day.practice_at)}
                </li>
              )}

              {day.drivers_brief_at && (
                <li>
                  <strong>{t("events.scheduleDriversBrief")}</strong> {formatTime(day.drivers_brief_at)}
                </li>
              )}

              {day.race_start_at && (
                <li>
                  <strong>{t("events.scheduleRacingStarts")}</strong> {formatTime(day.race_start_at)}
                </li>
              )}
            </ul>

          </div>
        );
      })}

    </div>
  );
}
