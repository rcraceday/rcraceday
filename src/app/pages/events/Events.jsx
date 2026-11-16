import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/supabaseClient";
import { useClub } from "@/app/providers/ClubProvider";
import { useMembership } from "@/app/providers/MembershipProvider";
import { useDrivers } from "@/app/providers/DriverProvider";
import { useProfile } from "@/app/providers/ProfileProvider";
import { buildHouseholdResultNameKeys } from "@/app/lib/results/resultsRowHighlight";
import { loadHouseholdResultEventIds } from "@/app/lib/results/loadHouseholdResultEventIds";
import useTheme from "@/app/providers/useTheme";
import PageTitle from "@/components/ui/PageTitle";
import { useTranslation } from "@/app/i18n/I18nContext";
import FilterDropdown from "@/components/ui/FilterDropdown";
import { CalendarDaysIcon, ChevronDownIcon } from "@heroicons/react/24/solid";
import { extractYearsFromEvents, matchesEventsCategoryFilter } from "./events-sections/helpers";
import { loadPublishedResultEventIds } from "@/app/lib/results/loadEventResults";
import { eventTouchesYear } from "./calendar/calendarHelpers";
import EventsYearList from "./events-sections/EventsYearList";
import { loadHouseholdNominationSummaries } from "@/app/lib/householdNominationSummaries";

function getEventEndDate(event) {
  if (event.is_multi_day && Array.isArray(event.days) && event.days.length > 0) {
    return new Date(event.days[event.days.length - 1].date);
  }
  return new Date(event.event_date);
}

export default function Events() {
  const { palette } = useTheme();
  const { t } = useTranslation();
  const brand = palette.primary;
  const { clubSlug } = useParams();
  const [searchParams] = useSearchParams();
  const { club } = useClub();
  const { membership } = useMembership();
  const { drivers } = useDrivers();
  const { profile } = useProfile();

  const currentYear = new Date().getFullYear();
  const [view, setView] = useState("upcoming");
  const [selectedYear, setSelectedYear] = useState(currentYear);

  const [events, setEvents] = useState([]);
  const [trackNames, setTrackNames] = useState({});
  const [tracks, setTracks] = useState([]);
  const [trackFilter, setTrackFilter] = useState("all");
  const categoryFromUrl = searchParams.get("category");
  const initialCategory =
    categoryFromUrl === "major" || categoryFromUrl === "club" || categoryFromUrl === "all"
      ? categoryFromUrl
      : "all";
  const [categoryFilter, setCategoryFilter] = useState(initialCategory);
  const [loading, setLoading] = useState(true);
  const [nominatedEventIds, setNominatedEventIds] = useState(() => new Set());
  const [nominationSummaries, setNominationSummaries] = useState(() => new Map());
  const [eventsWithNominations, setEventsWithNominations] = useState(() => new Set());
  const [eventsWithResults, setEventsWithResults] = useState(() => new Set());
  const [householdResultEventIds, setHouseholdResultEventIds] = useState(() => new Set());

  const householdResultMatch = useMemo(() => {
    const driverIds = new Set((drivers || []).map((d) => d.id).filter(Boolean));
    const driverNameKeys = buildHouseholdResultNameKeys(drivers, { membership, profile });
    return { driverIds, driverNameKeys };
  }, [drivers, membership, profile]);

  useEffect(() => {
    const next = searchParams.get("category");
    if (next === "major" || next === "club" || next === "all") {
      setCategoryFilter(next);
    }
  }, [searchParams]);

  useEffect(() => {
    async function loadEvents() {
      if (!club?.id) return;

      setLoading(true);

      const { data = [] } = await supabase
        .from("events")
        .select("*")
        .eq("club_id", club.id)
        .eq("is_published", true)
        .order("event_date", { ascending: true });

      const { data: clubTracks = [] } = await supabase
        .from("club_tracks")
        .select("id, name")
        .eq("club_id", club.id)
        .order("name");

      if (clubTracks.length > 0) {
        setTracks(clubTracks);
        setTrackNames(
          clubTracks.reduce((names, track) => {
            names[track.id] = track.name;
            return names;
          }, {})
        );
      } else {
        const trackIds = data.map((event) => event.track).filter(Boolean);
        if (trackIds.length > 0) {
          const { data: eventTracks = [] } = await supabase
            .from("club_tracks")
            .select("id, name")
            .in("id", trackIds);

          setTracks(eventTracks);
          setTrackNames(
            eventTracks.reduce((names, track) => {
              names[track.id] = track.name;
              return names;
            }, {})
          );
        } else {
          setTracks([]);
          setTrackNames({});
        }
      }

      const eventIds = data.map((event) => event.id).filter(Boolean);
      if (eventIds.length > 0) {
        const { data: nominationRows = [] } = await supabase
          .from("nominations")
          .select("event_id")
          .in("event_id", eventIds);
        setEventsWithNominations(
          new Set(nominationRows.map((row) => row.event_id).filter(Boolean))
        );
        setEventsWithResults(await loadPublishedResultEventIds(eventIds));
      } else {
        setEventsWithNominations(new Set());
        setEventsWithResults(new Set());
      }

      setEvents(data);
      setLoading(false);
    }

    loadEvents();
  }, [club?.id]);

  useEffect(() => {
    let cancelled = false;

    async function loadHouseholdNominations() {
      const eventIds = events.map((event) => event.id).filter(Boolean);
      if (!membership?.id) {
        setNominatedEventIds(new Set());
        setNominationSummaries(new Map());
        return;
      }

      const { nominatedEventIds: ids, summariesByEventId } =
        await loadHouseholdNominationSummaries(membership.id, eventIds);

      if (cancelled) return;
      setNominatedEventIds(ids);
      setNominationSummaries(summariesByEventId);
    }

    loadHouseholdNominations();
    return () => {
      cancelled = true;
    };
  }, [membership?.id, events]);

  useEffect(() => {
    let cancelled = false;

    async function loadHouseholdResults() {
      const eventIds = events.map((event) => event.id).filter(Boolean);
      const { driverIds, driverNameKeys } = householdResultMatch;
      if (
        !eventIds.length ||
        (!driverIds.size && !driverNameKeys.size)
      ) {
        setHouseholdResultEventIds(new Set());
        return;
      }

      const ids = await loadHouseholdResultEventIds(eventIds, driverIds, driverNameKeys);
      if (!cancelled) setHouseholdResultEventIds(ids);
    }

    loadHouseholdResults();
    return () => {
      cancelled = true;
    };
  }, [events, householdResultMatch]);

  const yearOptions = useMemo(() => {
    const fromEvents = extractYearsFromEvents(events);
    const set = new Set([currentYear - 1, currentYear, currentYear + 1]);
    fromEvents.forEach((y) => set.add(y));
    return [...set].sort((a, b) => b - a);
  }, [events, currentYear]);

  const previousYearOptions = useMemo(
    () => yearOptions.filter((y) => y < currentYear),
    [yearOptions, currentYear]
  );

  const activePreviousYear = previousYearOptions.includes(selectedYear)
    ? selectedYear
    : previousYearOptions[0] ?? currentYear - 1;

  const now = new Date();

  const displayedEvents = useMemo(() => {
    const trackMatch = (event) =>
      trackFilter === "all" || event.track === trackFilter;
    const categoryMatch = (event) => matchesEventsCategoryFilter(event, categoryFilter);

    let list = events;
    if (view === "year") {
      list = events.filter((event) => eventTouchesYear(event, activePreviousYear));
    } else if (view === "fullYear") {
      list = events.filter((event) => eventTouchesYear(event, currentYear));
    } else {
      list = events.filter((event) => getEventEndDate(event) >= now);
    }

    return list.filter(trackMatch).filter(categoryMatch);
  }, [events, view, activePreviousYear, currentYear, trackFilter, categoryFilter, now]);

  const listYear =
    view === "fullYear" ? currentYear : view === "year" ? activePreviousYear : null;

  const viewOptions = useMemo(
    () => [
      { value: "fullYear", label: t("events.viewFullYear") },
      { value: "upcoming", label: t("events.viewUpcoming") },
      { value: "year", label: t("events.viewPreviousYears") },
    ],
    [t]
  );
  const categoryOptions = useMemo(
    () => [
      { value: "all", label: t("events.filterShowAll") },
      { value: "club", label: t("events.filterClubMeets") },
      { value: "major", label: t("events.filterMajorEvents") },
    ],
    [t]
  );
  const trackOptions = useMemo(
    () => [
      { value: "all", label: t("calendarUi.allTracks") },
      ...tracks.map((track) => ({ value: track.id, label: track.name })),
    ],
    [tracks, t]
  );
  const yearOptionsList = useMemo(
    () => previousYearOptions.map((y) => ({ value: y, label: String(y) })),
    [previousYearOptions]
  );

  const filterSummaryText = useMemo(() => {
    const viewLabel = viewOptions.find((o) => o.value === view)?.label || view;
    const categoryLabel = categoryOptions.find((o) => o.value === categoryFilter)?.label || categoryFilter;
    const parts = [viewLabel, categoryLabel];
    if (tracks.length > 1) {
      const trackLabel = trackOptions.find((o) => o.value === trackFilter)?.label;
      if (trackLabel) parts.push(trackLabel);
    }
    if (view === "year" && previousYearOptions.length > 0) {
      parts.push(String(activePreviousYear));
    }
    return parts.join(" · ");
  }, [
    view,
    categoryFilter,
    trackFilter,
    tracks.length,
    viewOptions,
    categoryOptions,
    trackOptions,
    activePreviousYear,
    previousYearOptions.length,
  ]);

  function renderEventFilters({ fullWidth }) {
    const dropdownProps = {
      compact: true,
      fullWidth,
      className: fullWidth ? "min-w-0 w-full" : "shrink-0",
    };
    return (
      <>
        <FilterDropdown
          {...dropdownProps}
          value={view}
          onChange={setView}
          ariaLabel={t("events.viewModeLabel")}
          options={viewOptions}
        />
        <FilterDropdown
          {...dropdownProps}
          value={categoryFilter}
          onChange={setCategoryFilter}
          ariaLabel={t("events.categoryFilterLabel")}
          options={categoryOptions}
        />
        {tracks.length > 1 && (
          <FilterDropdown
            {...dropdownProps}
            value={trackFilter}
            onChange={setTrackFilter}
            ariaLabel={t("calendarUi.filterTrack")}
            options={trackOptions}
          />
        )}
        {view === "year" && previousYearOptions.length > 0 && (
          <FilterDropdown
            {...dropdownProps}
            value={activePreviousYear}
            onChange={(y) => setSelectedYear(Number(y))}
            ariaLabel={t("calendarUi.filterYear")}
            options={yearOptionsList}
          />
        )}
      </>
    );
  }

  return (
    <>
      <PageTitle
        icon={CalendarDaysIcon}
        title={t("events.title")}
        style={{ color: brand }}
      />

      <main className="app-page-main">
        <div
          className="events-filter-bar mb-4 sm:mb-6 px-2 sm:px-3 py-2 sm:py-3 rounded-2xl border border-border/80 shadow-sm"
          style={{ background: `linear-gradient(135deg, ${brand}0c 0%, transparent 65%)` }}
        >
          <details className="group w-full sm:hidden">
            <summary className="flex items-center justify-between gap-2 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
              <span className="min-w-0 text-sm font-medium text-text-base truncate">
                <span className="text-text-muted font-normal">{t("events.filtersLabel")}: </span>
                {filterSummaryText}
              </span>
              <ChevronDownIcon
                className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180"
                style={{ color: brand }}
                aria-hidden
              />
            </summary>
            <div className="grid grid-cols-1 gap-2 pt-3">{renderEventFilters({ fullWidth: true })}</div>
          </details>

          <div className="hidden sm:flex sm:flex-wrap sm:items-center sm:justify-center sm:gap-3 sm:w-full">
            {renderEventFilters({ fullWidth: false })}
          </div>
        </div>

        {loading && <p className="text-text-muted text-center">{t("events.loading")}</p>}

        {!loading && displayedEvents.length === 0 && (
          <p className="text-text-muted text-center">
            {view === "upcoming" && t("events.noUpcoming")}
            {view === "fullYear" && t("calendarUi.noEventsYear", { year: currentYear })}
            {view === "year" &&
              (previousYearOptions.length === 0
                ? t("calendarUi.noEventsYear", { year: currentYear - 1 })
                : t("calendarUi.noEventsYear", { year: activePreviousYear }))}
          </p>
        )}

        {!loading && displayedEvents.length > 0 && (
          <EventsYearList
            year={listYear}
            events={displayedEvents}
            clubSlug={clubSlug}
            trackNames={trackNames}
            eventsWithResults={eventsWithResults}
            nominatedEventIds={nominatedEventIds}
            householdResultEventIds={householdResultEventIds}
            nominationSummaries={nominationSummaries}
            eventsWithNominations={eventsWithNominations}
          />
        )}
      </main>
    </>
  );
}
