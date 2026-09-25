import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/supabaseClient";
import { useClub } from "@/app/providers/ClubProvider";
import { useMembership } from "@/app/providers/MembershipProvider";

import useTheme from "@/app/providers/useTheme";

import EventCard from "./EventCard";

import PageTitle from "@/components/ui/PageTitle";
import FilterDropdown from "@/components/ui/FilterDropdown";

import { CalendarDaysIcon } from "@heroicons/react/24/solid";
import {
  extractYearsFromEvents,
} from "./events-sections/helpers";

export default function Events() {
  const { palette } = useTheme();
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

  // -----------------------------
  // Multi‑day aware date helpers
  // -----------------------------
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
      } else {
        setEventsWithNominations(new Set());
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

  const years = extractYearsFromEvents(events);
  const activeYear = years.includes(selectedYear) ? selectedYear : years[0];

  const now = new Date();

  const displayedEvents = events
    .filter((event) => {
      const matchesView = view === "upcoming"
        ? getEventEndDate(event) >= now
        : getEventStartDate(event).getFullYear() === activeYear;
      const matchesTrack = trackFilter === "all" || event.track === trackFilter;

      return matchesView && matchesTrack;
    })
    .sort((a, b) => getEventStartDate(a) - getEventStartDate(b));

  return (
    <div style={{ minHeight: "100vh", width: "100%" }}>
      <PageTitle
        icon={CalendarDaysIcon}
        title="Events"
        style={{ color: brand }}
      />

      {/* RESTORED EXACTLY — only removed the container */}
      <main
        style={{
          padding: "24px 16px",
          display: "flex",
          flexDirection: "column",
          gap: "24px",
          maxWidth: "768px",
          margin: "0 auto",
        }}
      >
        <div className="flex flex-wrap items-center justify-center gap-3">
          <FilterDropdown
            value={view}
            onChange={setView}
            ariaLabel="Event view"
            options={[
              { value: "upcoming", label: "Upcoming Events" },
              { value: "year", label: "All Events" },
            ]}
          />
          {tracks.length > 1 && (
            <FilterDropdown
              value={trackFilter}
              onChange={setTrackFilter}
              ariaLabel="Track type"
              options={[
                { value: "all", label: "All Tracks" },
                ...tracks.map((track) => ({ value: track.id, label: track.name })),
              ]}
            />
          )}
          {years.length > 1 && (
            <FilterDropdown
              value={activeYear || currentYear}
              onChange={(year) => {
                setSelectedYear(Number(year));
                setView("year");
              }}
              ariaLabel="Event year"
              options={years.map((year) => ({ value: year, label: String(year) }))}
            />
          )}
        </div>

        <section className="space-y-2">
          {loading && <p className="text-text-muted">Loading events...</p>}
          {!loading && displayedEvents.length === 0 && (
            <p className="text-text-muted">
              {view === "upcoming"
                ? "No upcoming events scheduled."
                : `No events scheduled for ${activeYear || currentYear}.`}
            </p>
          )}
          {!loading && displayedEvents.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              clubSlug={clubSlug}
              trackNames={trackNames}
              showResults={getEventEndDate(event) < now}
              hasNomination={nominatedEventIds.has(event.id)}
              hasReceivedNominations={eventsWithNominations.has(event.id)}
            />
          ))}
        </section>
      </main>
    </div>
  );
}