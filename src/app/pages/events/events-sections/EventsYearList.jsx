import { useEffect, useMemo, useRef } from "react";
import EventCard from "../EventCard";
import CalendarEventTypeChip from "../calendar/CalendarEventTypeChip";
import { useTranslation } from "@/app/i18n/I18nContext";
import {
  eventInMonth,
  isEventPast,
  monthsWithEvents,
  sortKeyInMonth,
} from "../calendar/calendarHelpers";

export default function EventsYearList({
  year,
  events,
  clubSlug,
  trackNames,
  eventsWithResults,
  nominatedEventIds,
  eventsWithNominations,
}) {
  const { t, locale } = useTranslation();
  const scrollTargetRef = useRef(null);
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const activeMonths = useMemo(
    () => monthsWithEvents(events, year),
    [events, year]
  );

  useEffect(() => {
    if (year !== currentYear) return;
    if (!activeMonths.includes(currentMonth)) return;
    const el = scrollTargetRef.current;
    if (!el) return;
    const timer = window.setTimeout(() => {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
    return () => window.clearTimeout(timer);
  }, [year, activeMonths, currentYear, currentMonth]);

  if (activeMonths.length === 0) {
    return (
      <p className="text-center text-sm text-text-muted py-8 m-0">
        {t("calendarUi.noEventsYear", { year })}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-10 max-w-3xl mx-auto w-full">
      {activeMonths.map((monthIndex) => {
        const monthEvents = events
          .filter((event) => eventInMonth(event, year, monthIndex))
          .sort(
            (a, b) =>
              sortKeyInMonth(a, year, monthIndex) -
              sortKeyInMonth(b, year, monthIndex)
          );

        const monthLabel = new Date(year, monthIndex, 1).toLocaleDateString(locale, {
          month: "long",
        });

        const isCurrentMonth = year === currentYear && monthIndex === currentMonth;

        return (
          <section
            key={monthIndex}
            id={`events-month-${monthIndex}`}
            ref={isCurrentMonth ? scrollTargetRef : undefined}
            className="scroll-mt-24"
          >
            <div className="flex items-center gap-3 mb-4 pb-2 border-b border-surfaceBorder">
              <h2 className="text-base font-semibold text-text-base m-0">{monthLabel}</h2>
              {isCurrentMonth && (
                <span className="text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                  {t("calendarUi.today")}
                </span>
              )}
              <span className="text-xs text-text-muted ml-auto">
                {monthEvents.length === 1
                  ? t("calendarUi.eventCountOne")
                  : t("calendarUi.eventCount", { count: monthEvents.length })}
              </span>
            </div>

            <div className="flex flex-col gap-3">
              {monthEvents.map((event) => (
                <div key={`${event.id}-${monthIndex}`} className="flex flex-col gap-1.5">
                  <CalendarEventTypeChip eventType={event.event_type} />
                  <EventCard
                    event={event}
                    clubSlug={clubSlug}
                    trackNames={trackNames}
                    showResults={eventsWithResults?.has(event.id)}
                    hasNomination={nominatedEventIds?.has(event.id)}
                    hasReceivedNominations={eventsWithNominations?.has(event.id)}
                    isPast={isEventPast(event)}
                  />
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
