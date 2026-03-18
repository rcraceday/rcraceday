// src/app/pages/home/Home.jsx
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { useClub } from "@/app/providers/ClubProvider";
import { useProfile } from "@/app/providers/ProfileProvider";
import { useMembership } from "@/app/providers/MembershipProvider";

import { supabase } from "@/supabaseClient";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

import {
  CalendarDaysIcon,
  CalendarIcon,
  UserPlusIcon,
  IdentificationIcon,
  TrophyIcon,
} from "@heroicons/react/24/solid";

export default function Home() {
  const { club, loadingClub } = useClub();
  const { profile } = useProfile();
  const { membership } = useMembership();

  const clubSlug = club?.slug;

  const brand =
    club?.theme?.hero?.backgroundColor || "#0A66C2";

  const [nextEvent, setNextEvent] = useState(null);
  const [loadingEvent, setLoadingEvent] = useState(true);

  // ---- NEWS CAROUSEL ----
  const newsScrollRef = useRef(null);
  const cardWidth = 260; // px
  const gap = 16; // px

  const newsItems = [1, 2, 3, 4, 5]; // placeholder; swap for real data later

  const scrollNewsBy = (direction) => {
    if (!newsScrollRef.current) return;
    const delta = (cardWidth + gap) * direction;
    newsScrollRef.current.scrollBy({ left: delta, behavior: "smooth" });
  };

  // ---- FETCH NEXT EVENT ----
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
    <div className="w-full max-w-[1024px] mx-auto px-4 py-10 space-y-12">

      {/* CLUB NEWS */}
      <section>
        <h2 className="text-sm font-semibold tracking-[0.18em] uppercase text-text-muted mb-3">
          Club News
        </h2>

        <div className="relative w-full">

          {/* Scroll container: 3 cards visible, no scrollbar line */}
          <div
            ref={newsScrollRef}
            className="flex gap-4 overflow-x-hidden snap-x snap-mandatory"
          >
            {newsItems.map((i) => (
              <Card
                key={i}
                className="w-[260px] snap-start rounded-lg p-0 overflow-hidden bg-white flex-shrink-0"
                style={{ border: `2px solid ${brand}` }}
              >
                <div className="w-full h-32 bg-gray-200" />
                <div className="p-4 space-y-2">
                  <div className="h-4 w-3/4 bg-gray-200 rounded" />
                  <div className="h-3 w-full bg-gray-200 rounded" />
                  <div className="h-3 w-2/3 bg-gray-200 rounded" />
                </div>
              </Card>
            ))}
          </div>

          {/* Left arrow */}
          <button
            type="button"
            onClick={() => scrollNewsBy(-1)}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 bg-white/90 border border-gray-200 hover:bg-white shadow-sm rounded-full h-8 w-8 flex items-center justify-center text-gray-500"
          >
            ‹
          </button>

          {/* Right arrow */}
          <button
            type="button"
            onClick={() => scrollNewsBy(1)}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 bg-white/90 border border-gray-200 hover:bg-white shadow-sm rounded-full h-8 w-8 flex items-center justify-center text-gray-500"
          >
            ›
          </button>
        </div>
      </section>

      {/* NEXT EVENT */}
      <section>
        <h2 className="text-sm font-semibold tracking-[0.18em] uppercase text-text-muted mb-3">
          Next Event
        </h2>

        {loadingEvent && (
          <Card
            className="rounded-lg bg-white"
            style={{ border: `2px solid ${brand}` }}
          >
            <p className="text-text-muted">Loading event...</p>
          </Card>
        )}

        {!loadingEvent && !nextEvent && (
          <Card
            className="rounded-lg bg-white"
            style={{ border: `2px solid ${brand}` }}
          >
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

          <Link to={`/${clubSlug}/app/events`} className="no-underline">
            <Button
              className="!rounded-lg !p-4 !w-full !h-full flex flex-col items-center justify-center gap-2"
              style={{ backgroundColor: brand }}
            >
              <CalendarDaysIcon className="h-7 w-7 text-white" />
              <span className="text-sm font-medium text-white">Events</span>
            </Button>
          </Link>

          <Link to={`/${clubSlug}/app/calendar`} className="no-underline">
            <Button
              className="!rounded-lg !p-4 !w-full !h-full flex flex-col items-center justify-center gap-2"
              style={{ backgroundColor: brand }}
            >
              <CalendarIcon className="h-7 w-7 text-white" />
              <span className="text-sm font-medium text-white">Calendar</span>
            </Button>
          </Link>

          <Link to={`/${clubSlug}/app/nominate`} className="no-underline">
            <Button
              className="!rounded-lg !p-4 !w-full !h-full flex flex-col items-center justify-center gap-2"
              style={{ backgroundColor: brand }}
            >
              <UserPlusIcon className="h-7 w-7 text-white" />
              <span className="text-sm font-medium text-white">Nominations</span>
            </Button>
          </Link>

          <Button
            className="!rounded-lg !p-4 !w-full !h-full flex flex-col items-center justify-center gap-2 opacity-60"
            style={{ backgroundColor: brand }}
          >
            <TrophyIcon className="h-7 w-7 text-white" />
            <span className="text-sm font-medium text-white">Results</span>
          </Button>

          <Link to={`/${clubSlug}/app/membership`} className="no-underline">
            <Button
              className="!rounded-lg !p-4 !w-full !h-full flex flex-col items-center justify-center gap-2"
              style={{ backgroundColor: brand }}
            >
              <IdentificationIcon className="h-7 w-7 text-white" />
              <span className="text-sm font-medium text-white">Membership</span>
            </Button>
          </Link>

        </div>
      </section>
    </div>
  );
}
