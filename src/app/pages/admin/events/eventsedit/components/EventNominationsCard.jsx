// src/app/pages/admin/events/eventsedit/components/EventNominationsCard.jsx
import CMSInput from "@cms/CMSInput";
import CMSToggle from "@cms/CMSToggle";
import { cmsLayout } from "@cms/layout";

export default function EventNominationsCard({ event = {}, onChange }) {
  const isMulti = !!event.is_multi_day;

  const days = Array.isArray(event.days)
    ? event.days.map((d) => (typeof d === "string" ? { date: d, label: "" } : d))
    : [];

  const update = (field, value) => {
    onChange(field, value);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: cmsLayout.spacing.lg }}>

      {/* NOMINATIONS OPEN / CLOSE */}
      <div style={cmsLayout.row}>
        <div style={cmsLayout.column}>
          <CMSInput
            label="Nominations Open"
            type="datetime-local"
            value={event.nominations_open || ""}
            onChange={(v) => update("nominations_open", v)}
          />
        </div>

        <div style={cmsLayout.column}>
          <CMSInput
            label="Nominations Close"
            type="datetime-local"
            value={event.nominations_close || ""}
            onChange={(v) => update("nominations_close", v)}
          />
        </div>
      </div>

      {/* LATE ENTRIES */}
      <div style={{ display: "flex", flexDirection: "column", gap: cmsLayout.spacing.md }}>
        <CMSToggle
          label="Allow Late Entries"
          checked={!!event.late_entries_enabled}
          onChange={(v) => update("late_entries_enabled", v)}
        />

        {event.late_entries_enabled && (
          <>
            <CMSInput
              label="Late Fee Activation (optional)"
              type="datetime-local"
              value={event.late_fee_activation || ""}
              onChange={(v) => update("late_fee_activation", v)}
            />

            <CMSInput
              label="Late Entries Close (optional)"
              type="datetime-local"
              value={event.late_entries_close || ""}
              onChange={(v) => update("late_entries_close", v)}
            />
          </>
        )}
      </div>

      {/* MULTI-DAY DISPLAY */}
      {isMulti && days.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: cmsLayout.spacing.md }}>
          <div style={{ fontWeight: 600 }}>Per-day nomination days</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {days.map((d, i) => (
              <div
                key={i}
                style={{
                  padding: "6px 10px",
                  borderRadius: 6,
                  background: "#F3F4F6",
                  color: "#111827",
                  fontSize: 13,
                }}
              >
                {d.label ? `${d.label} — ${d.date}` : d.date}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
