import { Link } from "react-router-dom";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { formatDate, TYPE_LABELS, isNominationsOpen } from "./events-sections/helpers";

export default function EventCard({ event, clubSlug, trackNames, showResults }) {
  const track =
    trackNames?.[event.track] ||
    event.track_type ||
    event.track ||
    "Track not set";
  const logoSrc = event.logo_preview_url ||
    (event.logourl?.startsWith("http")
      ? event.logourl
      : event.logourl
        ? `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/club-assets/${event.logourl}`
        : null);
  const type = (event.event_type || "racing").toLowerCase();
  const typeLabel = TYPE_LABELS[type] || event.event_type || "Event";
  const scheduledDays = [
    ...(Array.isArray(event.classes_by_day) ? event.classes_by_day : []),
    ...(Array.isArray(event.days) ? event.days : []),
  ];
  const scheduledDates = scheduledDays
    .map((day) => day?.date)
    .filter((date) => date && !Number.isNaN(new Date(date).getTime()))
    .sort();
  const eventDate = event.event_date || scheduledDates[0] || null;
  const eventEndDate = scheduledDates.at(-1) || eventDate;
  const formatRangeDate = (date) => {
    const localDate = new Date(`${date.slice(0, 10)}T12:00:00`);
    const day = localDate.getDate();
    const suffix = [11, 12, 13].includes(day % 100)
      ? "th"
      : ["th", "st", "nd", "rd"][day % 10] || "th";
    const weekday = localDate.toLocaleDateString("en-US", { weekday: "short" });
    const month = localDate.toLocaleDateString("en-US", { month: "short" });

    return `${weekday} ${month} ${day}${suffix}`;
  };
  const eventDateLabel = event.is_multi_day && eventDate
    ? eventDate === eventEndDate
      ? formatRangeDate(eventDate)
      : `${formatRangeDate(eventDate)} - ${formatRangeDate(eventEndDate)}`
    : eventDate
      ? formatDate(eventDate)
      : "Date TBD";
  const nominationsOpen = isNominationsOpen(event);
  const nominationLabel = nominationsOpen
    ? "Nominations Open"
    : event.nominations_open
      ? `Nominations Open: ${formatDate(event.nominations_open)}`
      : null;

  return (
    <Card className="!p-0 overflow-hidden">
      <div className="flex flex-col md:flex-row md:items-stretch">
        <Link
          to={`/${clubSlug}/app/events/${event.id}`}
          className="block min-w-0 flex-1 no-underline"
        >
          <div className="flex min-h-[76px] items-stretch">
            <div className="my-[3px] ml-[3px] w-24 shrink-0 overflow-hidden rounded-[14px] bg-white p-[6px_14px] flex items-center justify-center">
              {logoSrc ? (
                <img
                  src={logoSrc}
                  alt=""
                  className="max-h-full max-w-full rounded-[10px] object-contain"
                />
              ) : (
                <span className="text-xs text-text-muted">Event</span>
              )}
            </div>

            <div className="min-w-0 flex-1 pl-5 pr-3 py-2">
              <h3 className="break-words font-semibold leading-tight text-text-base">
                {event.name}
              </h3>
              <p className="flex flex-wrap min-w-0 items-center gap-x-1.5 gap-y-0.5 text-sm font-semibold leading-tight text-text-muted">
                <span className="min-w-0 truncate max-w-full">{track}</span>
                <span aria-hidden="true">•</span>
                <span className="shrink-0">{eventDateLabel}</span>
                <span aria-hidden="true">•</span>
                <span className="shrink-0">{typeLabel}</span>
                {nominationLabel && (
                  <>
                    <span aria-hidden="true">•</span>
                    <span
                      className={`min-w-0 break-words font-bold ${
                        nominationsOpen ? "text-green-600" : ""
                      }`}
                    >
                      {nominationLabel}
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>
        </Link>

        <div className="box-border grid w-full grid-cols-1 justify-items-center gap-2 px-0 py-3 md:flex md:w-auto md:flex-col md:items-stretch md:justify-start md:p-3 md:pl-0">
          <Link
            to={`/${clubSlug}/app/events/${event.id}`}
            className="block w-[120px] justify-self-center no-underline"
          >
            <Button className="!py-1.5 !text-xs w-full">View Event</Button>
          </Link>
          {nominationsOpen && (
            <Link
              to={`/${clubSlug}/app/nominate?eventId=${event.id}`}
              className="block w-[120px] justify-self-center no-underline"
            >
              <Button variant="success" className="!py-1.5 !text-xs w-full">
                Nominate
              </Button>
            </Link>
          )}
          {showResults && (
            <Link
              to={`/${clubSlug}/app/events/${event.id}/results`}
              className="block w-[120px] justify-self-center no-underline"
            >
              <Button className="!py-1.5 !text-xs w-full">View Results</Button>
            </Link>
          )}
        </div>
      </div>
    </Card>
  );
}
