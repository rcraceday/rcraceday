import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/supabaseClient";

import { useClub } from "@/app/providers/ClubProvider";

import EventFilters from "./events-sections/EventFilters";
import UpcomingEventsCard from "./events-sections/UpcomingEventsCard";
import PastEventsCard from "./events-sections/PastEventsCard";

import { CalendarDaysIcon } from "@heroicons/react/24/solid";
import {
  extractYearsFromEvents,
  formatDate,
} from "./events-sections/helpers";

export default function Events() {
  const { club } = useClub();
  const brand = club?.theme?.hero?.backgroundColor || "#0A66C2";
  const { clubSlug } = useParams();

  const [query, setQuery] = useState("");
  const [trackFilter, setTrackFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("asc");
  const [showPastEvents, setShowPastEvents] = useState(false);

  const [filtersOpen, setFiltersOpen] = useState(false);

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadEvents() {
      setLoading(true);

      const { data } = await supabase
        .from("events")
        .select("*")
        .order("event_date", { ascending: true });

      setEvents(data || []);
      setLoading(false);
    }

    loadEvents();
  }, []);

  const years = extractYearsFromEvents(events);

  const now = new Date();
  let upcoming = events.filter((e) => new Date(e.event_date) >= now);
  let past = events.filter((e) => new Date(e.event_date) < now);

  function applyFilters(list) {
    return list.filter((e) => {
      const q = query.toLowerCase();
      const name = (e.name || "").toLowerCase();
      const track = (e.track_type || e.track || "").toLowerCase();
      const type = (e.event_type || "racing").toLowerCase();
      const dateStr = formatDate(e.event_date).toLowerCase();
      const year = new Date(e.event_date).getFullYear().toString();

      const matchesQuery =
        !q || name.includes(q) || track.includes(q) || dateStr.includes(q);

      const matchesTrack =
        trackFilter === "all" || track.includes(trackFilter.toLowerCase());

      const matchesType =
        typeFilter === "all" || type === typeFilter.toLowerCase();

      const matchesYear = yearFilter === "all" || year === yearFilter;

      return matchesQuery && matchesTrack && matchesType && matchesYear;
    });
  }

  function sortList(list) {
    return [...list].sort((a, b) => {
      const da = new Date(a.event_date);
      const db = new Date(b.event_date);
      return sortOrder === "asc" ? da - db : db - da;
    });
  }

  upcoming = sortList(applyFilters(upcoming));
  past = sortList(applyFilters(past));

  function clearFilters() {
    setQuery("");
    setTrackFilter("all");
    setTypeFilter("all");
    setYearFilter("all");
    setSortOrder("asc");
    setShowPastEvents(false);
  }

  return (
    <div style={{ minHeight: "100vh", width: "100%" }}>
      <section
        style={{
          width: "100%",
          borderBottom: "1px solid #ddd",
          background: "white",
        }}
      >
        <div
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
            padding: "16px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <CalendarDaysIcon className="h-5 w-5" style={{ color: brand }} />
          <h1 style={{ fontSize: "20px", fontWeight: 600 }}>Events</h1>
        </div>
      </section>

      {/* RESTORED EXACTLY — only removed the container */}
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
        {/* FILTER BAR */}
        <div
          style={{
            border: `2px solid ${brand}`,
            background: "white",
            borderRadius: "6px",
            cursor: "pointer",
          }}
          onClick={() => setFiltersOpen(!filtersOpen)}
        >
          <div
            style={{
              padding: "6px 12px",
              height: "36px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              color: brand,
              fontSize: "14px",
              fontWeight: 600,
            }}
          >
            <span>Filters</span>
            <span>{filtersOpen ? "▲" : "▼"}</span>
          </div>

          {filtersOpen && (
            <div
              style={{ padding: "16px", borderTop: "1px solid #eee" }}
              onClick={(e) => e.stopPropagation()}
            >
              <EventFilters
                query={query}
                setQuery={setQuery}
                trackFilter={trackFilter}
                setTrackFilter={setTrackFilter}
                typeFilter={typeFilter}
                setTypeFilter={setTypeFilter}
                yearFilter={yearFilter}
                setYearFilter={setYearFilter}
                sortOrder={sortOrder}
                setSortOrder={setSortOrder}
                showPastEvents={showPastEvents}
                setShowPastEvents={setShowPastEvents}
                clearFilters={clearFilters}
                years={years}
                brand={brand}
              />
            </div>
          )}
        </div>

        <UpcomingEventsCard
          brand={brand}
          clubSlug={clubSlug}
          loading={loading}
          events={upcoming}
        />

        {showPastEvents && <PastEventsCard brand={brand} events={past} />}
      </main>
    </div>
  );
}
