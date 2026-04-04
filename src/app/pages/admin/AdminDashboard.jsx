// src/app/pages/admin/AdminDashboard.jsx

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { useClub } from "@/app/providers/ClubProvider";
import { supabase } from "@/supabaseClient";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

import {
  Cog6ToothIcon,
  UsersIcon,
  UserGroupIcon,
  CalendarDaysIcon,
  TrophyIcon,
} from "@heroicons/react/24/solid";

export default function AdminDashboard() {
  const { clubSlug } = useParams();
  const navigate = useNavigate();
  const { club } = useClub();

  const brand = club?.theme?.hero?.backgroundColor || "#0A66C2";

  const [stats, setStats] = useState({
    members: 0,
    drivers: 0,
    eventsThisYear: 0,
    upcomingEvent: null,
    nominations: 0,
  });

  const [loading, setLoading] = useState(true);

  /* ===========================
     LOAD ADMIN STATS
     =========================== */

  useEffect(() => {
    async function loadStats() {
      if (!club?.id) return;

      setLoading(true);

      const year = new Date().getFullYear();

      // Members
      const { count: memberCount } = await supabase
        .from("memberships")
        .select("*", { count: "exact", head: true })
        .eq("club_id", club.id);

      // Drivers
      const { count: driverCount } = await supabase
        .from("drivers")
        .select("*", { count: "exact", head: true })
        .eq("club_id", club.id);

      // Events this year
      const { count: eventsThisYear } = await supabase
        .from("events")
        .select("*", { count: "exact", head: true })
        .eq("club_id", club.id)
        .gte("event_date", `${year}-01-01`)
        .lte("event_date", `${year}-12-31`);

      // Upcoming event
      const { data: upcoming } = await supabase
        .from("events")
        .select("*")
        .eq("club_id", club.id)
        .gte("event_date", new Date().toISOString())
        .order("event_date", { ascending: true })
        .limit(1);

      let upcomingEvent = upcoming?.[0] || null;

      let nominations = 0;

      if (upcomingEvent) {
        const { count: nomCount } = await supabase
          .from("nominations")
          .select("*", { count: "exact", head: true })
          .eq("event_id", upcomingEvent.id);

        nominations = nomCount || 0;
      }

      setStats({
        members: memberCount || 0,
        drivers: driverCount || 0,
        eventsThisYear: eventsThisYear || 0,
        upcomingEvent,
        nominations,
      });

      setLoading(false);
    }

    loadStats();
  }, [club?.id]);

  /* ===========================
     RENDER
     =========================== */

  return (
    <div className="min-h-screen w-full bg-background text-text-base">

      {/* HEADER */}
      <section className="w-full border-b border-surfaceBorder bg-surface">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-2">
          <Cog6ToothIcon className="h-5 w-5" style={{ color: brand }} />
          <h1 className="text-xl font-semibold tracking-tight">Admin Dashboard</h1>
        </div>
      </section>

      {/* MAIN */}
      <main className="max-w-4xl mx-auto px-4 py-10 space-y-12">

        {/* ===========================
            STATS CARD
            =========================== */}
        <Card
          className="rounded-xl shadow-sm overflow-hidden !p-0 !pt-0"
          style={{ border: `2px solid ${brand}`, background: "white", padding: 0 }}
        >
          {/* BLUE HEADER BAR */}
          <div
            className="px-5 py-3"
            style={{ background: brand, color: "white" }}
          >
            <h2 className="text-base font-semibold">Club Overview</h2>
          </div>

          {/* BODY */}
          <div className="p-6 space-y-8">

            {loading && <p className="text-text-muted">Loading stats…</p>}

            {!loading && (
              <>
                {/* ===========================
                    ROW 1: Members / Drivers / Events This Year
                    =========================== */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
                  <div>
                    <p className="text-sm text-text-muted">Members</p>
                    <p className="text-2xl font-semibold">{stats.members}</p>
                  </div>

                  <div>
                    <p className="text-sm text-text-muted">Drivers</p>
                    <p className="text-2xl font-semibold">{stats.drivers}</p>
                  </div>

                  <div>
                    <p className="text-sm text-text-muted">Events This Year</p>
                    <p className="text-2xl font-semibold">{stats.eventsThisYear}</p>
                  </div>
                </div>

                {/* ===========================
                    ROW 2: Upcoming Event + Nominations
                    =========================== */}
                {stats.upcomingEvent && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-center">

                    {/* Upcoming Event */}
                    <div>
                      <p className="text-sm text-text-muted">Upcoming Event</p>
                      <p className="text-lg font-semibold">
                        {stats.upcomingEvent.name}
                      </p>
                      <p className="text-sm text-text-muted">
                        {new Date(stats.upcomingEvent.event_date).toLocaleDateString("en-AU", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>

                    {/* Nominations */}
                    <div>
                      <p className="text-sm text-text-muted">Nominations</p>
                      <p className="text-2xl font-semibold">{stats.nominations}</p>
                    </div>

                  </div>
                )}
              </>
            )}

          </div>
        </Card>

        {/* ===========================
            ADMIN ACTIONS
            =========================== */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-6">

          <Button
            className="!rounded-lg !py-4 flex items-center gap-3 text-left"
            style={{ background: brand }}
            onClick={() => navigate(`/${clubSlug}/app/admin/events`)}
          >
            <CalendarDaysIcon className="w-6 h-6 text-white" />
            <span className="text-white font-medium">Manage Events</span>
          </Button>

          <Button
            className="!rounded-lg !py-4 flex items-center gap-3 text-left"
            style={{ background: brand }}
            onClick={() => navigate(`/${clubSlug}/app/admin/drivers`)}
          >
            <UsersIcon className="w-6 h-6 text-white" />
            <span className="text-white font-medium">Manage Drivers</span>
          </Button>

          <Button
            className="!rounded-lg !py-4 flex items-center gap-3 text-left"
            style={{ background: brand }}
            onClick={() => navigate(`/${clubSlug}/app/admin/memberships`)}
          >
            <UserGroupIcon className="w-6 h-6 text-white" />
            <span className="text-white font-medium">Manage Memberships</span>
          </Button>

          <Button
            className="!rounded-lg !py-4 flex items-center gap-3 text-left"
            style={{ background: brand }}
            onClick={() => navigate(`/${clubSlug}/app/admin/households`)}
          >
            <UserGroupIcon className="w-6 h-6 text-white" />
            <span className="text-white font-medium">Manage Households</span>
          </Button>

          <Button
            className="!rounded-lg !py-4 flex items-center gap-3 text-left"
            style={{ background: brand }}
            onClick={() => navigate(`/${clubSlug}/app/admin/championships`)}
          >
            <TrophyIcon className="w-6 h-6 text-white" />
            <span className="text-white font-medium">Manage Championships</span>
          </Button>

          <Button
            className="!rounded-lg !py-4 flex items-center gap-3 text-left"
            style={{ background: brand }}
            onClick={() => navigate(`/${clubSlug}/app/admin/settings`)}
          >
            <Cog6ToothIcon className="w-6 h-6 text-white" />
            <span className="text-white font-medium">Club Settings</span>
          </Button>

        </section>

      </main>
    </div>
  );
}
