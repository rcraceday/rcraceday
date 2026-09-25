import CMSInput from "@cms/CMSInput";
import { cmsLayout } from "@cms/layout";

function daysBeforeValue(value) {
  return value == null || value === "" ? "" : String(value);
}

export default function NominationsTimingDefaultsFields({
  nominations,
  onChange,
  showLateEntryTiming = false,
  lateOnly = false,
}) {
  const n = nominations || {};

  const setField = (field, value) => {
    onChange({ ...n, [field]: value });
  };

  const setDaysBefore = (field, raw) => {
    if (raw === "") {
      setField(field, null);
      return;
    }
    const num = Math.max(0, Number(raw));
    setField(field, Number.isNaN(num) ? null : num);
  };

  const showOpenClose = !lateOnly;
  const showLate = lateOnly || showLateEntryTiming;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: cmsLayout.spacing.lg }}>
      {showOpenClose && (
      <div>
        <div style={{ fontSize: "13px", fontWeight: 600, marginBottom: 8 }}>Nominations open</div>
        <div style={cmsLayout.row}>
          <div style={{ width: 200 }}>
            <CMSInput
              type="number"
              label="Days before event date"
              value={daysBeforeValue(n.open_days_before)}
              onChange={(v) => setDaysBefore("open_days_before", v)}
              placeholder="e.g. 14"
            />
          </div>
          <div style={{ width: 160 }}>
            <CMSInput
              type="time"
              label="Time"
              value={n.open_time || ""}
              onChange={(v) => setField("open_time", v)}
            />
          </div>
        </div>
      </div>
      )}

      {showOpenClose && (
      <div>
        <div style={{ fontSize: "13px", fontWeight: 600, marginBottom: 8 }}>Nominations close</div>
        <div style={cmsLayout.row}>
          <div style={{ width: 200 }}>
            <CMSInput
              type="number"
              label="Days before event date"
              value={daysBeforeValue(n.close_days_before)}
              onChange={(v) => setDaysBefore("close_days_before", v)}
              placeholder="e.g. 1"
            />
          </div>
          <div style={{ width: 160 }}>
            <CMSInput
              type="time"
              label="Time"
              value={n.close_time || ""}
              onChange={(v) => setField("close_time", v)}
            />
          </div>
        </div>
      </div>
      )}

      {showLate && (
        <>
          <div>
            <div style={{ fontSize: "13px", fontWeight: 600, marginBottom: 8 }}>
              Late fee activation
            </div>
            <div style={cmsLayout.row}>
              <div style={{ width: 200 }}>
                <CMSInput
                  type="number"
                  label="Days before event date"
                  value={daysBeforeValue(n.late_fee_activation_days_before)}
                  onChange={(v) => setDaysBefore("late_fee_activation_days_before", v)}
                  placeholder="e.g. 0"
                />
              </div>
              <div style={{ width: 160 }}>
                <CMSInput
                  type="time"
                  label="Time"
                  value={n.late_fee_activation_time || ""}
                  onChange={(v) => setField("late_fee_activation_time", v)}
                />
              </div>
            </div>
          </div>

          <div>
            <div style={{ fontSize: "13px", fontWeight: 600, marginBottom: 8 }}>
              Late entries close
            </div>
            <div style={cmsLayout.row}>
              <div style={{ width: 200 }}>
                <CMSInput
                  type="number"
                  label="Days before event date"
                  value={daysBeforeValue(n.late_entries_close_days_before)}
                  onChange={(v) => setDaysBefore("late_entries_close_days_before", v)}
                  placeholder="e.g. 0"
                />
              </div>
              <div style={{ width: 160 }}>
                <CMSInput
                  type="time"
                  label="Time"
                  value={n.late_entries_close_time || ""}
                  onChange={(v) => setField("late_entries_close_time", v)}
                />
              </div>
            </div>
          </div>
        </>
      )}

      {!lateOnly && (
      <div style={{ fontSize: "12px", color: "#6B7280", maxWidth: 520 }}>
        Countdown is from the event&apos;s first day (single-day date or earliest multi-day
        date). New events copy these into nomination and late-entry fields; each event can still
        change them later.
      </div>
      )}
    </div>
  );
}
