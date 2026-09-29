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
            name="nominations_open"
            label="Nominations Open"
            type="datetime-local"
            value={event.nominations_open || ""}
            onChange={(v) => update("nominations_open", v)}
          />
        </div>

        <div style={cmsLayout.column}>
          <CMSInput
            name="nominations_close"
            label="Nominations Close"
            type="datetime-local"
            value={event.nominations_close || ""}
            onChange={(v) => update("nominations_close", v)}
          />
        </div>
      </div>

      <CMSToggle
        label="Notify when nominations open"
        checked={!!event.notify_nominations_open}
        onChange={(v) => update("notify_nominations_open", v)}
      />
      <p style={{ fontSize: 12, color: "#6b7280", margin: 0 }}>
        Sends in-app, push, and email when nominations open, even if members turned notifications off in
        settings.
      </p>

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
              name="late_fee_activation"
              label="Late Fee Activation (optional)"
              type="datetime-local"
              value={event.late_fee_activation || ""}
              onChange={(v) => update("late_fee_activation", v)}
            />

            <CMSInput
              name="late_entries_close"
              label="Late Entries Close (optional)"
              type="datetime-local"
              value={event.late_entries_close || ""}
              onChange={(v) => update("late_entries_close", v)}
            />
          </>
        )}
      </div>
    </div>
  );
}
