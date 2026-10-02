import { Link } from "react-router-dom";
import { richTextToPlainText } from "@/app/lib/richText";
import {
  EVENT_TYPE_COLORS,
  eventsForDay,
  isCalendarDayPast,
} from "./calendarHelpers";

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

export default function MiniMonthGrid({
  year,
  monthIndex,
  events,
  clubSlug,
  today,
}) {
  const first = new Date(year, monthIndex, 1);
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const startPad = first.getDay();
  const cells = [];

  for (let i = 0; i < startPad; i++) {
    cells.push({ empty: true, key: `pad-${i}` });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ day, key: `d-${day}` });
  }

  const isToday = (day) =>
    today.getFullYear() === year &&
    today.getMonth() === monthIndex &&
    today.getDate() === day;

  return (
    <div className="select-none w-full max-w-full overflow-hidden">
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {WEEKDAY_LABELS.map((label, i) => (
          <div
            key={`w-${i}`}
            className="text-[10px] sm:text-[11px] font-medium text-center text-text-muted py-0.5"
          >
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((cell) => {
          if (cell.empty) {
            return <div key={cell.key} className="min-h-[34px] sm:min-h-[36px]" />;
          }

          const dayEvents = eventsForDay(events, year, monthIndex, cell.day);
          const primaryType = (dayEvents[0]?.event_type || "").toLowerCase();
          const dotColor = EVENT_TYPE_COLORS[primaryType] || "#6B7280";
          const hasEvents = dayEvents.length > 0;
          const target = dayEvents.length === 1 ? dayEvents[0] : null;
          const isPast = isCalendarDayPast(year, monthIndex, cell.day, today);

          const inner = (
            <div
              className={`min-h-[34px] sm:min-h-[36px] w-full flex flex-col items-center justify-center rounded-md text-[11px] sm:text-xs relative touch-manipulation ${
                isPast
                  ? "text-slate-400"
                  : isToday(cell.day)
                    ? "font-bold ring-1 ring-inset ring-slate-400 bg-slate-50 text-text-base"
                    : hasEvents
                      ? "font-semibold text-text-base"
                      : "text-text-muted"
              }`}
            >
              {cell.day}
              {hasEvents && (
                <span
                  className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full"
                  style={{
                    backgroundColor: isPast ? "#9CA3AF" : dotColor,
                  }}
                  aria-hidden
                />
              )}
            </div>
          );

          if (target && clubSlug) {
            return (
              <Link
                key={cell.key}
                to={`/${clubSlug}/app/events/${target.id}`}
                className={`no-underline rounded-md active:bg-slate-100 ${
                  isPast ? "opacity-60" : ""
                }`}
                title={dayEvents.map((e) => richTextToPlainText(e.name)).join(", ")}
              >
                {inner}
              </Link>
            );
          }

          return (
            <div key={cell.key} className={hasEvents && !isPast ? "text-text-base" : ""}>
              {inner}
            </div>
          );
        })}
      </div>
    </div>
  );
}
