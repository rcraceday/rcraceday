import EventListItem from "./EventListItem";

export default function UpcomingEventsCard({
  brand,
  clubSlug,
  loading,
  events,
}) {
  return (
    <div className="space-y-5">

      {/* SECTION TITLE */}
            <h2 className="text-base font-semibold">Upcoming Events</h2>

      {/* BODY */}
      <div className="space-y-8">

        {loading && <p className="text-text-muted">Loading events…</p>}

        {!loading && events.length === 0 && (
          <p className="text-text-muted">No upcoming events.</p>
        )}

        {!loading &&
          events.map((event) => (
            <EventListItem
              key={event.id}
              event={event}
              brand={brand}
              clubSlug={clubSlug}
              isPast={false}
            />
          ))}

      </div>
    </div>
  );
}
