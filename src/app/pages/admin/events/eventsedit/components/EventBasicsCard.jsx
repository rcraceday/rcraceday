// src/app/pages/admin/events/eventsedit/components/EventBasicsCard.jsx
import { useEffect } from "react";
import CMSInput from "@cms/CMSInput";
import CMSSelect from "@cms/CMSSelect";
import CMSTextarea from "@cms/CMSTextarea";
import CMSToggle from "@cms/CMSToggle";

import { AddButton, DeleteButton } from "@cms/CMSButtonSet";
import { cmsLayout } from "@cms/layout";
import LogoPicker from "../../../components/LogoPicker";


export default function EventBasicsCard({
  event,
  onChange,
  eventTypes = [],
  tracks = [],
}) {
  const isMulti = !!event.is_multi_day;

  const days = Array.isArray(event.days)
    ? event.days.map((d) => (typeof d === "string" ? { date: d, label: "" } : d))
    : [];

  useEffect(() => {
    // If there's exactly one track available and the event has no track set,
    // ensure the track is present in the form immediately.
    if (tracks.length === 1 && (event.track == null || event.track === "")) {
      onChange("track", tracks[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tracks]);

  const addDay = () => {
    onChange("days", [...days, { date: "", label: "" }]);
  };

  const updateDayDate = (i, value) => {
    const next = [...days];
    next[i].date = value;
    onChange("days", next);
  };

  const updateDayLabel = (i, value) => {
    const next = [...days];
    next[i].label = value;
    onChange("days", next);
  };

  const removeDay = (i) => {
    const next = [...days];
    next.splice(i, 1);
    onChange("days", next);
  };

  const safeDescription =
    typeof event.description === "string"
      ? event.description
      : event.description?.value ||
        event.description?.text ||
        event.description?.richText ||
        "";

  const trackOptions = tracks.map((t) => ({
    label: t.name,
    value: t.id,
  }));

  // helper to render label text with a red asterisk when required
  const requiredLabel = (text) => (
    <span>
      {text} <span style={{ color: "#DC2626" }}>*</span>
    </span>
  );

  // Build prefix for logos so each club's logos are grouped
  const logoPrefix = event.club_id ? `${event.club_id}/event-logos` : "";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: cmsLayout.spacing.lg,
      }}
    >
      <CMSInput
        label={requiredLabel("Event Name")}
        value={event.name || ""}
        onChange={(value) => onChange("name", value)}
        required
      />

      <CMSToggle
        label="Multi-Day Event?"
        checked={isMulti}
        onChange={(checked) => {
          onChange("is_multi_day", checked);

          if (!checked) {
            const first = days[0]?.date || event.event_date || "";
            onChange("event_date", first);
            onChange("days", []);
          } else {
            const first = event.event_date || "";
            onChange("days", first ? [{ date: first, label: "" }] : []);
          }
        }}
      />

      {!isMulti && (
        <CMSInput
          label={requiredLabel("Event Date")}
          type="date"
          value={event.event_date || ""}
          onChange={(value) => onChange("event_date", value)}
          required
        />
      )}

      {isMulti && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: cmsLayout.spacing.md,
            padding: "12px",
            border: "1px solid #E5E7EB",
            borderRadius: "8px",
            background: "#FAFAFA",
          }}
        >
          <div style={{ fontWeight: 600 }}>Event Days</div>

          {days.length === 0 && <div style={cmsLayout.muted}>No days added yet.</div>}

          {days.map((day, i) => (
            <div key={i} style={cmsLayout.row}>
              <div style={cmsLayout.column}>
                <CMSInput
                  label={requiredLabel(`Day ${i + 1} Date`)}
                  type="date"
                  value={day.date || ""}
                  onChange={(value) => updateDayDate(i, value)}
                  required
                />

                <CMSInput
                  label={`Day ${i + 1} Name`}
                  value={day.label || ""}
                  onChange={(value) => updateDayLabel(i, value)}
                />
              </div>

              <DeleteButton onClick={() => removeDay(i)}>Remove</DeleteButton>
            </div>
          ))}

          <AddButton onClick={addDay}>Add Day</AddButton>
        </div>
      )}

      <CMSSelect
        label={requiredLabel("Event Type")}
        value={event.event_type || ""}
        onChange={(value) => onChange("event_type", value)}
        options={eventTypes.map((t) => ({
          label: t.label,
          value: t.value,
        }))}
        placeholder="Select type..."
        required
      />

      {/* Track: always visible. If only one track, ensure it's selected and show as read-only */}
      {tracks.length === 1 ? (
        <div>
          <label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>
            {requiredLabel("Track")}
          </label>
          <div
            style={{
              padding: "8px 12px",
              border: "1px solid #E5E7EB",
              borderRadius: "6px",
              background: "#F9FAFB",
              color: "#111827",
            }}
          >
            {trackOptions[0]?.label || "Track"}
          </div>
          {/* Hidden input to ensure form libraries/readers can see the value */}
          <input type="hidden" value={event.track || trackOptions[0]?.value || ""} />
        </div>
      ) : (
        <CMSSelect
          label={requiredLabel("Track")}
          value={event.track || ""}
          options={trackOptions}
          placeholder="Select track..."
          onChange={(value) => onChange("track", value)}
          required
        />
      )}

      <CMSTextarea
        label="Description"
        value={safeDescription}
        onChange={(value) => onChange("description", value)}
      />

      {/* Shared LogoPicker (lists bucket files and supports upload) */}
      <div>
        <label style={{ display: "block", marginBottom: 6, fontWeight: 600 }}>Event Logo</label>
        <LogoPicker
          bucketName="club-assets"
          prefix={logoPrefix}
          value={event.logourl || ""}
          useSignedUrls={false}
          onSelect={(filePath, publicUrl) => {
            // store the storage path in logourl; keep preview url separately if desired
            onChange("logourl", filePath);
            onChange("logo_preview_url", publicUrl || null);
          }}
          onUpload={(filePath, publicUrl) => {
            onChange("logourl", filePath);
            onChange("logo_preview_url", publicUrl || null);
          }}
        />
      </div>
    </div>
  );
}
