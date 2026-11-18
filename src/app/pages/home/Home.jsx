import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useClub } from "@/app/providers/ClubProvider";
import { useMembership } from "@/app/providers/MembershipProvider";
import { useDrivers } from "@/app/providers/DriverProvider";
import { useProfile } from "@/app/providers/ProfileProvider";
import { buildHouseholdResultNameKeys } from "@/app/lib/results/resultsRowHighlight";
import { loadHouseholdResultEventIds } from "@/app/lib/results/loadHouseholdResultEventIds";
import useTheme from "@/app/providers/useTheme";

import { supabase } from "@/supabaseClient";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Carousel from "@/components/Carousel";

import PageTitle from "@/components/ui/PageTitle";
import { isEventCancelled, isNominationsOpen } from "@/app/pages/events/events-sections/helpers";
import EventCard from "@/app/pages/events/EventCard";
import { loadPublishedResultEventIds } from "@/app/lib/results/loadEventResults";
import { loadHouseholdNominationSummaries } from "@/app/lib/householdNominationSummaries";
import { isClubNewsVisible } from "@/app/lib/clubNews";

import { useTranslation } from "@/app/i18n/I18nContext";
import {
  CalendarDaysIcon,
  CalendarIcon,
  UserPlusIcon,
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
  const { drivers } = useDrivers();
  const { profile } = useProfile();
  const { palette } = useTheme();
  const { t } = useTranslation();

  const navigate = useNavigate();

  const clubSlug = club?.slug;
  const brand = palette.primary;

  const [events, setEvents] = useState([]);
  const [trackNames, setTrackNames] = useState({});
  const [loadingEvent, setLoadingEvent] = useState(true);
  const [nominatedEventIds, setNominatedEventIds] = useState(() => new Set());
  const [nominationSummaries, setNominationSummaries] = useState(() => new Map());
  const [eventsWithNominations, setEventsWithNominations] = useState(() => new Set());
  const [eventsWithResults, setEventsWithResults] = useState(() => new Set());
  const [householdResultEventIds, setHouseholdResultEventIds] = useState(() => new Set());
  const [newsItems, setNewsItems] = useState([]);

  const householdResultMatch = useMemo(() => {
    const driverIds = new Set((drivers || []).map((d) => d.id).filter(Boolean));
    const driverNameKeys = buildHouseholdResultNameKeys(drivers, { membership, profile });
    return { driverIds, driverNameKeys };
  }, [drivers, membership, profile]);

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
        setEventsWithResults(await loadPublishedResultEventIds(eventIds));
      } else {
        setEventsWithNominations(new Set());
        setEventsWithResults(new Set());
      }

      setEvents(data);
      setLoadingEvent(false);
    }

    fetchEvents();
  }, [club?.id]);

  useEffect(() => {
    if (!club?.id) return undefined;
    let cancelled = false;

    async function fetchNews() {
      const { data, error } = await supabase
        .from("club_news")
        .select(
          "id, title, body, image_url, published_at, created_at, display_from, display_until, is_published"
        )
        .eq("club_id", club.id)
        .eq("is_published", true)
        .order("published_at", { ascending: false });

      if (cancelled) return;
      if (error) {
        console.warn(error);
        setNewsItems([]);
        return;
      }
      setNewsItems((data || []).filter((item) => isClubNewsVisible(item)));
    }

    fetchNews();
    return () => {
      cancelled = true;
    };
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
      if (!eventIds.length || (!driverIds.size && !driverNameKeys.size)) {
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

  const { nextEvent, nextEventCard, openNominationEvents } = useMemo(() => {
    const now = new Date();
    const upcoming = events
      .filter((event) => getEventEndDate(event) >= now && !isEventCancelled(event))
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
        showResults={eventsWithResults.has(event.id)}
        hasNomination={nominatedEventIds.has(event.id)}
        hasHouseholdInResults={householdResultEventIds.has(event.id)}
        nominationSummary={nominationSummaries.get(event.id) || null}
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
      <PageTitle icon={HomeIcon} title={t("home.title")} style={{ color: brand }} />

      <main className="app-page-main">
        {newsItems.length > 0 && (
          <section className="w-full space-y-3">
            <Carousel
              brand={brand}
              items={newsItems}
              newsBackgroundUrl={club?.news_background_url}
              onOpenItem={(item) => navigate(`/${clubSlug}/app/news/${item.id}`)}
            />
          </section>
        )}

        {showNextEventSection && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold tracking-[0.18em] uppercase text-text-muted">
              {t("home.nextEvent")}
            </h2>

            {loadingEvent && (
              <Card>
                <div style={{ padding: "16px" }}>{t("loading.loadingEvent")}</div>
              </Card>
            )}

            {!loadingEvent && !nextEvent && (
              <Card>
                <p className="text-text-muted">{t("home.noUpcomingEvents")}</p>
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
              {t("home.openForNominations")}
            </h2>
            <div className="space-y-2">
              {openNominationEvents.map(renderEventCard)}
            </div>
          </section>
        )}

        <section className="space-y-3">
          <h2 className="text-sm font-semibold tracking-[0.18em] uppercase text-text-muted">
            {t("home.quickActions")}
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <Link to={`/${clubSlug}/app/events?category=all`} className="no-underline">
              <Button
                className="!rounded-lg !p-4 !w-full flex flex-col items-center justify-center gap-2"
                style={{
                  backgroundColor: palette.button,
                  color: palette.buttonText,
                }}
              >
                <CalendarDaysIcon className="h-7 w-7" />
                <span className="text-sm font-medium">{t("home.allEvents")}</span>
              </Button>
            </Link>

            <Link to={`/${clubSlug}/app/events?category=club`} className="no-underline">
              <Button
                className="!rounded-lg !p-4 !w-full flex flex-col items-center justify-center gap-2"
                style={{
                  backgroundColor: palette.button,
                  color: palette.buttonText,
                }}
              >
                <CalendarIcon className="h-7 w-7" />
                <span className="text-sm font-medium">{t("home.clubMeets")}</span>
              </Button>
            </Link>

            <Link to={`/${clubSlug}/app/events?category=major`} className="no-underline">
              <Button
                className="!rounded-lg !p-4 !w-full flex flex-col items-center justify-center gap-2"
                style={{
                  backgroundColor: palette.button,
                  color: palette.buttonText,
                }}
              >
                <CalendarDaysIcon className="h-7 w-7" />
                <span className="text-sm font-medium">{t("home.majorEvents")}</span>
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
                <span className="text-sm font-medium">{t("home.myNominations")}</span>
              </Button>
            </Link>

            <Link to={`/${clubSlug}/app/results`} className="no-underline">
              <Button
                className="!rounded-lg !p-4 !w-full flex flex-col items-center justify-center gap-2"
                style={{
                  backgroundColor: palette.button,
                  color: palette.buttonText,
                }}
              >
                <TrophyIcon className="h-7 w-7" />
                <span className="text-sm font-medium">{t("home.myResults")}</span>
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
                  backgroundColor: "#dc2626",
                  color: "#ffffff",
                  border: "1px solid #000000",
                }}
              >
                <BoltIcon className="h-7 w-7" />
                <span className="text-sm font-medium">{t("home.liveRc")}</span>
              </Button>
            </a>
          </div>
        </section>
      </main>
    </div>
  );
}
