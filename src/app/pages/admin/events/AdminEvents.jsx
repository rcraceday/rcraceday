import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/supabaseClient";

import CMSCard from "../cms/CMSCard";
import CMSButton from "../cms/CMSButton";
import EventsTable from "./components/EventsTable";

import { PlusIcon } from "@heroicons/react/24/solid";
import { cmsStyles } from "../cms/styles";

export default function AdminEvents() {
  const navigate = useNavigate();
  const { clubSlug } = useParams();

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  // -----------------------------
  // FILTER STATE
  // -----------------------------
  const [query, setQuery] = useState("");
  const [trackFilter, setTrackFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("asc");
  const [dateFilter, setDateFilter] = useState("all");

  useEffect(() => {
    async function loadEvents() {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .order("event_date", { ascending: true });

      if (error) {
        console.error("Failed to load events:", error);
        setLoading(false);
        return;
      }

      setEvents(data || []);
      setLoading(false);
    }

    loadEvents();
  }, []);

  const handleCreate = () => {
    navigate(`/${clubSlug}/app/admin/events/new`);
  };

  // -----------------------------
  // FILTER LOGIC
  // -----------------------------
  const now = new Date();

  let filteredEvents = events.filter((ev) => {
    const matchesQuery =
      ev.name?.toLowerCase().includes(query.toLowerCase()) ||
      ev.track?.toLowerCase().includes(query.toLowerCase());

    const matchesTrack =
      trackFilter === "all" ||
      (ev.track || "").toLowerCase() === trackFilter.toLowerCase();

    const matchesType =
      typeFilter === "all" ||
      (ev.type || "").toLowerCase() === typeFilter.toLowerCase();

    const matchesDate =
      dateFilter === "upcoming"
        ? new Date(ev.event_date) >= now
        : dateFilter === "past"
        ? new Date(ev.event_date) < now
        : true;

    return matchesQuery && matchesTrack && matchesType && matchesDate;
  });

  filteredEvents.sort((a, b) => {
    const da = new Date(a.event_date);
    const db = new Date(b.event_date);
    return sortOrder === "asc" ? da - db : db - da;
  });

  return (
    <div style={cmsStyles.pageContainer}>
      <div style={cmsStyles.pageContent}>

        {/* CANONICAL HEADER */}
        <div style={cmsStyles.sectionHeader}>
          <h1 style={cmsStyles.sectionHeaderTitle}>Manage Events</h1>
          <p style={cmsStyles.sectionHeaderSubtitle}>
            Create, edit, and manage all club events and their nominations.
          </p>
        </div>

        {/* FILTERS */}
        <div
          style={{
            marginBottom: "16px",
            display: "flex",
            flexWrap: "wrap",
            gap: "8px",
            alignItems: "center",
          }}
        >
          {/* Search */}
          <input
            placeholder="Search events…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              padding: "10px 12px",
              borderRadius: "6px",
              border: "1px solid #D1D5DB",
              fontSize: "12px",
              flex: "1",
              minWidth: "180px",
            }}
          />

          {/* Date Filter */}
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            style={{
              padding: "10px 12px",
              borderRadius: "6px",
              border: "1px solid #D1D5DB",
              fontSize: "12px",
            }}
          >
            <option value="all">All Events</option>
            <option value="upcoming">Upcoming</option>
            <option value="past">Past</option>
          </select>

          {/* Track Filter */}
          <select
            value={trackFilter}
            onChange={(e) => setTrackFilter(e.target.value)}
            style={{
              padding: "10px 12px",
              borderRadius: "6px",
              border: "1px solid #D1D5DB",
              fontSize: "12px",
            }}
          >
            <option value="all">All Tracks</option>
            <option value="dirt">Dirt</option>
            <option value="sic">SIC</option>
          </select>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            style={{
              padding: "10px 12px",
              borderRadius: "6px",
              border: "1px solid #D1D5DB",
              fontSize: "12px",
            }}
          >
            <option value="all">All Types</option>
            <option value="race">Race</option>
            <option value="practice">Practice</option>
          </select>

          {/* Date Sort */}
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            style={{
              padding: "10px 12px",
              borderRadius: "6px",
              border: "1px solid #D1D5DB",
              fontSize: "12px",
            }}
          >
            <option value="asc">Date ↑</option>
            <option value="desc">Date ↓</option>
          </select>
        </div>

        {/* EVENTS LIST */}
        <CMSCard
          title="Events"
          actions={
            <CMSButton
              onClick={handleCreate}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                whiteSpace: "nowrap",
              }}
            >
              <PlusIcon style={{ width: 16, height: 16, color: "#DC2626" }} />
              Create Event
            </CMSButton>
          }
        >
          {loading ? (
            <div style={{ padding: "16px" }}>Loading events…</div>
          ) : (
            <div
              style={{
                width: "100%",
                overflowX: "auto",
              }}
            >
              <EventsTable
                events={filteredEvents}
                loading={loading}
                clubSlug={clubSlug}
              />
            </div>
          )}
        </CMSCard>

      </div>
    </div>
  );
}
