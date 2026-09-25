import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useClub } from "@/app/providers/ClubProvider";
import { useMembership } from "@/app/providers/MembershipProvider";
import { useDrivers } from "@/app/providers/DriverProvider";
import useTheme from "@/app/providers/useTheme";

import { supabase } from "@/supabaseClient";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Carousel from "@/components/Carousel";

import PageTitle from "@/components/ui/PageTitle";
import { isNominationsOpen } from "@/app/pages/events/events-sections/helpers";
import EventCard from "@/app/pages/events/EventCard";

import {
  CalendarDaysIcon,
  CalendarIcon,
  UserPlusIcon,
  IdentificationIcon,
  TrophyIcon,
  BoltIcon,
  HomeIcon,
} from "@heroicons/react/24/solid";

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

export default function Home() {
  const { club } = useClub();
  const { membership, loadingMembership } = useMembership();
  const { drivers, loadingDrivers } = useDrivers();
  const { palette } = useTheme();

  const navigate = useNavigate();

  const clubSlug = club?.slug;
  const brand = palette.primary;

  const [events, setEvents] = useState([]);
  const [trackNames, setTrackNames] = useState({});
  const [loadingEvent, setLoadingEvent] = useState(true);
  const [nominatedEventIds, setNominatedEventIds] = useState(() => new Set());
  const [eventsWithNominations, setEventsWithNominations] = useState(() => new Set());

  const newsItems = [];

  useEffect(() => {
    if (!clubSlug) return;
    if (loadingMembership || loadingDrivers) return;
    if (!Array.isArray(drivers)) return;

    if (drivers.length === 0) {
      navigate(`/${clubSlug}/app/profile/drivers/welcome`, { replace: true });
    }
  }, [clubSlug, loadingMembership, loadingDrivers, drivers, navigate]);

  useEffect(() => {
    if (!club?.id) return;

    async function fetchEvents() {
      setLoadingEvent(true);

      const { data = [] } = await supabase
        .from("events")
        .select("*")
        .eq("club_id", club.id)
        .eq("is_published", true)
        .order("event_date", { ascending: true });

      const trackIds = data.map((event) => event.track).filter(Boolean);
      if (trackIds.length > 0) {
        const { data: tracks = [] } = await supabase
          .from("club_tracks")
          .select("id, name")
          .in("id", trackIds);

        setTrackNames(
          tracks.reduce((names, track) => {
            names[track.id] = track.name;
            return names;
          }, {})
        );
      } else {
        setTrackNames({});
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
      setLoadingEvent(false);
    }

    fetchEvents();
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

  const { nextEvent, nextEventCard, openNominationEvents } = useMemo(() => {
    const now = new Date();
    const upcoming = events
      .filter((event) => getEventEndDate(event) >= now)
      .sort((a, b) => getEventStartDate(a) - getEventStartDate(b));
    const next = upcoming[0] ?? null;
    const openNoms = events
      .filter((event) => isNominationsOpen(event, now))
      .sort((a, b) => getEventStartDate(a) - getEventStartDate(b));

    return {
      nextEvent: next,
      nextEventCard: next && !isNominationsOpen(next, now) ? next : null,
      openNominationEvents: openNoms,
    };
  }, [events]);

  const showNextEventSection =
    loadingEvent || nextEventCard || !nextEvent;

  const renderEventCard = (event) => {
    const now = new Date();
    return (
      <EventCard
        key={event.id}
        event={event}
        clubSlug={clubSlug}
        trackNames={trackNames}
        showResults={getEventEndDate(event) < now}
        hasNomination={nominatedEventIds.has(event.id)}
        hasReceivedNominations={eventsWithNominations.has(event.id)}
      />
    );
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        backgroundColor: palette.background,
      }}
    >
      <PageTitle icon={HomeIcon} title="Home" style={{ color: brand }} />

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
        {newsItems.length > 0 && (
          <section className="w-full max-w-screen-lg mx-auto space-y-3">
            <Carousel brand={brand} items={newsItems} />
          </section>
        )}

        {showNextEventSection && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold tracking-[0.18em] uppercase text-text-muted">
              Next Event
            </h2>

            {loadingEvent && (
              <Card>
                <div style={{ padding: "16px" }}>Loading event…</div>
              </Card>
            )}

            {!loadingEvent && !nextEvent && (
              <Card>
                <p className="text-text-muted">No upcoming events scheduled.</p>
              </Card>
            )}

            {!loadingEvent && nextEventCard && (
              <div className="space-y-2">{renderEventCard(nextEventCard)}</div>
            )}
          </section>
        )}

        {!loadingEvent && openNominationEvents.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold tracking-[0.18em] uppercase text-text-muted">
              Open for Nominations
            </h2>
            <div className="space-y-2">
              {openNominationEvents.map(renderEventCard)}
            </div>
          </section>
        )}

        <section className="space-y-3">
          <h2 className="text-sm font-semibold tracking-[0.18em] uppercase text-text-muted">
            Quick Actions
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <Link to={`/${clubSlug}/app/events`} className="no-underline">
              <Button
                className="!rounded-lg !p-4 !w-full flex flex-col items-center justify-center gap-2"
                style={{
                  backgroundColor: palette.button,
                  color: palette.buttonText,
                }}
              >
                <CalendarDaysIcon className="h-7 w-7" />
                <span className="text-sm font-medium">Events</span>
              </Button>
            </Link>

            <Link to={`/${clubSlug}/app/calendar`} className="no-underline">
              <Button
                className="!rounded-lg !p-4 !w-full flex flex-col items-center justify-center gap-2"
                style={{
                  backgroundColor: palette.button,
                  color: palette.buttonText,
                }}
              >
                <CalendarIcon className="h-7 w-7" />
                <span className="text-sm font-medium">Calendar</span>
              </Button>
            </Link>

            <Link to={`/${clubSlug}/app/nominations`} className="no-underline">
              <Button
                className="!rounded-lg !p-4 !w-full flex flex-col items-center justify-center gap-2"
                style={{
                  backgroundColor: palette.button,
                  color: palette.buttonText,
                }}
              >
                <UserPlusIcon className="h-7 w-7" />
                <span className="text-sm font-medium">My Nominations</span>
              </Button>
            </Link>

            <Button
              className="!rounded-lg !p-4 !w-full flex flex-col items-center justify-center gap-2 opacity-60"
              style={{
                backgroundColor: palette.button,
                color: palette.buttonText,
              }}
            >
              <TrophyIcon className="h-7 w-7" />
              <span className="text-sm font-medium">Results</span>
            </Button>

            <Link to={`/${clubSlug}/app/membership`} className="no-underline">
              <Button
                className="!rounded-lg !p-4 !w-full flex flex-col items-center justify-center gap-2"
                style={{
                  backgroundColor: palette.button,
                  color: palette.buttonText,
                }}
              >
                <IdentificationIcon className="h-7 w-7" />
                <span className="text-sm font-medium">Membership</span>
              </Button>
            </Link>

            <a
              href="https://chargersrc.liverc.com/results/"
              target="_blank"
              rel="noopener noreferrer"
              className="no-underline"
            >
              <Button
                className="!rounded-lg !p-4 !w-full flex flex-col items-center justify-center gap-2"
                style={{
                  backgroundColor: palette.button,
                  color: palette.buttonText,
                }}
              >
                <BoltIcon className="h-7 w-7" />
                <span className="text-sm font-medium">LiveRC</span>
              </Button>
            </a>
          </div>
        </section>
      </main>
    </div>
  );
}
