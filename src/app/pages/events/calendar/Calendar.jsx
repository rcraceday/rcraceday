/* ===========================
   IMPORTS
   =========================== */

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/supabaseClient";
import { useClub } from "@/app/providers/ClubProvider";

import { CalendarIcon } from "@heroicons/react/24/solid";

import CalendarYear from "@app/pages/events/calendar/CalendarYear";

/* ===========================
   COMPONENT
   =========================== */

export default function Calendar() {
  const { clubSlug } = useParams();
  const { club } = useClub();
  const navigate = useNavigate();

  const brand = club?.theme?.hero?.backgroundColor ?? "#0A66C2";

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  /* ---------------------------
     LOAD YEAR EVENTS
     --------------------------- */

  useEffect(() => {
    async function loadData() {
      if (!club?.id) return;

      setLoading(true);

      const start = new Date(year, 0, 1);
      const end = new Date(year, 11, 31, 23, 59, 59);

      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("club_id", club.id)
        .gte("event_date", start.toISOString())
        .lte("event_date", end.toISOString())
        .order("event_date", { ascending: true });

      if (!error) setEvents(data || []);

      setLoading(false);
    }

    loadData();
  }, [year, club?.id]);

  /* ===========================
     RENDER
     =========================== */

  return (
    <div className="min-h-screen w-full bg-background text-text-base">

      {/* HEADER */}
      <section className="w-full border-b border-surfaceBorder bg-surface">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">

          {/* LEFT: Icon + Title */}
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" style={{ color: brand }} />
            <h1 className="text-xl font-semibold tracking-tight">Calendar</h1>
          </div>

          {/* RIGHT: Year Selector */}
          <select
            className="border border-surfaceBorder rounded-md p-1.5 bg-white shadow-sm text-sm"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          >
            {Array.from({ length: 5 }).map((_, i) => {
              const y = today.getFullYear() - 2 + i;
              return (
                <option key={y} value={y}>
                  {y}
                </option>
              );
            })}
          </select>

        </div>
      </section>

      {/* MAIN */}
      <main className="max-w-3xl mx-auto px-4 space-y-12 pb-10 flex flex-col">

        {/* YEAR VIEW */}
        <section className="transition-all duration-300">
          {loading && <p className="text-text-muted">Loading calendar…</p>}

          {!loading && (
            <CalendarYear
              year={year}
              events={events}
              brand={brand}
              onEventClick={(event) =>
                navigate(`/${clubSlug}/app/events/${event.id}`)
              }
            />
          )}
        </section>

      </main>
    </div>
  );
}
