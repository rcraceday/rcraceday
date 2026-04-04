/* ===========================
   IMPORTS
   =========================== */

import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/supabaseClient";

import { useClub } from "@/app/providers/ClubProvider";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

import {
  CalendarDaysIcon,
  FunnelIcon,
  ArchiveBoxIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "@heroicons/react/24/solid";

/* ===========================
   DATE FORMATTER
   =========================== */

function formatDate(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/* ===========================
   EVENT TYPE LABELS
   =========================== */

const TYPE_LABELS = {
  racing: "Racing",
  practice: "Practice",
  club_meet: "Club Meet",
  championship_round: "Championship Round",
  state_titles: "State Titles",
  national_titles: "National Titles",
};

/* ===========================
   HELPERS
   =========================== */

function isNominationsOpen(event) {
  if (!event.nominations_open || !event.nominations_close) return false;

  const open = new Date(event.nominations_open);
  const close = new Date(event.nominations_close);
  const now = new Date();

  if (isNaN(open.getTime()) || isNaN(close.getTime())) return false;

  return now >= open && now <= close;
}

/* ===========================
   COMPONENT
   =========================== */

export default function Events() {
  /* ===========================
     HOOKS + BRAND COLOR
     =========================== */

  const { club } = useClub();
  const brand = club?.theme?.hero?.backgroundColor || "#0A66C2";

  const { clubSlug } = useParams();

  /* ===========================
     FILTER STATE
     =========================== */

  const [query, setQuery] = useState("");
  const [trackFilter, setTrackFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("asc");

  const [pastOpen, setPastOpen] = useState(false);

  /* ===========================
     DATA
     =========================== */

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  /* ===========================
     FETCH EVENTS
     =========================== */

  useEffect(() => {
    async function loadEvents() {
      setLoading(true);

      const { data, error } = await supabase
        .from("events")
        .select("*")
        .order("event_date", { ascending: true });

      if (!error && data) setEvents(data);

      setLoading(false);
    }

    loadEvents();
  }, []);

  /* ===========================
     UPCOMING + PAST SPLIT
     =========================== */

  const now = new Date();
  const upcoming = events.filter((e) => new Date(e.event_date) >= now);
  const past = events.filter((e) => new Date(e.event_date) < now);

  /* ===========================
     FILTER LOGIC
     =========================== */

  function applyFilters(list) {
    return list.filter((e) => {
      const q = query.toLowerCase();

      const name = (e.name || "").toLowerCase();
      const track = (e.track_type || e.track || "").toLowerCase();
      const type = (e.event_type || "racing").toLowerCase();

      const dateStr = formatDate(e.event_date).toLowerCase();

      const matchesQuery =
        !q || name.includes(q) || track.includes(q) || dateStr.includes(q);

      const matchesTrack =
        trackFilter === "all" || track.includes(trackFilter.toLowerCase());

      const matchesType =
        typeFilter === "all" || type === typeFilter.toLowerCase();

      return matchesQuery && matchesTrack && matchesType;
    });
  }

  let filteredUpcoming = applyFilters(upcoming);
  let filteredPast = applyFilters(past);

  /* ===========================
     SORTING
     =========================== */

  function sortList(list) {
    return [...list].sort((a, b) => {
      const da = new Date(a.event_date);
      const db = new Date(b.event_date);
      return sortOrder === "asc" ? da - db : db - da;
    });
  }

  filteredUpcoming = sortList(filteredUpcoming);
  filteredPast = sortList(filteredPast);

  /* ===========================
     CLEAR FILTERS
     =========================== */

  function clearFilters() {
    setQuery("");
    setTrackFilter("all");
    setTypeFilter("all");
    setSortOrder("asc");
  }

  /* ===========================
     PAGE WRAPPER
     =========================== */

  return (
    <div className="min-h-screen w-full bg-background text-text-base">

      {/* ===========================
          PAGE TITLE
          =========================== */}
      <section className="w-full border-b border-surfaceBorder bg-surface">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-2">
          <CalendarDaysIcon
            className="h-5 w-5"
            strokeWidth={2}
            style={{ color: brand }}
          />
          <h1 className="text-xl font-semibold tracking-tight">Events</h1>
        </div>
      </section>

      {/* ===========================
          MAIN CONTENT
          =========================== */}
      <main className="max-w-3xl mx-auto px-4 py-10 space-y-12">

        {/* ===========================
            UPCOMING EVENTS CARD
            =========================== */}
        <div
          className="rounded-xl shadow-sm overflow-hidden"
          style={{ border: `2px solid ${brand}`, background: "white" }}
        >
          {/* CARD HEADER */}
          <div
            className="px-5 py-3"
            style={{ background: brand, color: "white" }}
          >
            <h2 className="text-base font-semibold">Upcoming Events</h2>
          </div>

          {/* CARD BODY */}
          <div className="p-5 space-y-8">

{/* FILTERS */}
<div className="space-y-4">
  <div className="flex gap-3 flex-wrap">

    <select
      value={trackFilter}
      onChange={(e) => setTrackFilter(e.target.value)}
      className="w-full sm:w-40 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-800"
    >
      <option value="all">All Tracks</option>
      <option value="dirt">Dirt</option>
      <option value="sic">SIC</option>
    </select>

    <select
      value={typeFilter}
      onChange={(e) => setTypeFilter(e.target.value)}
      className="w-full sm:w-48 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-800"
    >
      <option value="all">All Types</option>
      <option value="racing">Racing</option>
      <option value="practice">Practice</option>
      <option value="club_meet">Club Meet</option>
      <option value="championship_round">Championship Round</option>
      <option value="state_titles">State Titles</option>
      <option value="national_titles">National Titles</option>
    </select>

    <select
      value={sortOrder}
      onChange={(e) => setSortOrder(e.target.value)}
      className="w-full sm:w-40 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-800"
    >
      <option value="asc">Date ↑</option>
      <option value="desc">Date ↓</option>
    </select>

  </div>
</div>

            {/* UPCOMING EVENTS LIST */}
            {loading && <p className="text-text-muted">Loading events…</p>}

            {!loading && filteredUpcoming.length === 0 && (
              <p className="text-text-muted">No upcoming events.</p>
            )}

            {!loading &&
              filteredUpcoming.map((event) => {
                const logo = event.logoUrl || event.logourl;
                const track = event.track_type || event.track;
                const type = (event.event_type || "racing").toLowerCase();
                const typeLabel = TYPE_LABELS[type];

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
                          <div><strong>Event Type:</strong> {typeLabel}</div>
                          <div><strong>Track:</strong> {track}</div>
                        </div>
                      </div>

                      {/* ACTIONS */}
                      <div className="flex flex-col gap-2 w-full md:w-auto">

                        <Link
                          to={`/${clubSlug}/app/events/${event.id}`}
                          className="no-underline"
                        >
                          <Button
                            className="!rounded-md !px-3 !py-1.5 !text-sm !font-medium"
                            style={{ backgroundColor: brand }}
                          >
                            View Event
                          </Button>
                        </Link>

                        {isNominationsOpen(event) && (
                          <Link
                            to={`/${clubSlug}/app/nominate?eventId=${event.id}`}
                            className="no-underline"
                          >
                            <Button
                              variant="success"
                              className="!rounded-md !px-3 !py-1.5 !text-sm !font-medium"
                            >
                              Nominate
                            </Button>
                          </Link>
                        )}

                      </div>

                    </div>
                  </Card>
                );
              })}

          </div>
        </div>

        {/* ===========================
            PAST EVENTS CARD
            =========================== */}
        <div
          className="rounded-xl shadow-sm overflow-hidden"
          style={{ border: `2px solid ${brand}`, background: "white" }}
        >
          {/* CARD HEADER */}
          <div
            className="px-5 py-3 flex items-center justify-between cursor-pointer"
            style={{ background: brand, color: "white" }}
            onClick={() => setPastOpen(!pastOpen)}
          >
            <h2 className="text-base font-semibold">Past Events</h2>
            {pastOpen ? (
              <ChevronUpIcon className="w-5 h-5 text-white" />
            ) : (
              <ChevronDownIcon className="w-5 h-5 text-white" />
            )}
          </div>

          {/* CARD BODY */}
          {pastOpen && (
            <div className="p-5 space-y-8">

              {!loading && filteredPast.length === 0 && (
                <p className="text-text-muted">No past events.</p>
              )}

              {!loading &&
                filteredPast.map((event) => {
                  const logo = event.logoUrl || event.logourl;
                  const track = event.track_type || event.track;
                  const type = (event.event_type || "racing").toLowerCase();
                  const typeLabel = TYPE_LABELS[type];

                  return (
                    <Card
                      key={event.id}
                      className="p-0 rounded-lg bg-white opacity-80"
                      style={{ border: `2px solid ${brand}` }}
                    >
                      <div className="p-4 flex flex-col md:flex-row gap-4 items-start">

                        {/* LOGO */}
                        {logo && (
                          <div className="w-20 h-20 bg-white border border-gray-200 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0">
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
                            <div><strong>Event Type:</strong> {typeLabel}</div>
                            <div><strong>Track:</strong> {track}</div>
                          </div>
                        </div>

                        {/* ACTIONS */}
                        <div className="flex flex-col gap-2 w-full md:w-auto">

                          <Link
                            to={`/${clubSlug}/app/events/${event.id}`}
                            className="no-underline"
                          >
                            <Button
                              className="!rounded-md !px-3 !py-1.5 !text-sm !font-medium"
                              style={{ backgroundColor: brand }}
                            >
                              View Event
                            </Button>
                          </Link>

                          <Link
                            to={`/${clubSlug}/app/events/${event.id}/results`}
                            className="no-underline"
                          >
                            <Button
                              className="!rounded-md !px-3 !py-1.5 !text-sm !font-medium"
                              style={{ backgroundColor: brand }}
                            >
                              View Results
                            </Button>
                          </Link>

                        </div>

                      </div>
                    </Card>
                  );
                })}

            </div>
          )}
        </div>

      </main>
    </div>
  );
}
