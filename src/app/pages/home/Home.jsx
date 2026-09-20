import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useClub } from "@/app/providers/ClubProvider";
import { useProfile } from "@/app/providers/ProfileProvider";
import { useMembership } from "@/app/providers/MembershipProvider";
import { useDrivers } from "@/app/providers/DriverProvider";
import useTheme from "@/app/providers/useTheme";

import { supabase } from "@/supabaseClient";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Carousel from "@/components/Carousel";

import PageTitle from "@/components/ui/PageTitle";
import { formatDate } from "@/app/pages/events/events-sections/helpers";

import {
  CalendarDaysIcon,
  CalendarIcon,
  UserPlusIcon,
  IdentificationIcon,
  TrophyIcon,
  BoltIcon,
  HomeIcon,
  Cog6ToothIcon,
} from "@heroicons/react/24/solid";

export default function Home() {
  const { club } = useClub();
  const { profile } = useProfile();
  const { loadingMembership } = useMembership();
  const { drivers, loadingDrivers } = useDrivers();
  const { palette } = useTheme();

  const navigate = useNavigate();

  const clubSlug = club?.slug;
  const brand = palette.primary;

  const [events, setEvents] = useState([]);
  const [trackNames, setTrackNames] = useState({});
  const [loadingEvent, setLoadingEvent] = useState(true);

  const newsItems = [];

  const isAdmin = profile?.role === "admin";

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

      const now = new Date();
      const today = now.toISOString().split("T")[0];
      const nominationsOpen = data.filter((event) => {
        const open = event.nominations_open
          ? new Date(event.nominations_open)
          : null;
        const close = event.nominations_close
          ? new Date(event.nominations_close)
          : null;

        return open && now >= open && (!close || now <= close);
      });
      const upcomingEvents = data.filter(
        (event) => event.event_date && event.event_date >= today
      );
      const next = upcomingEvents[0];
      const relevantEvents = data.filter(
        (event) => upcomingEvents.includes(event) || nominationsOpen.includes(event)
      );
      const displayedEvents = [
        next,
        ...relevantEvents.filter((event) => event.id !== next?.id),
      ].filter(Boolean);

      setEvents(displayedEvents);
      setLoadingEvent(false);
    }

    fetchEvents();
  }, [club?.id]);

  return (

    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        backgroundColor: palette.background,
      }}
    >
      <PageTitle
        icon={HomeIcon}
        title="Home"
        style={{ color: brand }}
      />

      {/* NEWS */}
      {newsItems.length > 0 && (
        <section className="w-full max-w-screen-lg mx-auto space-y-3">
          <Carousel brand={brand} items={newsItems} />
        </section>
      )}

      {/* NEXT EVENT */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-[0.18em] uppercase text-text-muted">
          Next Event
        </h2>

        {loadingEvent && (
          <Card>
            <p className="text-text-muted">Loading event...</p>
          </Card>
        )}

        {!loadingEvent && events.length === 0 && (
          <Card>
            <p className="text-text-muted">No upcoming events scheduled.</p>
          </Card>
        )}

        {!loadingEvent && events.length > 0 && (
          <div className="space-y-2">
            {events.map((event) => {
              const track =
                trackNames[event.track] ||
                event.track_type ||
                event.track ||
                "Track not set";
              const logoSrc = event.logo_preview_url ||
                (event.logourl?.startsWith("http")
                  ? event.logourl
                  : event.logourl
                    ? `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/club-assets/${event.logourl}`
                    : null);
              const nominationsOpen = event.nominations_open
                ? new Date(event.nominations_open)
                : null;
              const nominationsClose = event.nominations_close
                ? new Date(event.nominations_close)
                : null;
              const isOpen =
                nominationsOpen &&
                new Date() >= nominationsOpen &&
                (!nominationsClose || new Date() <= nominationsClose);
              const nominationLabel = isOpen
                ? "Nominations Open"
                : nominationsOpen
                  ? `Nominations Open: ${formatDate(event.nominations_open)}`
                  : null;

              return (
                <Link
                  key={event.id}
                  to={`/${clubSlug}/app/events/${event.id}`}
                  className="block no-underline"
                >
                  <Card className="!p-0 overflow-hidden">
                    <div className="flex min-h-[76px] items-stretch">
                      <div className="my-[3px] ml-[3px] w-24 shrink-0 overflow-hidden rounded-[14px] bg-white p-1 flex items-center justify-center">
                        {logoSrc ? (
                          <img
                            src={logoSrc}
                            alt=""
                            className="max-h-full max-w-full rounded-[10px] object-contain"
                          />
                        ) : (
                          <span className="text-xs text-text-muted">Event</span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1 pl-5 pr-3 py-2">
                        <h3 className="break-words font-semibold leading-tight text-text-base">
                          {event.name}
                        </h3>
                        <p className="flex flex-wrap min-w-0 items-center gap-x-1.5 gap-y-0.5 text-sm font-semibold leading-tight text-text-muted">
                          <span className="min-w-0 truncate max-w-full">{track}</span>
                          <span aria-hidden="true">•</span>
                          <span className="shrink-0">{formatDate(event.event_date)}</span>
                          {nominationLabel && (
                            <>
                              <span aria-hidden="true">•</span>
                              <span
                                className={`min-w-0 break-words ${
                                  isOpen
                                    ? "font-bold text-green-600"
                                    : ""
                                }`}
                              >
                                {nominationLabel}
                              </span>
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* QUICK ACTIONS */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-[0.18em] uppercase text-text-muted">
          Quick Actions
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {/* Events */}
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

          {/* Calendar */}
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

          {/* Nominations */}
          <Link to={`/${clubSlug}/app/nominate`} className="no-underline">
            <Button
              className="!rounded-lg !p-4 !w-full flex flex-col items-center justify-center gap-2"
              style={{
                backgroundColor: palette.button,
                color: palette.buttonText,
              }}
            >
              <UserPlusIcon className="h-7 w-7" />
              <span className="text-sm font-medium">Nominations</span>
            </Button>
          </Link>

          {/* Results */}
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

          {/* Membership */}
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

          {/* LiveRC */}
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

        {isAdmin && (
          <Button
            className="!rounded-lg !py-4 w-full flex items-center justify-center gap-3"
            style={{
              backgroundColor: "#ececec",
              border: "2px solid var(--admin-accent, #ed2024)",
              color: "#111827",
            }}
            onClick={() => navigate(`/${clubSlug}/app/admin`)}
          >
            <Cog6ToothIcon
              className="w-6 h-6"
              style={{ color: "var(--admin-accent, #ed2024)" }}
            />
            <span className="font-medium text-base">Admin Dashboard</span>
          </Button>
        )}
      </section>
    </div>
  );
}
