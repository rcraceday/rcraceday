// src/app/pages/events/EventDetails.jsx

/* ===========================
   IMPORTS
   =========================== */

import { useParams, Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/supabaseClient";
import Card from "@/components/ui/Card";
import { useClub } from "@/app/providers/ClubProvider";
import {
  CalendarDaysIcon,
  ArrowLeftIcon,
} from "@heroicons/react/24/solid";

/* ===========================
   HELPERS
   =========================== */

// Clean nomination window logic (timestamps)
function isNominationsOpen(event) {
  if (!event.nominations_open || !event.nominations_close) return false;

  const open = new Date(event.nominations_open);
  const close = new Date(event.nominations_close);
  const now = new Date();

  if (isNaN(open.getTime()) || isNaN(close.getTime())) return false;

  return now >= open && now <= close;
}

function formatDate(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime12(dateString) {
  if (!dateString) return "";
  const d = new Date(dateString);
  return d.toLocaleTimeString("en-AU", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/* ===========================
   COMPONENT
   =========================== */

export default function EventDetails() {
  const navigate = useNavigate();

  const { id, clubSlug } = useParams();
  const { club } = useClub();
  const brand = club?.theme?.hero?.backgroundColor || "#0A66C2";

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);

  const [attending, setAttending] = useState([]);
  const [loadingAttending, setLoadingAttending] = useState(true);

  /* ===========================
     FETCH EVENT
     =========================== */

  useEffect(() => {
    async function loadEvent() {
      setLoading(true);

      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("id", id)
        .single();

      if (!error) setEvent(data);

      setLoading(false);
    }

    loadEvent();
  }, [id]);

  /* ===========================
     FETCH ATTENDING DRIVERS
     =========================== */

  useEffect(() => {
    async function loadAttending() {
      setLoadingAttending(true);

      const { data, error } = await supabase
        .from("nominations")
        .select(`
          id,
          driver_id,
          drivers (
            id,
            first_name,
            last_name,
            number,
            driver_type,
            is_junior
          )
        `)
        .eq("event_id", id);

      if (!error && data) {
        setAttending(
          data
            .map((n) => n.drivers)
            .filter(Boolean)
            .sort((a, b) => (a.number || 9999) - (b.number || 9999))
        );
      }

      setLoadingAttending(false);
    }

    loadAttending();
  }, [id]);

  /* ===========================
     LOADING / NOT FOUND
     =========================== */

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center px-4 py-6">
        <p className="text-text-muted">Loading event…</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex justify-center px-4 py-6">
        <p className="text-text-muted">Event not found.</p>
      </div>
    );
  }

  /* ===========================
     NORMALISED VALUES
     =========================== */

  const logo = event.logoUrl || event.logourl || null;
  const track = event.track_type || event.track || "Unknown";

  const type = (event.event_type || "racing").toLowerCase();

  const typeColors = {
    racing: "#00438A",
    practice: "#008A2E",
    club_meet: "#8A0043",
    championship_round: "#7B3F00",
    state_titles: "#9C27B0",
    national_titles: "#B71C1C",
  };

  const badgeStyle = {
    background: typeColors[type] || "#00438A",
    color: "white",
    padding: "4px 10px",
    borderRadius: "12px",
    fontSize: "0.75rem",
    fontWeight: 600,
    textTransform: "capitalize",
    display: "inline-block",
  };

  const typeLabel = {
    racing: "Racing",
    practice: "Practice",
    club_meet: "Club Meet",
    championship_round: "Championship Round",
    state_titles: "State Titles",
    national_titles: "National Titles",
  }[type];

  const nominationsOpen = isNominationsOpen(event);
  const isPast = new Date(event.event_date) < new Date();

  const nominationCount = attending.length;
  const nominationSuffix =
    !loadingAttending && nominationCount >= 0
      ? ` — ${nominationCount} nomination${nominationCount === 1 ? "" : "s"}`
      : "";

  /* ===========================
     ICS DOWNLOAD
     =========================== */

  function downloadICS() {
    const start = new Date(event.event_date);
    const end = new Date(start.getTime() + 3 * 60 * 60 * 1000);

    const pad = (n) => String(n).padStart(2, "0");

    const formatICS = (d) =>
      `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(
        d.getUTCDate()
      )}T${pad(d.getUTCHours())}${pad(d.getUTCHours())}00Z`;

    const ics = `
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Chargers RC//Event Calendar//EN
BEGIN:VEVENT
UID:${event.id}
DTSTAMP:${formatICS(new Date())}
DTSTART:${formatICS(start)}
DTEND:${formatICS(end)}
SUMMARY:${event.name}
DESCRIPTION:${event.description || ""}
END:VEVENT
END:VCALENDAR
    `.trim();

    const blob = new Blob([ics], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `${event.name}.ics`;
    a.click();

    URL.revokeObjectURL(url);
  }

  /* ===========================
     PAGE LAYOUT
     =========================== */

  return (
    <div className="min-h-screen w-full bg-background text-text-base">

      {/* PAGE HEADER */}
      <section className="w-full border-b border-surfaceBorder bg-surface">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarDaysIcon className="h-5 w-5" style={{ color: brand }} />
            <h1 className="text-xl font-semibold tracking-tight">Event Details</h1>
          </div>

          <button
            onClick={() => navigate(`/${clubSlug}/app/events`)}
            className="flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-md border shadow-sm bg-white"
            style={{ borderColor: brand }}
          >
            <ArrowLeftIcon className="h-4 w-4" style={{ color: brand }} />
            Events
          </button>
        </div>
      </section>

      {/* MAIN CONTENT */}
      <main className="max-w-6xl mx-auto px-4 pb-16 space-y-12">

        {/* EVENT CARD */}
        <section>
          <Card className="p-6" style={{ border: `2px solid ${brand}` }}>
            <div className="flex flex-col md:flex-row gap-6 items-start">

              {/* LOGO */}
              <div className="w-32 h-32 bg-white border border-gray-200 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0">
                {logo && (
                  <img
                    src={logo}
                    alt="Event Logo"
                    className="w-full h-full object-contain"
                  />
                )}
              </div>

              {/* METADATA */}
              <div className="flex-1 space-y-3">
                <div className="text-lg font-semibold leading-snug">
                  {event.name}
                  {nominationSuffix}
                </div>

                <div className="text-sm text-text-muted leading-tight space-y-1">
                  <div>
                    <strong>Event Date:</strong> {formatDate(event.event_date)}
                  </div>
                  <div>
                    <strong>Event Type:</strong> {typeLabel}
                  </div>
                  <div>
                    <strong>Track:</strong> {track}
                  </div>
                </div>

                {/* EVENT SCHEDULE */}
                <div className="mt-4">
                  <h3 className="font-semibold mb-1">Event Schedule</h3>
                  <ul className="text-sm text-text-muted leading-tight space-y-1">
                    <li>
                      <strong>Event Opens:</strong>{" "}
                      {formatTime12(event.event_opens_at)}
                    </li>
                    <li>
                      <strong>Drivers Briefing:</strong>{" "}
                      {formatTime12(event.drivers_briefing_at)}
                    </li>
                    <li>
                      <strong>Event Closes:</strong>{" "}
                      {formatTime12(event.event_closes_at)}
                    </li>
                  </ul>
                </div>
              </div>

              {/* ACTIONS */}
              <div className="flex flex-col gap-2 md:flex-shrink-0 w-full md:w-auto">
                {!isPast && (
                  <button
                    onClick={downloadICS}
                    className="px-3 py-1.5 rounded-md font-semibold text-white text-sm self-start md:self-auto"
                    style={{ background: brand }}
                  >
                    Add to Calendar
                  </button>
                )}

                {isPast && (
                  <Link
                    to={`/${clubSlug}/app/events/${event.id}/results`}
                    className="no-underline"
                  >
                    <button
                      className="px-3 py-1.5 rounded-md font-semibold text-white text-sm self-start md:self-auto"
                      style={{ background: brand }}
                    >
                      View Results
                    </button>
                  </Link>
                )}
              </div>
            </div>

            {/* DESCRIPTION */}
            {event.description && (
              <div className="mt-6">
                <h3 className="font-semibold mb-2">Event Details</h3>
                <p className="text-text-base whitespace-pre-line leading-relaxed">
                  {event.description}
                </p>
              </div>
            )}
          </Card>
        </section>

        {/* DRIVERS ATTENDING */}
        <section>
          <h2 className="text-sm font-semibold tracking-wide uppercase text-text-muted mb-3">
            Drivers Attending
          </h2>

          <Card className="p-4" style={{ border: `2px solid ${brand}` }}>
            {loadingAttending && (
              <p className="text-text-muted">Loading drivers…</p>
            )}

            {!loadingAttending && attending.length === 0 && (
              <p className="text-text-muted">No nominations yet.</p>
            )}

            {!loadingAttending && attending.length > 0 && (
              <div className="space-y-3">
                {attending.map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center justify-between border-b border-gray-200 pb-2"
                  >
                    <div className="flex items-center gap-3">
                      {d.number && (
                        <div
                          className="w-10 h-10 rounded-md flex items-center justify-center text-white font-bold"
                          style={{ background: brand }}
                        >
                          {d.number}
                        </div>
                      )}

                      <div className="text-text-base font-medium">
                        {d.first_name} {d.last_name}
                      </div>
                    </div>

                    {d.is_junior && (
                      <span
                        className="px-2 py-1 rounded-md text-xs font-semibold"
                        style={{ background: "#8A0043", color: "white" }}
                      >
                        Junior
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </section>

        {/* EVENT RESULTS */}
        <section>
          <h2 className="text-sm font-semibold tracking-wide uppercase text-text-muted mb-3">
            Event Results
          </h2>

          <Card className="p-4" style={{ border: `2px solid ${brand}` }}>
            <p className="text-text-muted">No results posted yet.</p>
          </Card>
        </section>

        {/* NOMINATION BUTTON */}
        <section>
          {nominationsOpen ? (
            <Link
              to={`/${clubSlug}/app/events/${event.id}/nominate`}
              className="block text-center py-3 rounded-md font-semibold text-white"
              style={{ background: "#16A34A" }}
            >
              Nominate for this Event
            </Link>
          ) : (
            <div
              className="text-center py-3 rounded-md font-semibold"
              style={{ background: "#d1d5db", color: "#374151" }}
            >
              Nominations Closed
            </div>
          )}
        </section>

      </main>
    </div>
  );
}
