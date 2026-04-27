// src/app/pages/home/Home.jsx
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useClub } from "@/app/providers/ClubProvider";
import { useProfile } from "@/app/providers/ProfileProvider";
import { useMembership } from "@/app/providers/MembershipProvider";
import { useDrivers } from "@/app/providers/DriverProvider";

import { supabase } from "@/supabaseClient";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Carousel from "@/components/Carousel";

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
  const { club, loadingClub } = useClub();
  const { profile } = useProfile();
  const { membership, loadingMembership } = useMembership();
  const { drivers, loadingDrivers } = useDrivers();

  const navigate = useNavigate();

  const clubSlug = club?.slug;
  const brand = club?.theme?.hero?.backgroundColor || "#0A66C2";

  const [nextEvent, setNextEvent] = useState(null);
  const [loadingEvent, setLoadingEvent] = useState(true);

  const newsItems = [
    { title: "News 1" },
    { title: "News 2" },
    { title: "News 3" },
    { title: "News 4" },
    { title: "News 5" },
  ];

  const isAdmin = profile?.role === "admin";

  // ------------------------------------------------------------
  // ⭐ FIXED: SAFE FIRST-TIME USER REDIRECT
  // ------------------------------------------------------------
  useEffect(() => {
    if (!clubSlug) return;

    // Wait for all loading states
    if (loadingMembership) return;
    if (loadingDrivers) return;

    // Drivers must be loaded
    if (!Array.isArray(drivers)) return;

    // Redirect ONLY if user truly has no drivers
    if (drivers.length === 0) {
      navigate(`/${clubSlug}/app/profile/drivers/welcome`, { replace: true });
    }
  }, [
    clubSlug,
    loadingMembership,
    loadingDrivers,
    drivers,
    navigate,
  ]);

  // ------------------------------------------------------------
  // FETCH NEXT EVENT
  // ------------------------------------------------------------
  useEffect(() => {
    if (!club?.id) return;

    async function fetchNextEvent() {
      setLoadingEvent(true);

      const today = new Date().toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("club_id", club.id)
        .eq("is_published", true)
        .gte("event_date", today)
        .order("event_date", { ascending: true })
        .limit(1);

      if (!error && data?.length > 0) {
        setNextEvent(data[0]);
      }

      setLoadingEvent(false);
    }

    fetchNextEvent();
  }, [club?.id]);

  if (loadingClub && club === null) {
    return (
      <div className="w-full text-center text-gray-400 py-10">
        Loading club…
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-background text-text-base">

      {/* HEADER */}
      <section className="w-full border-b border-surfaceBorder bg-surface">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-2">
          <HomeIcon className="h-5 w-5" style={{ color: brand }} />
          <h1 className="text-xl font-semibold tracking-tight">Home</h1>
        </div>
      </section>

      {/* MAIN */}
      <main className="max-w-[720px] mx-auto px-4 space-y-12 pb-10 flex flex-col">

        {/* NEWS */}
        <section>
          <h2 className="text-sm font-semibold tracking-[0.18em] uppercase text-text-muted mb-3">
            Club News
          </h2>

          <Carousel brand={brand} items={newsItems} />
        </section>

        {/* NEXT EVENT */}
        <section>
          <h2 className="text-sm font-semibold tracking-[0.18em] uppercase text-text-muted mb-3">
            Next Event
          </h2>

          {loadingEvent && (
            <Card className="rounded-lg bg-white" style={{ border: `2px solid ${brand}` }}>
              <p className="text-text-muted">Loading event...</p>
            </Card>
          )}

          {!loadingEvent && !nextEvent && (
            <Card className="rounded-lg bg-white" style={{ border: `2px solid ${brand}` }}>
              <p className="text-text-muted">No upcoming events scheduled.</p>
            </Card>
          )}

          {!loadingEvent && nextEvent && (
            <Link
              to={`/${clubSlug}/app/events/${nextEvent.id}`}
              className="block no-underline"
            >
              <Card
                className="space-y-3 text-center bg-white rounded-lg hover:opacity-90 transition"
                style={{ border: `2px solid ${brand}` }}
              >
                {nextEvent.logoUrl && (
                  <img
                    src={nextEvent.logoUrl}
                    alt={`${nextEvent.name} logo`}
                    className="mx-auto max-w-full h-auto"
                    style={{ objectFit: "contain", width: "120px" }}
                  />
                )}

                <h3 className="text-lg font-semibold text-text-base">
                  {nextEvent.name}
                </h3>

                <p className="text-text-muted">
                  {new Date(nextEvent.event_date).toLocaleDateString("en-AU", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}
                </p>

                {nextEvent.track && (
                  <p className="text-text-muted">Track: {nextEvent.track}</p>
                )}
              </Card>
            </Link>
          )}
        </section>

        {/* QUICK ACTIONS */}
        <section>
          <h2 className="text-sm font-semibold tracking-[0.18em] uppercase text-text-muted mb-3">
            Quick Actions
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">

            {/* Events */}
            <Link to={`/${clubSlug}/app/events`} className="no-underline">
              <Button
                className="!rounded-lg !p-4 !w-full !h-full flex flex-col items-center justify-center gap-2"
                style={{ backgroundColor: brand }}
              >
                <CalendarDaysIcon className="h-7 w-7 text-white" />
                <span className="text-sm font-medium text-white">Events</span>
              </Button>
            </Link>

            {/* Calendar */}
            <Link to={`/${clubSlug}/app/calendar`} className="no-underline">
              <Button
                className="!rounded-lg !p-4 !w-full !h-full flex flex-col items-center justify-center gap-2"
                style={{ backgroundColor: brand }}
              >
                <CalendarIcon className="h-7 w-7 text-white" />
                <span className="text-sm font-medium text-white">Calendar</span>
              </Button>
            </Link>

            {/* Nominations */}
            <Link to={`/${clubSlug}/app/nominate`} className="no-underline">
              <Button
                className="!rounded-lg !p-4 !w-full !h-full flex flex-col items-center justify-center gap-2"
                style={{ backgroundColor: brand }}
              >
                <UserPlusIcon className="h-7 w-7 text-white" />
                <span className="text-sm font-medium text-white">Nominations</span>
              </Button>
            </Link>

            {/* Results (disabled) */}
            <Button
              className="!rounded-lg !p-4 !w-full !h-full flex flex-col items-center justify-center gap-2 opacity-60"
              style={{ backgroundColor: brand }}
            >
              <TrophyIcon className="h-7 w-7 text-white" />
              <span className="text-sm font-medium text-white">Results</span>
            </Button>

            {/* Membership */}
            <Link to={`/${clubSlug}/app/membership`} className="no-underline">
              <Button
                className="!rounded-lg !p-4 !w-full !h-full flex flex-col items-center justify-center gap-2"
                style={{ backgroundColor: brand }}
              >
                <IdentificationIcon className="h-7 w-7 text-white" />
                <span className="text-sm font-medium text-white">Membership</span>
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
                className="!rounded-lg !p-4 !w-full !h-full flex flex-col items-center justify-center gap-2"
                style={{ backgroundColor: brand }}
              >
                <BoltIcon className="h-7 w-7 text-white" />
                <span className="text-sm font-medium text-white">LiveRC</span>
              </Button>
            </a>

          </div>

          {/* ADMIN BUTTON */}
          {isAdmin && (
            <div className="mt-6">
              <Button
                className="!rounded-lg !py-4 w-full flex items-center justify-center gap-3"
                style={{ backgroundColor: brand }}
                onClick={() => navigate(`/${clubSlug}/app/admin`)}
              >
                <Cog6ToothIcon className="w-6 h-6 text-white" />
                <span className="text-white font-medium text-base">Admin Dashboard</span>
              </Button>
            </div>
          )}

        </section>
      </main>
    </div>
  );
}
