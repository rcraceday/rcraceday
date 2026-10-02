import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/supabaseClient";
import { useClub } from "@/app/providers/ClubProvider";
import { useMembership } from "@/app/providers/MembershipProvider";
import useTheme from "@/app/providers/useTheme";
import EventCard from "./EventCard";
import PageTitle from "@/components/ui/PageTitle";
import { useTranslation } from "@/app/i18n/I18nContext";
import FilterDropdown from "@/components/ui/FilterDropdown";
import { CalendarDaysIcon } from "@heroicons/react/24/solid";
import { extractYearsFromEvents } from "./events-sections/helpers";
import { loadPublishedResultEventIds } from "@/app/lib/results/loadEventResults";
import { eventTouchesYear } from "./calendar/calendarHelpers";
import EventsYearList from "./events-sections/EventsYearList";

function getEventStartDate(event) {
  if (event.is_multi_day && Array.isArray(event.days) && event.days.length > 0) {
    return new Date(event.days[0].date);
  }
  return new Date(event.event_date);
}

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
  const { club } = useClub();
  const { membership } = useMembership();

  const currentYear = new Date().getFullYear();
  const [view, setView] = useState("upcoming");
  const [selectedYear, setSelectedYear] = useState(currentYear);

  const [events, setEvents] = useState([]);
  const [trackNames, setTrackNames] = useState({});
  const [tracks, setTracks] = useState([]);
  const [trackFilter, setTrackFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [nominatedEventIds, setNominatedEventIds] = useState(() => new Set());
  const [eventsWithNominations, setEventsWithNominations] = useState(() => new Set());
  const [eventsWithResults, setEventsWithResults] = useState(() => new Set());

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
    async function loadHouseholdNominations() {
      if (!membership?.id) {
        setNominatedEventIds(new Set());
        return;
      }

      const { data } = await supabase
        .from("nominations")
        .select("event_id")
        .eq("group_id", membership.id);

      setNominatedEventIds(
        new Set((data || []).map((row) => row.event_id).filter(Boolean))
      );
    }

    loadHouseholdNominations();
  }, [membership?.id]);

  const yearOptions = useMemo(() => {
    const fromEvents = extractYearsFromEvents(events);
    const set = new Set([currentYear - 1, currentYear, currentYear + 1]);
    fromEvents.forEach((y) => set.add(y));
    return [...set].sort((a, b) => b - a);
  }, [events, currentYear]);

  const activeYear = yearOptions.includes(selectedYear)
    ? selectedYear
    : yearOptions[0] || currentYear;

  const now = new Date();

  const displayedEvents = useMemo(() => {
    const trackMatch = (event) =>
      trackFilter === "all" || event.track === trackFilter;

    if (view === "year") {
      return events
        .filter((event) => eventTouchesYear(event, activeYear))
        .filter(trackMatch);
    }

    return events
      .filter((event) => getEventEndDate(event) >= now)
      .filter(trackMatch)
      .sort((a, b) => getEventStartDate(a) - getEventStartDate(b));
  }, [events, view, activeYear, trackFilter, now]);

  return (
    <>
      <PageTitle
        icon={CalendarDaysIcon}
        title={t("events.title")}
        style={{ color: brand }}
      />

      <main className="app-page-main">
        <div className="flex flex-wrap items-center justify-center gap-3 mb-6 px-1">
          <FilterDropdown
            value={view}
            onChange={setView}
            ariaLabel={t("events.viewModeLabel")}
            options={[
              { value: "upcoming", label: t("events.viewUpcoming") },
              { value: "year", label: t("events.viewByYear") },
            ]}
          />
          {tracks.length > 1 && (
            <FilterDropdown
              value={trackFilter}
              onChange={setTrackFilter}
              ariaLabel={t("calendarUi.filterTrack")}
              options={[
                { value: "all", label: t("calendarUi.allTracks") },
                ...tracks.map((track) => ({ value: track.id, label: track.name })),
              ]}
            />
          )}
          {view === "year" && (
            <FilterDropdown
              value={activeYear}
              onChange={(y) => setSelectedYear(Number(y))}
              ariaLabel={t("calendarUi.filterYear")}
              options={yearOptions.map((y) => ({ value: y, label: String(y) }))}
            />
          )}
        </div>

        {loading && <p className="text-text-muted text-center">{t("events.loading")}</p>}

        {!loading && displayedEvents.length === 0 && (
          <p className="text-text-muted text-center">
            {view === "upcoming"
              ? t("events.noUpcoming")
              : t("calendarUi.noEventsYear", { year: activeYear })}
          </p>
        )}

        {!loading && view === "year" && displayedEvents.length > 0 && (
          <EventsYearList
            year={activeYear}
            events={displayedEvents}
            clubSlug={clubSlug}
            trackNames={trackNames}
            eventsWithResults={eventsWithResults}
            nominatedEventIds={nominatedEventIds}
            eventsWithNominations={eventsWithNominations}
          />
        )}

        {!loading && view === "upcoming" && displayedEvents.length > 0 && (
          <section className="space-y-2 max-w-3xl mx-auto w-full">
            {displayedEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                clubSlug={clubSlug}
                trackNames={trackNames}
                showResults={eventsWithResults.has(event.id)}
                hasNomination={nominatedEventIds.has(event.id)}
                hasReceivedNominations={eventsWithNominations.has(event.id)}
              />
            ))}
          </section>
        )}
      </main>
    </>
  );
}
