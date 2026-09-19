import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/supabaseClient";

import { useClub } from "@/app/providers/ClubProvider";

import EventFilters from "./events-sections/EventFilters";
import UpcomingEventsCard from "./events-sections/UpcomingEventsCard";
import PastEventsCard from "./events-sections/PastEventsCard";

import PageTitle from "@/components/ui/PageTitle";

import { CalendarDaysIcon } from "@heroicons/react/24/solid";
import {
  extractYearsFromEvents,
  formatDate,
} from "./events-sections/helpers";

export default function Events() {
  const { club } = useClub();
  const brand = club?.theme?.hero?.backgroundColor || "#0A66C2";
  const { clubSlug } = useParams();

  const [query, setQuery] = useState("" );
  const [trackFilter, setTrackFilter] = useState("all" );
  const [typeFilter, setTypeFilter] = useState("all" );
  const [yearFilter, setYearFilter] = useState("all" );
  const [sortOrder, setSortOrder] = useState("asc" );
  const [showPastEvents, setShowPastEvents] = useState(false);

  const [filtersOpen, setFiltersOpen] = useState(false);

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

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

  // Extract years from start dates
  const years = extractYearsFromEvents(
    events.map((e) => getEventStartDate(e))
  );

  const now = new Date();

  // Multi‑day aware upcoming/past classification
  let upcoming = events.filter((e) => getEventEndDate(e) >= now);
  let past = events.filter((e) => getEventEndDate(e) < now);

  // -----------------------------
  // Filtering
  // -----------------------------
  function applyFilters(list) {
    return list.filter((e) => {
      const q = query.toLowerCase();
      const name = (e.name || "").toLowerCase();

      // AdminEventEdit uses "track"
      const track = (e.track || "").toLowerCase();

      const type = (e.event_type || "").toLowerCase();

      const startDate = getEventStartDate(e);
      const dateStr = formatDate(startDate).toLowerCase();
      const year = startDate.getFullYear().toString();

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

  // -----------------------------
  // Sorting
  // -----------------------------
  function sortList(list) {
    return [...list].sort((a, b) => {
      const da = getEventStartDate(a);
      const db = getEventStartDate(b);
      return sortOrder === "asc" ? da - db : db - da;
    });
  }

  upcoming = sortList(applyFilters(upcoming));
  past = sortList(applyFilters(past));

  function clearFilters() {
    setQuery("" );
    setTrackFilter("all" );
    setTypeFilter("all" );
    setYearFilter("all" );
    setSortOrder("asc" );
    setShowPastEvents(false);
  }

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