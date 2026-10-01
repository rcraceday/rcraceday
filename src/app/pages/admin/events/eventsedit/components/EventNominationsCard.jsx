// src/app/pages/admin/events/eventsedit/components/EventNominationsCard.jsx
import CMSInput from "@cms/CMSInput";
import CMSToggle from "@cms/CMSToggle";
import CMSButton from "@cms/CMSButton";
import { cmsLayout } from "@cms/layout";
import { useTranslation } from "@/app/i18n/I18nContext";

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
  const { t } = useTranslation();
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
            labelKey="cms.nominationsOpen"
            type="datetime-local"
            value={event.nominations_open || ""}
            onChange={(v) => update("nominations_open", v)}
          />
        </div>

        <div style={cmsLayout.column}>
          <CMSInput
            name="nominations_close"
            labelKey="cms.nominationsClose"
            type="datetime-local"
            value={event.nominations_close || ""}
            onChange={(v) => update("nominations_close", v)}
          />
        </div>
      </div>

      <CMSToggle
        labelKey="cms.notifyNominationsOpen"
        checked={!!event.notify_nominations_open}
        onChange={(v) => update("notify_nominations_open", v)}
      />
      <p style={{ fontSize: 12, color: "#6b7280", margin: 0 }}>
        {t("admin.events.notifyOpenHelp")}
      </p>
      {canSendOpenNotifications && (
        <CMSButton
          type="button"
          disabled={sendingOpenNotifications}
          onClick={() => onSendOpenNotifications?.()}
        >
          {sendingOpenNotifications ? t("cms.saving") : t("admin.events.sendOpenNotificationsNow")}
        </CMSButton>
      )}

      <CMSToggle
        labelKey="cms.nominationReminder"
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
            labelKey="cms.reminderDateTime"
            type="datetime-local"
            value={event.nominations_reminder_at || ""}
            onChange={(v) => update("nominations_reminder_at", v)}
          />
          <CMSInput
            name="nominations_reminder_message"
            labelKey="cms.shortMessage"
            type="textarea"
            maxLength={160}
            value={event.nominations_reminder_message || ""}
            onChange={(v) => update("nominations_reminder_message", String(v).slice(0, 160))}
          />
          <p style={{ fontSize: 12, color: "#6b7280", margin: 0 }}>
            {t("admin.events.reminderCharCount", {
              count: (event.nominations_reminder_message || "").length,
            })}
          </p>
          {canSendReminderNotifications && (
            <CMSButton
              type="button"
              disabled={sendingReminderNotifications}
              onClick={() => onSendReminderNotifications?.()}
            >
              {sendingReminderNotifications ? t("cms.saving") : t("admin.events.sendReminderNow")}
            </CMSButton>
          )}
        </>
      )}

      {/* LATE ENTRIES */}
      <div style={{ display: "flex", flexDirection: "column", gap: cmsLayout.spacing.md }}>
        <CMSToggle
          labelKey="cms.allowLateEntries"
          checked={!!event.late_entries_enabled}
          onChange={(v) => update("late_entries_enabled", v)}
        />

        {event.late_entries_enabled && (
          <>
            <CMSInput
              name="late_fee_activation"
              labelKey="cms.lateFeeActivationOptional"
              type="datetime-local"
              value={event.late_fee_activation || ""}
              onChange={(v) => update("late_fee_activation", v)}
            />

            <CMSInput
              name="late_entries_close"
              labelKey="cms.lateEntriesCloseOptional"
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
