import { Link } from "react-router-dom";
import Card from "@/components/ui/Card";
import { useTranslation } from "@/app/i18n/I18nContext";
import { richTextToPlainText } from "@/app/lib/richText";
import CalendarEventTypeChip from "./CalendarEventTypeChip";
import MiniMonthGrid from "./MiniMonthGrid";
import {
  daysInMonthWithEvents,
  eventsForDay,
  isCalendarDayPast,
  isEventPast,
  sortKeyInMonth,
} from "./calendarHelpers";
import { eventLogoSrc } from "../events-sections/eventLogo";

export default function YearOverview({ year, events, clubSlug }) {
  const { t, locale } = useTranslation();
  const today = new Date();

  const monthIndices = Array.from({ length: 12 }, (_, i) => i);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 w-full max-w-6xl mx-auto">
      {monthIndices.map((monthIndex) => {
        const monthLabel = new Date(year, monthIndex, 1).toLocaleDateString(locale, {
          month: "long",
        });
        const eventDays = daysInMonthWithEvents(events, year, monthIndex);
        const isCurrentMonth =
          year === today.getFullYear() && monthIndex === today.getMonth();

        return (
          <Card key={monthIndex} className="!p-3 sm:!p-4 flex flex-col gap-3 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold m-0 text-text-base truncate">
                {monthLabel}
              </h3>
              {isCurrentMonth && (
                <span className="text-[10px] font-semibold uppercase tracking-wide text-text-muted shrink-0">
                  {t("calendarUi.today")}
                </span>
              )}
            </div>

            <MiniMonthGrid
              year={year}
              monthIndex={monthIndex}
              events={events}
              clubSlug={clubSlug}
              today={today}
            />

            {eventDays.length === 0 ? (
              <p className="text-xs text-text-muted m-0">{t("calendarUi.noEventsMonth")}</p>
            ) : (
              <ul className="list-none m-0 p-0 flex flex-col gap-1 border-t border-surfaceBorder pt-3">
                {eventDays.flatMap((day) => {
                  const dayPast = isCalendarDayPast(year, monthIndex, day, today);
                  const dayEvents = eventsForDay(events, year, monthIndex, day).sort(
                    (a, b) =>
                      sortKeyInMonth(a, year, monthIndex) -
                      sortKeyInMonth(b, year, monthIndex)
                  );
                  return dayEvents.map((event) => {
                    const logo = eventLogoSrc(event);
                    const past = dayPast || isEventPast(event, today);
                    const dateLabel = new Date(year, monthIndex, day).toLocaleDateString(
                      locale,
                      { weekday: "short", day: "numeric" }
                    );
                    return (
                      <li key={`${event.id}-${day}`}>
                        <Link
                          to={`/${clubSlug}/app/events/${event.id}`}
                          className={`flex items-center gap-2.5 no-underline group rounded-lg py-2.5 px-1.5 -mx-1.5 min-h-[44px] active:bg-slate-100 ${
                            past ? "opacity-50 grayscale-[0.4]" : ""
                          }`}
                        >
                          {logo ? (
                            <img
                              src={logo}
                              alt=""
                              className="w-9 h-9 sm:w-8 sm:h-8 object-contain shrink-0 rounded"
                            />
                          ) : (
                            <span
                              className={`w-9 h-9 sm:w-8 sm:h-8 shrink-0 flex items-center justify-center text-[10px] font-bold rounded ${
                                past
                                  ? "text-slate-400 bg-slate-100"
                                  : "text-text-muted bg-slate-100"
                              }`}
                            >
                              {day}
                            </span>
                          )}
                          <div className="min-w-0 flex-1 flex flex-col gap-0.5">
                            <span className="text-[11px] text-text-muted">{dateLabel}</span>
                            <CalendarEventTypeChip eventType={event.event_type} />
                            <span
                              className={`text-xs font-medium truncate ${
                                past ? "text-slate-500" : "text-text-base group-hover:underline"
                              }`}
                            >
                              {richTextToPlainText(event.name)}
                            </span>
                          </div>
                        </Link>
                      </li>
                    );
                  });
                })}
              </ul>
            )}
          </Card>
        );
      })}
    </div>
  );
}
