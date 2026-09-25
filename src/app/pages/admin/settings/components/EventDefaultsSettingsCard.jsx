import { useEffect, useState } from "react";
import { supabase } from "@/supabaseClient";
import CMSCard from "@cms/CMSCard";
import CMSSelect from "@cms/CMSSelect";
import CMSInput from "@cms/CMSInput";
import CMSToggle from "@cms/CMSToggle";
import CMSButton from "@cms/CMSButton";
import { cmsLayout } from "@cms/layout";
import EventPricingCard from "@app/pages/admin/events/eventsedit/components/EventPricingCard";
import EventTimingCard from "@app/pages/admin/events/eventsedit/components/EventTimingCard";
import NominationsTimingDefaultsFields from "@app/pages/admin/events/eventsedit/components/NominationsTimingDefaultsFields";
import {
  emptyEventDefaults,
  getTrackDefaults,
  mergeTrackDefaults,
} from "@app/pages/admin/events/eventDefaults";

const bannerStyle = (kind) => ({
  padding: "12px 16px",
  borderRadius: "6px",
  backgroundColor: kind === "error" ? "#FEE2E2" : "#DCFCE7",
  color: kind === "error" ? "#991B1B" : "#166534",
  fontSize: "14px",
});

const missingDefaultsMessage =
  "Event type defaults column is missing. Run scripts/add-event-type-defaults.sql in Supabase.";

export default function EventDefaultsSettingsCard({ club }) {
  const [eventTypes, setEventTypes] = useState([]);
  const [tracks, setTracks] = useState([]);
  const [trackClasses, setTrackClasses] = useState([]);
  const [selectedTypeId, setSelectedTypeId] = useState("");
  const [selectedTrackId, setSelectedTrackId] = useState("");
  const [form, setForm] = useState(emptyEventDefaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    if (!club?.id) return;

    let mounted = true;

    async function load() {
      setLoading(true);
      setError(null);

      const [
        { data: types, error: typesError },
        { data: trackRows, error: trackError },
      ] = await Promise.all([
        supabase
          .from("club_event_types")
          .select("*, defaults")
          .eq("club_id", club.id)
          .order("sort_order", { ascending: true }),
        supabase
          .from("club_tracks")
          .select("*")
          .eq("club_id", club.id)
          .order("name", { ascending: true }),
      ]);

      if (!mounted) return;

      if (typesError || trackError) {
        setError(
          typesError?.message?.includes("defaults")
            ? missingDefaultsMessage
            : "Failed to load event types or tracks."
        );
        setLoading(false);
        return;
      }

      const nextTypes = types || [];
      const nextTracks = trackRows || [];
      setEventTypes(nextTypes);
      setTracks(nextTracks);

      const firstType = nextTypes[0];
      const firstTrack = nextTracks[0];
      const typeId = firstType?.id || "";
      const trackId = firstTrack?.id || "";

      setSelectedTypeId(typeId);
      setSelectedTrackId(trackId);

      if (firstType && trackId) {
        setForm(getTrackDefaults(firstType, trackId));
      }

      setLoading(false);
    }

    load();

    return () => {
      mounted = false;
    };
  }, [club?.id]);

  useEffect(() => {
    if (!selectedTrackId) {
      setTrackClasses([]);
      return;
    }

    let mounted = true;

    async function loadTrackClasses() {
      const { data } = await supabase
        .from("club_track_classes")
        .select(
          `
          class_id,
          club_classes (
            id,
            name,
            description,
            order_index
          )
        `
        )
        .eq("track_id", selectedTrackId)
        .order("order_index", { foreignTable: "club_classes" });

      if (!mounted) return;

      setTrackClasses((data || []).map((row) => row.club_classes).filter(Boolean));
    }

    loadTrackClasses();

    return () => {
      mounted = false;
    };
  }, [selectedTrackId]);

  const selectedType = eventTypes.find((t) => t.id === selectedTypeId);

  const loadCombo = (typeId, trackId) => {
    const nextType = eventTypes.find((t) => t.id === typeId);
    setForm(getTrackDefaults(nextType, trackId));
    setStatus(null);
    setError(null);
  };

  const handleTypeChange = (typeId) => {
    setSelectedTypeId(typeId);
    loadCombo(typeId, selectedTrackId);
  };

  const handleTrackChange = (trackId) => {
    setSelectedTrackId(trackId);
    loadCombo(selectedTypeId, trackId);
  };

  const handleFieldChange = (field, value) => {
    setForm((prev) => {
      if (field === "days") {
        const day = Array.isArray(value) ? value[0] || {} : {};
        return {
          ...prev,
          timing: {
            gates_open_at: day.gates_open_at || "",
            practice_at: day.practice_at || "",
            drivers_brief_at: day.drivers_brief_at || "",
            race_start_at: day.race_start_at || "",
            label: day.label || "",
          },
        };
      }

      return { ...prev, [field]: value };
    });
    setStatus(null);
  };

  const handleSave = async () => {
    if (!selectedTypeId || !selectedTrackId || saving) return;

    setSaving(true);
    setError(null);
    setStatus(null);

    const payload = mergeTrackDefaults(
      selectedType?.defaults,
      selectedTrackId,
      form
    );

    const { data: saved, error: saveError } = await supabase
      .from("club_event_types")
      .update({ defaults: payload })
      .eq("id", selectedTypeId)
      .eq("club_id", club.id)
      .select("id, defaults")
      .maybeSingle();

    setSaving(false);

    if (saveError) {
      setError(
        saveError.message?.includes("defaults")
          ? missingDefaultsMessage
          : saveError.message || "Failed to save event defaults."
      );
      return;
    }

    if (!saved) {
      setError(
        "Save completed but defaults were not stored. Run scripts/add-event-type-defaults.sql and confirm club admins can update club_event_types."
      );
      return;
    }

    const savedDefaults = saved.defaults || payload;

    setEventTypes((prev) =>
      prev.map((t) => (t.id === selectedTypeId ? { ...t, defaults: savedDefaults } : t))
    );
    setForm(getTrackDefaults({ defaults: savedDefaults }, selectedTrackId));
    setStatus(
      "Defaults saved. New events with this type and track will use these values."
    );
  };

  if (loading) {
    return (
      <CMSCard>
        <div style={{ padding: "8px 0", color: "#6B7280" }}>Loading event defaults…</div>
      </CMSCard>
    );
  }

  if (!eventTypes.length) {
    return (
      <CMSCard>
        <div style={{ color: "#6B7280", fontSize: "14px" }}>
          No event types found for this club. Add event types before setting defaults.
        </div>
      </CMSCard>
    );
  }

  if (!tracks.length) {
    return (
      <CMSCard>
        <div style={{ color: "#6B7280", fontSize: "14px" }}>
          No tracks found for this club. Add a track before setting defaults.
        </div>
      </CMSCard>
    );
  }

  const eventForCards = {
    ...form,
    available_classes: trackClasses,
    is_multi_day: false,
    days: [
      {
        date: "",
        label: form.timing?.label || "",
        gates_open_at: form.timing?.gates_open_at || "",
        practice_at: form.timing?.practice_at || "",
        drivers_brief_at: form.timing?.drivers_brief_at || "",
        race_start_at: form.timing?.race_start_at || "",
      },
    ],
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: cmsLayout.spacing.xl }}>
      {error && <div style={bannerStyle("error")}>{error}</div>}
      {status && <div style={bannerStyle("success")}>{status}</div>}

      <CMSCard title="Type & Track">
        <CMSSelect
          label="Event Type"
          value={selectedTypeId}
          onChange={handleTypeChange}
          options={eventTypes.map((t) => ({
            label: t.label || t.name || t.value,
            value: t.id,
          }))}
          placeholder="Select event type…"
          sortOptions={false}
        />

        <CMSSelect
          label="Track"
          value={selectedTrackId}
          onChange={handleTrackChange}
          options={tracks.map((t) => ({
            label: t.name,
            value: t.id,
          }))}
          placeholder="Select track…"
          sortOptions={false}
        />

        <div style={{ fontSize: "13px", color: "#6B7280" }}>
          Defaults are stored per event type and track. New events copy these values
          when both are selected. Existing events are not changed.
        </div>
      </CMSCard>

      <CMSCard title="Event Timing">
        <div style={{ fontSize: "12px", color: "#6B7280", marginBottom: 4 }}>
          Default gates, practice, briefing, and race-start times. Dates are set on
          each event.
        </div>
        <EventTimingCard event={eventForCards} onChange={handleFieldChange} />
      </CMSCard>

      <CMSCard title="Limits & Behaviour">
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <div style={{ width: 220 }}>
            <CMSInput
              type="number"
              label="Max Entries Per Event"
              value={form.class_limit == null ? "" : String(form.class_limit)}
              onChange={(v) =>
                handleFieldChange("class_limit", v === "" ? null : Math.max(0, Number(v)))
              }
            />
          </div>
          <div style={{ width: 220 }}>
            <CMSInput
              type="number"
              label="Max Classes Per Day"
              value={
                form.class_limit_per_day == null ? "" : String(form.class_limit_per_day)
              }
              onChange={(v) =>
                handleFieldChange(
                  "class_limit_per_day",
                  v === "" ? null : Math.max(0, Number(v))
                )
              }
            />
          </div>
        </div>

        <CMSToggle
          label="Published by default"
          checked={!!form.is_published}
          onChange={(v) => handleFieldChange("is_published", v)}
        />

        <CMSToggle
          label="Requires RCRA club affiliation"
          checked={!!form.requires_rcra_club}
          onChange={(v) => handleFieldChange("requires_rcra_club", v)}
        />

        <CMSToggle
          label="Preferences Allowed"
          checked={!!form.preference_enabled}
          onChange={(v) => handleFieldChange("preference_enabled", v)}
        />

        {form.preference_enabled && (
          <div style={{ width: 220 }}>
            <CMSInput
              type="number"
              label="Preference Limit"
              value={form.preference_limit == null ? "" : String(form.preference_limit)}
              onChange={(v) =>
                handleFieldChange(
                  "preference_limit",
                  v === "" ? null : Math.max(0, Number(v))
                )
              }
            />
          </div>
        )}

        <div style={{ width: 220 }}>
          <CMSInput
            type="number"
            label="Class Minimum Entries"
            value={
              form.class_minimum_entries == null ? "" : String(form.class_minimum_entries)
            }
            onChange={(v) =>
              handleFieldChange(
                "class_minimum_entries",
                v === "" ? null : Math.max(0, Number(v))
              )
            }
            placeholder="e.g. 6"
          />
        </div>
        <div style={{ fontSize: "12px", color: "#6B7280", maxWidth: 520 }}>
          Minimum nominations a class needs before it is treated as included in the event.
          Shown on the public nominations dashboard until the threshold is met.
        </div>

        <CMSToggle
          label="If minimum not met, entries still added to LiveTime"
          checked={!!form.class_minimum_livetime_when_unmet}
          onChange={(v) => handleFieldChange("class_minimum_livetime_when_unmet", v)}
        />
      </CMSCard>

      <CMSCard title="Nominations">
        <NominationsTimingDefaultsFields
          nominations={form.nominations}
          onChange={(nominations) => handleFieldChange("nominations", nominations)}
        />

        <CMSToggle
          label="Allow Late Entries"
          checked={!!form.late_entries_enabled}
          onChange={(v) => handleFieldChange("late_entries_enabled", v)}
        />

        {form.late_entries_enabled && (
          <NominationsTimingDefaultsFields
            nominations={form.nominations}
            onChange={(nominations) => handleFieldChange("nominations", nominations)}
            lateOnly
          />
        )}
        <div style={{ fontSize: "12px", color: "#6B7280" }}>
          When late entries are allowed, set activation and close timing above. The late fee
          amount is configured under Pricing below.
        </div>
      </CMSCard>

      <EventPricingCard event={eventForCards} onChange={handleFieldChange} />

      <div style={{ display: "flex", justifyContent: "center" }}>
        <CMSButton
          onClick={handleSave}
          disabled={saving || !selectedTypeId || !selectedTrackId}
        >
          {saving ? "Saving…" : "Save Defaults"}
        </CMSButton>
      </div>
    </div>
  );
}
