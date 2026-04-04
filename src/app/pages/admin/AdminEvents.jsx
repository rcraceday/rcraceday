import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/supabaseClient";
import { useClub } from "@/app/providers/ClubProvider";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import AdminSearchBar from "@/components/admin/AdminSearchBar.jsx";

import { CalendarDaysIcon, ChevronDownIcon } from "@heroicons/react/24/solid";

function formatDate(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function isNominationsOpen(event) {
  const now = new Date();
  const openAt = event.nominations_open ? new Date(event.nominations_open) : null;
  const closeAt = event.nominations_close ? new Date(event.nominations_close) : null;

  if (!openAt) return false;
  if (now < openAt) return false;
  if (closeAt && now > closeAt) return false;
  return true;
}

export default function AdminEvents() {
  const { clubSlug } = useParams();
  const { club } = useClub();

  const brand = club?.theme?.hero?.backgroundColor || "#0A66C2";

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);

  const [query, setQuery] = useState("");
  const [trackFilter, setTrackFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("asc");

  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);

      const { data: eventRows, error } = await supabase
        .from("events")
        .select("*")
        .order("event_date", { ascending: true });

      if (error) {
        console.error(error);
        setLoading(false);
        return;
      }

      const { data: nomRows } = await supabase
        .from("nominations")
        .select("event_id");

      const counts = {};
      (nomRows || []).forEach((n) => {
        counts[n.event_id] = (counts[n.event_id] || 0) + 1;
      });

      const enriched = eventRows.map((ev) => ({
        ...ev,
        nomination_count: counts[ev.id] || 0,
      }));

      setEvents(enriched);
      setLoading(false);
    }

    load();
  }, []);

  function applyFilters(list) {
    return list.filter((e) => {
      const q = query.toLowerCase();
      const name = (e.name || "").toLowerCase();
      const track = (e.track || "").toLowerCase();
      const dateStr = formatDate(e.event_date).toLowerCase();
      const open = isNominationsOpen(e);

      const matchesQuery =
        !q || name.includes(q) || track.includes(q) || dateStr.includes(q);

      const matchesTrack =
        trackFilter === "all" || track.includes(trackFilter);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "open" && open) ||
        (statusFilter === "closed" && !open);

      return matchesQuery && matchesTrack && matchesStatus;
    });
  }

  let filteredEvents = applyFilters(events);

  filteredEvents = [...filteredEvents].sort((a, b) => {
    const da = a.event_date ? new Date(a.event_date) : new Date(0);
    const db = b.event_date ? new Date(b.event_date) : new Date(0);
    return sortOrder === "asc" ? da - db : db - da;
  });

  function clearFilters() {
    setQuery("");
    setTrackFilter("all");
    setStatusFilter("all");
    setSortOrder("asc");
  }

  async function handleDuplicate(event) {
    setSavingId(event.id);

    const payload = {
      name: `${event.name || "Event"} (Copy)`,
      event_date: event.event_date,
      track: event.track,
      description: event.description,
      logoUrl: event.logoUrl,
      nominations_open: null,
      nominations_close: null,
      member_price: event.member_price,
      non_member_price: event.non_member_price,
      junior_price: event.junior_price,
      class_limit: event.class_limit,
      preference_enabled: event.preference_enabled,
    };

    const { data, error } = await supabase
      .from("events")
      .insert(payload)
      .select()
      .single();

    if (!error) {
      setEvents((prev) => [...prev, { ...data, nomination_count: 0 }]);
    }

    setSavingId(null);
  }

  return (
    <div className="min-h-screen w-full bg-background text-text-base">

      {/* ADMIN HEADER */}
      <section className="w-full border-b border-surfaceBorder bg-surface">
  <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">

    {/* LEFT: ICON + TITLE */}
    <div className="flex items-center gap-2">
      <CalendarDaysIcon className="h-5 w-5" style={{ color: brand }} />
      <h1 className="text-xl font-semibold tracking-tight">Manage Events</h1>
    </div>

    {/* RIGHT: BACK TO DASHBOARD (DESKTOP ONLY) */}
    <Link to={`/${clubSlug}/app/admin`}>
      <Button
        variant="secondary"
        className="!rounded-md !px-3 !py-1.5 !text-sm"
      >
        Back to Dashboard
      </Button>
    </Link>

  </div>
</section>


      {/* ADD EVENT BUTTON */}
      <div className="max-w-3xl mx-auto px-4 pt-6 flex justify-end">
        <Link
          to={`/${clubSlug}/app/admin/events/new`}
          className="no-underline"
        >
          <Button
            className="!rounded-md !px-3 !py-1.5 !text-sm !font-medium text-white"
            style={{ backgroundColor: brand }}
          >
            ➕ Add Event
          </Button>
        </Link>
      </div>

      {/* MAIN CONTENT */}
      <div className="max-w-3xl mx-auto px-4 py-10 space-y-10">

        {/* BLUE FILTER BAR */}
<button
  onClick={() => setShowFilters(!showFilters)}
  className="w-full flex items-center justify-between px-4 py-3 rounded-md text-white font-medium"
  style={{ backgroundColor: brand }}
>
  <span>Filters</span>
  <ChevronDownIcon
    className={`h-5 w-5 transition-transform ${
      showFilters ? "rotate-180" : ""
    }`}
  />
</button>

{/* COLLAPSIBLE FILTERS */}
{showFilters && (
  <div className="space-y-4 p-4 border border-gray-200 rounded-md bg-white">

    {/* SEARCH BAR — FULL WIDTH */}
    <AdminSearchBar
      value={query}
      onChange={(e) => setQuery(e.target.value)}
      placeholder="Search…"
      className="w-full"
    />

    {/* DROPDOWNS + CLEAR BUTTON */}
<div className="grid grid-cols-1 md:grid-cols-4 gap-3 w-full">

  <select
    value={trackFilter}
    onChange={(e) => setTrackFilter(e.target.value)}
    className="w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-800"
  >
    <option value="all">All Tracks</option>
    <option value="dirt">Dirt</option>
    <option value="sic">SIC</option>
  </select>

  <select
    value={statusFilter}
    onChange={(e) => setStatusFilter(e.target.value)}
    className="w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-800"
  >
    <option value="all">All Status</option>
    <option value="open">Nominations Open</option>
    <option value="closed">Nominations Closed</option>
  </select>

  <select
    value={sortOrder}
    onChange={(e) => setSortOrder(e.target.value)}
    className="w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-800"
  >
    <option value="asc">Date ↑</option>
    <option value="desc">Date ↓</option>
  </select>

  <Button
    variant="secondary"
    className="w-full !rounded-md !px-3 !py-1.5 !text-sm"
    onClick={clearFilters}
  >
    Clear
  </Button>

</div>
  </div>
)}

        {/* EVENT LIST — EXACT public Events card layout */}
        {loading && <p className="text-text-muted">Loading events…</p>}

        {!loading && filteredEvents.length === 0 && (
          <p className="text-text-muted">No events found.</p>
        )}

        {!loading &&
          filteredEvents.map((event) => {
            const logo = event.logoUrl || event.logourl;
            const track = event.track;
            const open = isNominationsOpen(event);
            const isBusy = savingId === event.id;

            return (
              <Card
                key={event.id}
                className="p-0 rounded-lg bg-white"
                style={{ border: `2px solid ${brand}` }}
              >
                <div className="p-4 flex flex-col md:flex-row gap-4 items-start">

                  {/* LOGO */}
                  {logo && (
                    <div className="w-24 h-24 bg-white border border-gray-200 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0">
                      <img
                        src={logo}
                        alt="Event Logo"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  )}

                  {/* TEXT */}
                  <div className="flex-1 space-y-2">
                    <div className="text-lg font-semibold leading-snug">
                      {event.name}
                    </div>

                    <div className="text-sm text-text-muted leading-tight space-y-0.5">
                      <div><strong>Event Date:</strong> {formatDate(event.event_date)}</div>
                      <div><strong>Track:</strong> {track}</div>
                      <div><strong>Nominations:</strong> {event.nomination_count}</div>
                    </div>
                  </div>

                  {/* ACTIONS */}
                  <div className="flex flex-col gap-2 w-full md:w-auto">

                    <Link
                      to={`/${clubSlug}/app/admin/events/${event.id}`}
                      className="no-underline"
                    >
                      <Button
                        className="!rounded-md !px-3 !py-1.5 !text-sm !font-medium"
                        style={{ backgroundColor: brand }}
                      >
                        Edit Event
                      </Button>
                    </Link>

                    <Link
                      to={`/${clubSlug}/app/admin/events/${event.id}/nominations`}
                      className="no-underline"
                    >
                      <Button
                        variant="secondary"
                        className="!rounded-md !px-3 !py-1.5 !text-sm !font-medium"
                      >
                        View Nominations
                      </Button>
                    </Link>

                    <Button
                      variant="secondary"
                      disabled={isBusy}
                      onClick={() => handleDuplicate(event)}
                      className="!rounded-md !px-3 !py-1.5 !text-sm !font-medium"
                    >
                      {isBusy ? "Duplicating…" : "Duplicate"}
                    </Button>

                  </div>

                </div>
              </Card>
            );
          })}
      </div>
    </div>
  );
}
