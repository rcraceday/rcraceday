import EventListItem from "./EventListItem";

export default function PastEventsCard({ brand, clubSlug, events }) {
  return (
    <div className="space-y-5">

      {/* SECTION TITLE */}
      <h2 className="text-base font-semibold mb-3">Past Events</h2>

      {/* BODY */}
      <div className="space-y-8">

        {events.length === 0 && (
          <p className="text-text-muted">No past events.</p>
        )}

        {events.map((event) => (
          <EventListItem
            key={event.id}
            event={event}
            brand={brand}
            clubSlug={clubSlug}
            isPast={true}   // keeps the right‑side vertical buttons
          />
        ))}

      </div>
    </div>
  );
}
