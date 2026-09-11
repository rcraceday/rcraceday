// src/app/pages/admin/events/eventsedit/AdminEventEdit.jsx
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/supabaseClient";

import CMSCard from "@cms/CMSCard";
import CMSToggle from "@cms/CMSToggle";
import CMSButton from "@cms/CMSButton";

import EventBasicsCard from "./components/EventBasicsCard";
import EventTimingCard from "./components/EventTimingCard";
import EventNominationsCard from "./components/EventNominationsCard";
import EventPricingCard from "./components/EventPricingCard";
import ClassesCard from "./components/ClassesCard";
import SaveActions from "./components/SaveActions";

import EventMerchandiseCard from "./components/EventMerchandiseCard";
import EventClassAddOnsCard from "./components/EventClassAddOnsCard";

import EventPreviewModal from "./components/EventPreviewModal";

import { cmsStyles } from "@cms/styles";

const initialEventState = {
  id: null,
  club_id: null,
  name: "",
  description: "",
  event_type: "",
  event_date: "",
  is_multi_day: false,
  days: [],
  track: null,
  logourl: undefined,
  logo_file: null,
  classes: [],
  classes_by_day: [],
  class_limit: 3,
  preference_enabled: true,
  nominations_open: "",
  nominations_close: "",
  member_price: "",
  non_member_price: "",
  junior_price: "",
  is_published: true,
  created_at: null,

  merchandise: [],
  class_add_ons: [],

  available_classes: [],
};

export default function AdminEventEdit() {
  const navigate = useNavigate();
  const { clubSlug, id } = useParams();
  const isNew = !id || id === "new";

  const [eventData, setEventData] = useState(initialEventState);
  const [eventTypes, setEventTypes] = useState([]);
  const [tracks, setTracks] = useState([]);
  const [trackClassCache, setTrackClassCache] = useState({});
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  // LOAD CLUB FOR NEW EVENT
  useEffect(() => {
    if (!isNew) return;

    async function loadClub() {
      try {
        const { data } = await supabase
          .from("clubs")
          .select("id")
          .eq("slug", clubSlug)
          .maybeSingle();

        if (data) {
          setEventData((prev) => ({
            ...prev,
            club_id: data.id,
          }));
        }
      } catch {}
    }

    loadClub();
  }, [isNew, clubSlug]);

  // LOAD EVENT FOR EDITING
  useEffect(() => {
    if (isNew) return;

    async function loadEvent() {
      setLoading(true);
      setError(null);

      try {
        const { data, error } = await supabase
          .from("events")
          .select("*")
          .eq("id", id)
          .maybeSingle();

        if (error || !data) {
          setError("Failed to load event.");
          setLoading(false);
          return;
        }

const normalizedDays = Array.isArray(data.days)
  ? data.days.map((d) =>
      typeof d === "string"
        ? {
            date: d,
            label: "",
            gates_open_at: "",
            practice_at: "",
            drivers_brief_at: "",
            race_start_at: "",
          }
        : {
            date: d.date || "",
            label: d.label || "",
            gates_open_at: d.gates_open_at || "",
            practice_at: d.practice_at || "",
            drivers_brief_at: d.drivers_brief_at || "",
            race_start_at: d.race_start_at || "",
          }
    )
  : [];

        setEventData({
          ...initialEventState,
          ...data,
          days: normalizedDays,
          merchandise: Array.isArray(data.merchandise)
            ? data.merchandise
            : [],
          class_add_ons: Array.isArray(data.class_add_ons)
            ? data.class_add_ons
            : [],
          classes: Array.isArray(data.classes) ? data.classes : [],
          is_multi_day: !!data.is_multi_day,
          available_classes: [],
        });

        setLoading(false);
      } catch {
        setError("Failed to load event.");
        setLoading(false);
      }
    }

    loadEvent();
  }, [id, isNew]);

  // LOAD EVENT TYPES
  useEffect(() => {
    if (!eventData.club_id) return;

    async function loadEventTypes() {
      try {
        const { data } = await supabase
          .from("club_event_types")
          .select("*")
          .eq("club_id", eventData.club_id)
          .order("sort_order", { ascending: true });

        if (data) setEventTypes(data);
      } catch {}
    }

    loadEventTypes();
  }, [eventData.club_id]);

  // LOAD TRACKS
  useEffect(() => {
    if (!eventData.club_id) return;

    async function loadTracks() {
      try {
        const { data } = await supabase
          .from("club_tracks")
          .select("*")
          .eq("club_id", eventData.club_id)
          .order("name", { ascending: true });

        if (data) setTracks(data);
      } catch {}
    }

    loadTracks();
  }, [eventData.club_id]);

  // LOAD CLASSES FOR TRACK
  const loadClassesForTrack = async (trackId) => {
    if (!trackId) return [];

    if (trackClassCache[trackId]) return trackClassCache[trackId];

    try {
      const { data } = await supabase
        .from("club_track_classes")
        .select(`
          class_id,
          club_classes (
            id,
            name,
            description,
            order_index
          )
        `)
        .eq("track_id", trackId)
        .order("order_index", { foreignTable: "club_classes" });

      const classes = (data || []).map((row) => row.club_classes);

      setTrackClassCache((prev) => ({
        ...prev,
        [trackId]: classes,
      }));

      return classes;
    } catch {
      return [];
    }
  };

  // AUTO-SET TRACK IF ONLY ONE EXISTS
  useEffect(() => {
    if (tracks.length === 1 && eventData.track == null) {
      setEventData((prev) => ({
        ...prev,
        track: tracks[0].id,
      }));
    }
  }, [tracks, eventData.track]);

  // LOAD AVAILABLE CLASSES WHEN TRACK CHANGES
  useEffect(() => {
    const trackId = eventData.track;
    if (!trackId) {
      setEventData((prev) => ({ ...prev, available_classes: [] }));
      return;
    }

    let mounted = true;
    (async () => {
      const classes = await loadClassesForTrack(trackId);
      if (!mounted) return;

      setEventData((prev) => ({
        ...prev,
        available_classes: classes,
      }));
    })();

    return () => {
      mounted = false;
    };
  }, [eventData.track]);

  // FIELD CHANGE HANDLER
  const handleFieldChange = (field, value) => {
    setEventData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // CLASSES CHANGE HANDLER
  const handleClassesChange = (classesByDay) => {
    setEventData((prev) => ({
      ...prev,
      classes_by_day: classesByDay,
    }));
  };

  // DELETE HANDLER
  const handleDelete = async () => {
    if (isNew) return;

    const confirmed = window.confirm(
      "Are you sure you want to delete this event? This cannot be undone."
    );
    if (!confirmed) return;

    setSaving(true);
    setError(null);

    try {
      const childDeletes = [
        supabase.from("event_classes").delete().eq("event_id", id),
        supabase.from("preference_nominations").delete().eq("event_id", id),
        supabase.from("nomination_classes").delete().eq("event_id", id),
      ];

      for (const p of childDeletes) {
        const { error } = await p;
        if (error) {
          setError("Failed to delete related records.");
          setSaving(false);
          return;
        }
      }

      const { error } = await supabase.from("events").delete().eq("id", id);

      if (error) {
        setError("Failed to delete event.");
        setSaving(false);
        return;
      }

      setSaving(false);
      navigate(`/${clubSlug}/app/admin/events`);
    } catch {
      setError("Failed to delete event.");
      setSaving(false);
    }
  };

  // CANCEL HANDLER
  const handleCancel = () => {
    navigate(`/${clubSlug}/app/admin/events`);
  };

  // SAVE HANDLER
  const normalizeDate = (v) => {
    if (v === null || v === undefined) return null;
    if (v instanceof Date) return v.toISOString();
    const s = String(v).trim();
    return s === "" ? null : s;
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    setError(null);

    console.log("DEBUG classes_by_day:", eventData.classes_by_day);

    const err = validateEvent();
    if (err) {
      setError(err);
      setSaving(false);
      return;
    }

    const finalLogoUrl =
      typeof eventData.logourl === "string" ? eventData.logourl : null;

// Normalize days
const normalizedDays = (eventData.days || []).map((d) => ({
  date: normalizeDate(d?.date),
  label: d?.label ?? "",
  gates_open_at: d?.gates_open_at ?? "",
  practice_at: d?.practice_at ?? "",
  drivers_brief_at: d?.drivers_brief_at ?? "",
  race_start_at: d?.race_start_at ?? "",
}));

// FIX: classes_by_day must match normalizedDays
const normalizedClassesByDay = normalizedDays.map((d, index) => ({
  date: d.date,
  label: d.label,
  classes: Array.isArray(eventData.classes_by_day?.[index]?.classes)
    ? eventData.classes_by_day[index].classes
    : []
}));

const payload = {
  club_id: eventData.club_id ?? null,
  name: eventData.name ?? "",
  description: eventData.description ?? null,
  event_type: eventData.event_type ?? null,
  track: eventData.track ?? null,
  logourl: finalLogoUrl,
  is_multi_day: !!eventData.is_multi_day,
  event_date: eventData.is_multi_day
    ? null
    : normalizeDate(eventData.event_date || eventData.days?.[0]?.date),
  days: normalizedDays,
  nominations_open: normalizeDate(eventData.nominations_open),
  nominations_close: normalizeDate(eventData.nominations_close),

  classes_by_day: normalizedClassesByDay,
  classes: eventData.is_multi_day ? [] : eventData.classes ?? [],
  merchandise: eventData.merchandise ?? [],
  class_add_ons: eventData.class_add_ons ?? [],

  // ⭐ THIS WAS MISSING
  pricing: eventData.pricing ?? {},

  is_published:
    typeof eventData.is_published === "boolean"
      ? eventData.is_published
      : true,
  class_limit: eventData.class_limit ?? 3,
  preference_enabled:
    typeof eventData.preference_enabled === "boolean"
      ? eventData.preference_enabled
      : true,
};

    Object.keys(payload).forEach(
      (k) => payload[k] === undefined && delete payload[k]
    );

    try {
      let res;
      if (isNew) {
        res = await supabase
          .from("events")
          .insert(payload)
          .select()
          .maybeSingle();
      } else {
        res = await supabase
          .from("events")
          .update(payload)
          .eq("id", id)
          .select()
          .maybeSingle();
      }

      if (res.error) {
        setError(res.error.message || "Failed to save event.");
        setSaving(false);
        return;
      }

      if (!res.data) {
        setError("Save completed but no event was returned.");
        setSaving(false);
        return;
      }

      setEventData(res.data);
      setSaving(false);
      navigate(`/${clubSlug}/app/admin/events`);
    } catch {
      setError("Unexpected error saving event.");
      setSaving(false);
    }
  };

  // VALIDATION
  const validateEvent = () => {
    if (!eventData.name) return "Event name is required.";
    if (!eventData.event_type) return "Event type is required.";
    if (!eventData.track) return "Track is required.";

    if (!eventData.is_multi_day && !eventData.event_date)
      return "Event date is required for single-day events.";

    if (eventData.is_multi_day) {
      if (!Array.isArray(eventData.days) || eventData.days.length === 0)
        return "At least one day is required.";

      for (const d of eventData.days) {
        if (!d.date) return "Each day must have a date.";
        if (typeof d.label !== "string") return "Day label must be a string.";
      }
    }

if (eventData.is_multi_day) {
  if (!Array.isArray(eventData.classes_by_day))
    return "classes_by_day must be an array.";

  for (const item of eventData.classes_by_day) {
    if (!Array.isArray(item.classes))
      return "each classes_by_day entry must contain a classes array.";
  }
}

    return null;
  };

  // RENDER
  return (
    <div style={cmsStyles.pageContainer}>
      <div style={cmsStyles.pageContent}>
        <div style={cmsStyles.sectionHeader}>
          <h1 style={cmsStyles.sectionHeaderTitle}>
            {isNew ? "Create Event" : "Edit Event"}
          </h1>
          <p style={cmsStyles.sectionHeaderSubtitle}>
            Configure event details, track, nominations, pricing, merchandise, and classes.
          </p>
        </div>

        {error && (
          <div
            style={{
              padding: "12px 16px",
              borderRadius: "6px",
              backgroundColor: "#FEE2E2",
              color: "#991B1B",
              fontSize: "14px",
              marginBottom: "20px",
            }}
          >
            {error}
          </div>
        )}

        {loading ? (
          <CMSCard>
            <div style={{ padding: "16px" }}>Loading event…</div>
          </CMSCard>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <CMSCard
              title="Event Details"
              actions={
                <CMSToggle
                  label="Published"
                  checked={eventData.is_published}
                  onChange={(checked) =>
                    handleFieldChange("is_published", checked)
                  }
                />
              }
            >
              <EventBasicsCard
                event={eventData}
                onChange={handleFieldChange}
                eventTypes={eventTypes}
                tracks={tracks}
              />
            </CMSCard>

            <CMSCard title="Event Timing">
              <EventTimingCard event={eventData} onChange={handleFieldChange} />
            </CMSCard>

            <CMSCard title="Nominations">
              <EventNominationsCard
                event={eventData}
                onChange={handleFieldChange}
              />
            </CMSCard>

            <CMSCard title="Classes">
              <ClassesCard
                event={eventData}
                onChange={handleFieldChange}
                onClassesChange={handleClassesChange}
              />
            </CMSCard>

            <CMSCard title="Pricing">
              <EventPricingCard event={eventData} onChange={handleFieldChange} />
            </CMSCard>

            <CMSCard title="Merchandise">
              <EventMerchandiseCard
                event={eventData}
                onChange={handleFieldChange}
              />
            </CMSCard>

            <CMSCard title="Class Add‑Ons">
              <EventClassAddOnsCard
                event={eventData}
                onChange={handleFieldChange}
                availableClasses={eventData.available_classes}
              />
            </CMSCard>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <CMSButton variant="primary" onClick={() => setPreviewOpen(true)}>
                Preview Event
              </CMSButton>

              <SaveActions
                isNew={isNew}
                saving={saving}
                onSave={handleSave}
                onCancel={handleCancel}
                onDelete={handleDelete}
              />
            </div>
          </div>
        )}

        {previewOpen && (
          <EventPreviewModal
            event={eventData}
            onClose={() => setPreviewOpen(false)}
          />
        )}
      </div>
    </div>
  );
}
