// src/app/pages/admin/events/eventsedit/components/EventNominationsCard.jsx
import CMSInput from "@cms/CMSInput";
import CMSToggle from "@cms/CMSToggle";
import CMSButton from "@cms/CMSButton";
import { cmsLayout } from "@cms/layout";

export default function EventNominationsCard({
  event = {},
  onChange,
  onSendOpenNotifications,
  sendingOpenNotifications = false,
  canSendOpenNotifications = false,
  onSendReminderNotifications,
  sendingReminderNotifications = false,
  canSendReminderNotifications = false,
}) {
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
        Sends a lock-screen push (and optional email) when nominations open. Members must tap
        Enable push on this device in RCRaceday Settings. Phone Settings → Apps notifications
        alone will not register the device. Use the button below to resend after nominations have
        opened.
      </p>
      {canSendOpenNotifications && (
        <CMSButton
          type="button"
          disabled={sendingOpenNotifications}
          onClick={() => onSendOpenNotifications?.()}
        >
          {sendingOpenNotifications ? "Sending…" : "Send open notifications now"}
        </CMSButton>
      )}

      <CMSToggle
        label="Nomination reminder"
        checked={!!event.notify_nominations_reminder}
        onChange={(v) => {
          update("notify_nominations_reminder", v);
          if (!v) {
            update("nominations_reminder_at", "");
            update("nominations_reminder_message", "");
          }
        }}
      />
      {!!event.notify_nominations_reminder && (
        <>
          <CMSInput
            name="nominations_reminder_at"
            label="Reminder date & time"
            type="datetime-local"
            value={event.nominations_reminder_at || ""}
            onChange={(v) => update("nominations_reminder_at", v)}
          />
          <CMSInput
            name="nominations_reminder_message"
            label="Short message"
            type="textarea"
            maxLength={160}
            value={event.nominations_reminder_message || ""}
            onChange={(v) => update("nominations_reminder_message", String(v).slice(0, 160))}
          />
          <p style={{ fontSize: 12, color: "#6b7280", margin: 0 }}>
            {(event.nominations_reminder_message || "").length}/160. Sent only to members who have
            not nominated for this event yet.
          </p>
          {canSendReminderNotifications && (
            <CMSButton
              type="button"
              disabled={sendingReminderNotifications}
              onClick={() => onSendReminderNotifications?.()}
            >
              {sendingReminderNotifications ? "Sending…" : "Send reminder now"}
            </CMSButton>
          )}
        </>
      )}

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
