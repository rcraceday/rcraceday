/* ===========================
   IMPORTS
   =========================== */

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/supabaseClient";
import { useClub } from "@/app/providers/ClubProvider";
import useTheme from "@/app/providers/useTheme";

import { CalendarIcon } from "@heroicons/react/24/solid";
import PageTitle from "@/components/ui/PageTitle";

import CalendarYear from "@app/pages/events/calendar/CalendarYear";

/* ===========================
   COMPONENT
   =========================== */

export default function Calendar() {
  const { clubSlug } = useParams();
  const { club } = useClub();
  const { palette } = useTheme() || {};
  const navigate = useNavigate();

  const brand = palette?.primary ?? "#0A66C2";

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

      const startDate = `${year}-01-01`;
      const endDate = `${year}-12-31`;

      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("club_id", club.id)
        .or(
          `and(event_date.gte.${startDate},event_date.lte.${endDate}),is_multi_day.eq.true`,
        )
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
    <div style={{ minHeight: "100vh", width: "100%" }}>

      <PageTitle
        icon={CalendarIcon}
        title="Calendar"
        style={{ color: brand }}
        actions={
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
        }
      />

      {/* MAIN */}
      <main
        style={{
          padding: "40px 16px",
          display: "flex",
          flexDirection: "column",
          gap: "48px",
          maxWidth: "768px",
          margin: "0 auto",
        }}
      >
        
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
