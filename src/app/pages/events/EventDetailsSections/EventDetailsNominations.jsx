// src/app/pages/events/EventDetailsSections/EventDetailsNominations.jsx

import { Link } from "react-router-dom";
import Button from "@/components/ui/Button";

/* ===========================
   HELPERS
   =========================== */

function formatDateTime(dt) {
  if (!dt) return "";
  const d = new Date(dt);
  return d.toLocaleString("en-AU", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function now() {
  return new Date();
}

/* ===========================
   FLATTENED COMPONENT
   =========================== */

export default function EventDetailsNominations({ event, clubSlug, brand }) {
  const open = event.nominations_open ? new Date(event.nominations_open) : null;
  const close = event.nominations_close ? new Date(event.nominations_close) : null;

  const lateClose =
    event.late_entries_enabled && event.late_entries_close
      ? new Date(event.late_entries_close)
      : null;

  const lateFee =
    event.late_entries_enabled && event.late_fee_activation
      ? new Date(event.late_fee_activation)
      : null;

  const nowTime = now();

  const nominationsNotOpenYet = open && nowTime < open;
  const nominationsOpen = open && close && nowTime >= open && nowTime <= close;
  const nominationsClosed = close && nowTime > close;

  const lateWindowActive =
    event.late_entries_enabled &&
    lateClose &&
    nowTime > close &&
    nowTime <= lateClose;

  const lateFeeActive =
    event.late_entries_enabled &&
    lateFee &&
    nowTime >= lateFee;

  /* ===========================
     BUTTON STATE
     =========================== */

  let buttonLabel = "Nominate";
  let buttonDisabled = false;

  if (nominationsNotOpenYet) {
    buttonLabel = "Nominations Not Open";
    buttonDisabled = true;
  }

  if (nominationsClosed && !lateWindowActive) {
    buttonLabel = "Nominations Closed";
    buttonDisabled = true;
  }

  if (lateWindowActive) {
    buttonLabel = "Late Nomination";
  }

  return (
    <div className="space-y-6 text-sm text-text-muted leading-tight">

      {/* INFO */}
      <div className="space-y-2">

        {open && (
          <p>
            <strong>Opens:</strong> {formatDateTime(open)}
          </p>
        )}

        {close && (
          <p>
            <strong>Closes:</strong> {formatDateTime(close)}
          </p>
        )}

        {event.late_entries_enabled && lateClose && (
          <p>
            <strong>Late Entries Close:</strong> {formatDateTime(lateClose)}
          </p>
        )}

        {event.late_entries_enabled && lateFee && (
          <p>
            <strong>Late Fee Applies From:</strong> {formatDateTime(lateFee)}
          </p>
        )}

        {/* STATUS */}
        <p className="mt-2">
          <strong>Status:</strong>{" "}
          {nominationsNotOpenYet && "Not Open"}
          {nominationsOpen && "Open"}
          {nominationsClosed && !lateWindowActive && "Closed"}
          {lateWindowActive && "Late Entry Window"}
        </p>

        {lateFeeActive && (
          <p className="text-red-600 font-medium">
            Late fee applies to new nominations.
          </p>
        )}
      </div>

      {/* BUTTONS */}
      <div className="flex flex-col gap-3">

        {/* NOMINATE BUTTON */}
        {buttonDisabled ? (
          <Button
            disabled
            className="w-full !py-2 !rounded-md font-semibold"
            style={{ backgroundColor: "#ccc", color: "#666", cursor: "not-allowed" }}
          >
            {buttonLabel}
          </Button>
        ) : (
          <Link to={`/${clubSlug}/app/events/${event.id}/nominate`} className="block w-full no-underline">
            <Button className="w-full !py-2 !rounded-md font-semibold" style={{ backgroundColor: brand, color: "white" }}>
              {buttonLabel}
            </Button>
          </Link>
        )}

        {/* VIEW NOMINATIONS */}
        <Link to={`/${clubSlug}/app/events/${event.id}/nominations`} className="block w-full no-underline">
          <Button variant="secondary" className="w-full !py-2 !rounded-md font-semibold">
            View Nominations
          </Button>
        </Link>
      </div>
    </div>
  );
}
