// src/components/events/EventListItem.jsx
import { Link } from "react-router-dom";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { formatDate, TYPE_LABELS, isNominationsOpen } from "./helpers";

export default function EventListItem({ event, brand, clubSlug, isPast }) {
  const logo = event.logoUrl || event.logourl;
  const track = event.track_type || event.track;
  const type = (event.event_type || "racing").toLowerCase();
  const typeLabel = TYPE_LABELS[type];

  const nominationsOpen = isNominationsOpen(event);

  return (
    <Card
      className={`p-0 rounded-lg bg-white ${isPast ? "opacity-80" : ""}`}
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

          {/* VIEW EVENT — UPCOMING = PRIMARY, PAST = SECONDARY */}
          <Link
            to={`/${clubSlug}/app/events/${event.id}`}
            className="no-underline min-w-[120px]"
          >
            <Button
              variant={isPast ? "secondary" : "primary"}
              className="!py-1.5 !text-xs w-full"
            >
              View Event
            </Button>
          </Link>

          {/* NOMINATE — UPCOMING ONLY */}
          {!isPast && (
            <Link
              to={`/${clubSlug}/app/nominate?eventId=${event.id}`}
              className="no-underline min-w-[120px]"
            >
              <Button
                variant={nominationsOpen ? "success" : "secondary"}
                className="!py-1.5 !text-xs w-full"
              >
                Nominate
              </Button>
            </Link>
          )}

          {/* VIEW RESULTS — PAST ONLY */}
          {isPast && (
            <Link
              to={`/${clubSlug}/app/events/${event.id}/results`}
              className="no-underline min-w-[120px]"
            >
              <Button
                variant="primary"
                className="!py-1.5 !text-xs w-full"
              >
                View Results
              </Button>
            </Link>
          )}

        </div>

      </div>
    </Card>
  );
}
