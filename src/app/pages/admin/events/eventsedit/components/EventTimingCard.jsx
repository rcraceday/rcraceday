import CMSInput from "@cms/CMSInput";

export default function EventTimingCard({ event, onChange }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

      {/* ROW: OPENS + BRIEFING + CLOSES */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "16px",
          alignItems: "flex-start",   // ⭐ FIX #1
        }}
      >
        <div style={{ flex: "1 1 200px" }}>
          <CMSInput
            label="Event Opens At"
            type="datetime-local"
            value={event.event_opens_at || ""}
            onChange={(v) => onChange("event_opens_at", v)}
          />
        </div>

        <div style={{ flex: "1 1 200px" }}>
          <CMSInput
            label="Drivers Briefing At"
            type="datetime-local"
            value={event.drivers_briefing_at || ""}
            onChange={(v) => onChange("drivers_briefing_at", v)}
          />
        </div>

        <div style={{ flex: "1 1 200px" }}>
          <CMSInput
            label="Event Closes At"
            type="datetime-local"
            value={event.event_closes_at || ""}
            onChange={(v) => onChange("event_closes_at", v)}
          />
        </div>
      </div>

      {/* LOCATION — FULL WIDTH */}
      <CMSInput
        label="Location"
        value={event.location || ""}
        onChange={(v) => onChange("location", v)}
      />
    </div>
  );
}
