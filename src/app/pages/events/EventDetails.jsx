// src/app/pages/events/EventDetails.jsx

/* ===========================
   IMPORTS
   =========================== */

import { useParams, Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/supabaseClient";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
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

          <Button
  variant="secondary"
  className="!py-1 !px-3 !text-xs !rounded-sm flex items-center gap-1"
  onClick={() => navigate(`/${clubSlug}/app/events`)}
>
  <ArrowLeftIcon className="h-3 w-3" />
  Back
</Button>
        </div>
      </section>

      {/* MAIN CONTENT */}
                  <main className="max-w-3xl mx-auto px-4 flex-col items-center">


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

              {/* ACTIONS — UPDATED */}
              <div className="flex flex-col gap-2 md:flex-shrink-0 w-full md:w-auto">

                {/* NOMINATE BUTTON (TOP RIGHT) */}
                {nominationsOpen && (
                  <Link
                    to={`/${clubSlug}/app/events/${event.id}/nominate`}
                    className="no-underline min-w-[120px]"
                  >
                    <Button
                      variant="success"
                      className="!py-1.5 !text-xs w-full"
                    >
                      Nominate
                    </Button>
                  </Link>
                )}

                {/* ADD TO CALENDAR — SECONDARY */}
                <Button
                  variant="secondary"
                  onClick={downloadICS}
                  className="!py-1.5 !text-xs w-full min-w-[120px]"
                >
                  Add to Calendar
                </Button>

                {/* VIEW NOMINATIONS — PRIMARY */}
                <Link
                  to={`/${clubSlug}/app/events/${event.id}/nominations`}
                  className="no-underline min-w-[120px]"
                >
                  <Button
                    variant="primary"
                    className="!py-1.5 !text-xs w-full"
                  >
                    View Nominations
                  </Button>
                </Link>

                {/* SEND NOTIFICATION — SECONDARY */}
                <Link
                  to={`/${clubSlug}/app/events/${event.id}/notify`}
                  className="no-underline min-w-[120px]"
                >
                  <Button
                    variant="secondary"
                    className="!py-1.5 !text-xs w-full"
                  >
                    Send Notification
                  </Button>
                </Link>

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

        {/* REMOVED: DRIVERS ATTENDING */}
        {/* REMOVED: EVENT RESULTS */}
        {/* REMOVED: NOMINATION BUTTON */}

      </main>
    </div>
  );
}
