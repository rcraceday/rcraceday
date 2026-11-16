import { useEffect, useMemo, useRef } from "react";
import EventCard from "../EventCard";
import useTheme from "@/app/providers/useTheme";
import { useTranslation } from "@/app/i18n/I18nContext";
import {
  eventInMonth,
  isEventPast,
  monthsWithEvents,
  sortKeyInMonth,
  yearMonthSections,
} from "../calendar/calendarHelpers";

export default function EventsYearList({
  year = null,
  events,
  clubSlug,
  trackNames,
  eventsWithResults,
  nominatedEventIds,
  householdResultEventIds,
  nominationSummaries,
  eventsWithNominations,
}) {
  const { t, locale } = useTranslation();
  const { palette } = useTheme();
  const primaryColor = palette?.primary || "#2563eb";
  const scrollTargetRef = useRef(null);
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const sections = useMemo(() => {
    if (year != null) {
      return monthsWithEvents(events, year).map((monthIndex) => ({
        year,
        monthIndex,
      }));
    }
    return yearMonthSections(events);
  }, [events, year]);

  useEffect(() => {
    const scrollSection = sections.find(
      (section) => section.year === currentYear && section.monthIndex === currentMonth
    );
    if (!scrollSection) return;
    const el = scrollTargetRef.current;
    if (!el) return;
    const timer = window.setTimeout(() => {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
    return () => window.clearTimeout(timer);
  }, [sections, currentYear, currentMonth]);

  if (sections.length === 0) {
    return (
      <p className="text-center text-sm text-text-muted py-8 m-0">
        {year != null
          ? t("calendarUi.noEventsYear", { year })
          : t("events.noUpcoming")}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-8 max-w-3xl mx-auto w-full">
      {sections.map(({ year: sectionYear, monthIndex }) => {
        const monthEvents = events
          .filter((event) => eventInMonth(event, sectionYear, monthIndex))
          .sort(
            (a, b) =>
              sortKeyInMonth(a, sectionYear, monthIndex) -
              sortKeyInMonth(b, sectionYear, monthIndex)
          );

        const monthLabel = new Date(sectionYear, monthIndex, 1).toLocaleDateString(locale, {
          month: "long",
          ...(year == null ? { year: "numeric" } : {}),
        });

        const isCurrentMonth =
          sectionYear === currentYear && monthIndex === currentMonth;
        const sectionKey = `${sectionYear}-${monthIndex}`;

        return (
          <section
            key={sectionKey}
            id={`events-month-${sectionKey}`}
            ref={isCurrentMonth ? scrollTargetRef : undefined}
            className="scroll-mt-24 event-month-section overflow-hidden rounded-2xl border border-border/80 shadow-sm"
          >
            <div
              className="px-4 py-3 flex flex-wrap items-center gap-2 border-b border-border/60"
              style={{
                background: `linear-gradient(135deg, ${primaryColor}14 0%, transparent 55%)`,
              }}
            >
              <h2 className="text-lg font-bold text-text-base m-0 tracking-tight">{monthLabel}</h2>
              {isCurrentMonth && (
                <span
                  className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md text-white"
                  style={{ backgroundColor: primaryColor }}
                >
                  {t("calendarUi.today")}
                </span>
              )}
              <span className="text-xs text-text-muted ml-auto tabular-nums">
                {monthEvents.length === 1
                  ? t("calendarUi.eventCountOne")
                  : t("calendarUi.eventCount", { count: monthEvents.length })}
              </span>
            </div>

            <div className="p-3 flex flex-col gap-3 bg-gradient-to-b from-surface-alt/20 to-transparent">
              {monthEvents.map((event) => (
                <EventCard
                  key={`${event.id}-${monthIndex}`}
                  event={event}
                  clubSlug={clubSlug}
                  trackNames={trackNames}
                  showResults={eventsWithResults?.has(event.id)}
                  hasNomination={nominatedEventIds?.has(event.id)}
                  hasHouseholdInResults={householdResultEventIds?.has(event.id)}
                  nominationSummary={nominationSummaries?.get(event.id) || null}
                  hasReceivedNominations={eventsWithNominations?.has(event.id)}
                  isPast={isEventPast(event)}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}