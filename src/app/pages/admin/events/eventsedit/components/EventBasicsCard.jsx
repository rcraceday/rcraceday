import CMSInput from "@cms/CMSInput";
import CMSSelect from "@cms/CMSSelect";
import CMSTextarea from "@cms/CMSTextarea";
import CMSImageUpload from "@cms/CMSImageUpload";

export default function EventBasicsCard({
  event,
  onChange,
  onLogoChange,
  eventTypes = [],
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

      {/* EVENT NAME */}
      <div style={{ flex: "1 1 100%" }}>
        <CMSInput
          label="Event Name"
          value={event.name}
          onChange={(v) => onChange("name", v)}
        />
      </div>

      {/* 3‑COLUMN ROW: DATE / TYPE / TRACK */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "20px",
        }}
      >
        {/* EVENT DATE */}
        <div style={{ flex: "1 1 200px" }}>
          <CMSInput
            label="Event Date"
            type="date"
            value={event.event_date}
            onChange={(v) => onChange("event_date", v)}
          />
        </div>

        {/* EVENT TYPE (DYNAMIC) */}
        <div style={{ flex: "1 1 200px" }}>
          {eventTypes.length === 0 && (
            <div style={{ color: "#991B1B", fontSize: "12px", marginBottom: "4px" }}>
              No event types configured
            </div>
          )}

          <CMSSelect
            label="Event Type"
            value={event.event_type}
            onChange={(v) => onChange("event_type", v)}
            options={
              eventTypes.length > 0
                ? eventTypes.map((t) => ({
                    label: t.label,
                    value: t.value,
                  }))
                : []
            }
            placeholder="Select type..."
          />
        </div>

        {/* TRACK */}
        <div style={{ flex: "1 1 200px" }}>
          <CMSInput
            label="Track"
            value={event.track}
            onChange={(v) => onChange("track", v)}
          />
        </div>
      </div>

      {/* DESCRIPTION */}
      <div style={{ flex: "1 1 100%" }}>
        <CMSTextarea
          label="Description"
          value={event.description}
          onChange={(v) => onChange("description", v)}
        />
      </div>

      {/* LOGO UPLOAD */}
      <div style={{ flex: "1 1 100%" }}>
        <CMSImageUpload
          label="Event Logo"
          value={event.logourl}
          onChange={onLogoChange}
        />
      </div>
    </div>
  );
}
