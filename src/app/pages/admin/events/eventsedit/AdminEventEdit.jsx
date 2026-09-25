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
import EventRequirementsCard from "./components/EventRequirementsCard";

import EventPreviewModal from "./components/EventPreviewModal";

import { cmsStyles } from "@cms/styles";
import {
  applyEventTypeDefaults,
  applyNominationsFromTypeDefaults,
  dayDiffBetweenDates,
  findEventType,
  getEventAnchorDate,
  nominationsNeedAutofill,
  normalizeDayRecord,
  shiftEventNominationDates,
} from "@app/pages/admin/events/eventDefaults";

const EVENT_EDIT_SELECT =
  "*, pricing, late_entries_enabled, late_fee_activation, late_entries_close";

function isoToDatetimeLocal(value) {
  if (value == null || value === "") return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

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
  class_entry_limits: {},
  class_minimum_entries: null,
  class_minimum_livetime_when_unmet: false,
  class_limit: 3,
  class_limit_per_day: null,
  class_limit_scope: "per_event",
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
  club_requirements: [],

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
  const [publishPromptOpen, setPublishPromptOpen] = useState(false);

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
          .select(EVENT_EDIT_SELECT)
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
            is_practice: false,
          }
        : {
            date: d.date || "",
            label: d.label || "",
            gates_open_at: d.gates_open_at || "",
            practice_at: d.practice_at || "",
            drivers_brief_at: d.drivers_brief_at || "",
            race_start_at: d.race_start_at || "",
            is_practice: !!d.is_practice,
          }
    )
  : [];

        const normalizedClassesByDay = Array.isArray(data.classes_by_day)
          ? data.classes_by_day.map((entry, index) => ({
              ...entry,
              classes: Array.isArray(entry?.classes) ? entry.classes : [],
              is_practice: !!(
                entry?.is_practice ?? normalizedDays[index]?.is_practice
              ),
            }))
          : [];

        setEventData({
          ...initialEventState,
          ...data,
          nominations_open: isoToDatetimeLocal(data.nominations_open),
          nominations_close: isoToDatetimeLocal(data.nominations_close),
          late_entries_enabled: !!data.late_entries_enabled,
          late_fee_activation: isoToDatetimeLocal(data.late_fee_activation),
          late_entries_close: isoToDatetimeLocal(data.late_entries_close),
          days: normalizedDays,
          classes_by_day: normalizedClassesByDay,
          merchandise: Array.isArray(data.merchandise)
            ? data.merchandise
            : [],
          class_add_ons: Array.isArray(data.class_add_ons)
            ? data.class_add_ons
            : [],
          club_requirements: Array.isArray(data.club_requirements)
            ? data.club_requirements
            : [],
          classes: Array.isArray(data.classes) ? data.classes : [],
          class_entry_limits:
            data.class_entry_limits && typeof data.class_entry_limits === "object"
              ? data.class_entry_limits
              : {},
          is_multi_day: !!data.is_multi_day,
          class_limit_scope:
            data.class_limit_scope === "per_day" ? "per_day" : "per_event",
          class_limit:
            !!data.is_multi_day && data.class_limit_scope === "per_day"
              ? null
              : data.class_limit,
          class_limit_per_day:
            data.class_limit_per_day != null && data.class_limit_per_day !== ""
              ? Number(data.class_limit_per_day)
              : !!data.is_multi_day && data.class_limit_scope === "per_day"
                ? data.class_limit ?? 3
                : null,
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
          .select("*, defaults")
          .eq("club_id", eventData.club_id)
          .order("sort_order", { ascending: true });

        if (data) setEventTypes(data);
      } catch {}
    }

    loadEventTypes();
  }, [eventData.club_id]);

  useEffect(() => {
    if (!eventTypes.length) return;

    setEventData((prev) => {
      if (!prev.event_type || !prev.track || !getEventAnchorDate(prev)) return prev;
      if (!nominationsNeedAutofill(prev, isNew)) return prev;

      const next = applyNominationsFromTypeDefaults(prev, eventTypes, { overwrite: true });
      if (
        next.nominations_open === prev.nominations_open &&
        next.nominations_close === prev.nominations_close &&
        next.late_fee_activation === prev.late_fee_activation &&
        next.late_entries_close === prev.late_entries_close &&
        next.late_entries_enabled === prev.late_entries_enabled
      ) {
        return prev;
      }
      return next;
    });
  }, [eventTypes, isNew]);

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
    if (tracks.length !== 1 || eventData.track != null) return;

    const trackId = tracks[0].id;
    setEventData((prev) => {
      const next = { ...prev, track: trackId };
      if (!isNew || !prev.event_type) return next;
      const typeRow = findEventType(eventTypes, prev.event_type);
      return typeRow ? applyEventTypeDefaults(next, typeRow, trackId) : next;
    });
  }, [tracks, eventData.track, isNew, eventTypes]);

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
    setEventData((prev) => {
      let next = { ...prev, [field]: value };

      if (field === "event_date" && !prev.is_multi_day) {
        const dayDelta = dayDiffBetweenDates(prev.event_date, value);
        if (Array.isArray(prev.days) && prev.days.length > 0) {
          const days = [...prev.days];
          days[0] = { ...days[0], date: value };
          next.days = days;
        }
        if (nominationsNeedAutofill(prev, isNew)) {
          next = applyNominationsFromTypeDefaults(next, eventTypes, { overwrite: true });
        } else if (dayDelta !== 0) {
          next = shiftEventNominationDates(next, dayDelta);
        }
      }

      if (field === "days" && prev.is_multi_day && nominationsNeedAutofill(prev, isNew)) {
        next = applyNominationsFromTypeDefaults(next, eventTypes, { overwrite: true });
      }

      if (
        !isNew &&
        nominationsNeedAutofill(prev, isNew) &&
        (field === "event_type" || field === "track")
      ) {
        next = applyNominationsFromTypeDefaults(next, eventTypes, { overwrite: true });
      }

      if (!isNew || (field !== "event_type" && field !== "track")) {
        return next;
      }

      const typeValue = field === "event_type" ? value : next.event_type;
      const trackId = field === "track" ? value : next.track;
      const typeRow = findEventType(eventTypes, typeValue);

      if (!typeRow || !trackId) return next;

      return applyEventTypeDefaults(next, typeRow, trackId);
    });
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
    if (s === "") return null;
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s)) {
      return new Date(s).toISOString();
    }
    return s;
  };

  const requestSave = () => {
    if (saving) return;
    if (!eventData.is_published) {
      setPublishPromptOpen(true);
      return;
    }
    handleSave(true);
  };

  const handleSave = async (isPublished = eventData.is_published) => {
    if (saving) return;
    setPublishPromptOpen(false);
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
const normalizedDays = (eventData.days || []).map((d, index) => ({
  date: normalizeDate(d?.date),
  label: d?.label ?? "",
  gates_open_at: d?.gates_open_at ?? "",
  practice_at: d?.practice_at ?? "",
  drivers_brief_at: d?.drivers_brief_at ?? "",
  race_start_at: d?.race_start_at ?? "",
  is_practice: !!(
    d?.is_practice ?? eventData.classes_by_day?.[index]?.is_practice
  ),
}));

// FIX: classes_by_day must match normalizedDays
const normalizedClassesByDay = normalizedDays.map((d, index) => ({
  date: d.date,
  label: d.label,
  classes: Array.isArray(eventData.classes_by_day?.[index]?.classes)
    ? eventData.classes_by_day[index].classes
    : [],
  is_practice: !!(
    eventData.classes_by_day?.[index]?.is_practice ?? d.is_practice
  ),
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
  late_entries_enabled: !!eventData.late_entries_enabled,
  late_fee_activation: normalizeDate(eventData.late_fee_activation),
  late_entries_close: normalizeDate(eventData.late_entries_close),

  classes_by_day: normalizedClassesByDay,
  classes: eventData.is_multi_day ? [] : eventData.classes ?? [],
  class_entry_limits: eventData.class_entry_limits ?? {},
  class_minimum_entries:
    eventData.class_minimum_entries == null || eventData.class_minimum_entries === ""
      ? null
      : Number(eventData.class_minimum_entries),
  class_minimum_livetime_when_unmet: !!eventData.class_minimum_livetime_when_unmet,
  merchandise: eventData.merchandise ?? [],
  class_add_ons: eventData.class_add_ons ?? [],
  club_requirements: eventData.club_requirements ?? [],

  // ⭐ THIS WAS MISSING
  pricing: eventData.pricing ?? {},

  is_published: !!isPublished,
  class_limit:
    eventData.class_limit == null || eventData.class_limit === ""
      ? 3
      : Number(eventData.class_limit),
  class_limit_per_day: eventData.is_multi_day
    ? eventData.class_limit_per_day == null || eventData.class_limit_per_day === ""
      ? null
      : eventData.class_limit_per_day
    : null,
  class_limit_scope: eventData.is_multi_day
    ? eventData.class_limit_per_day != null &&
      eventData.class_limit_per_day !== "" &&
      (eventData.class_limit == null || eventData.class_limit === "")
      ? "per_day"
      : "per_event"
    : "per_event",
  preference_enabled:
    typeof eventData.preference_enabled === "boolean"
     ? eventData.preference_enabled
      : true,
    requires_rcra_club: // <--- Add this line
    typeof eventData.requires_rcra_club === "boolean" // <--- Add this line
     ? eventData.requires_rcra_club // <--- Add this line
    : false, // <--- Add this line
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
          .select(EVENT_EDIT_SELECT)
          .maybeSingle();
      } else {
        res = await supabase
          .from("events")
          .update(payload)
          .eq("id", id)
          .select(EVENT_EDIT_SELECT)
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

            <CMSCard title="Club Requirements">
              <EventRequirementsCard
                event={eventData}
                onChange={handleFieldChange}
              />
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
              <CMSButton
                variant="primary"
                disabled={isNew}
                onClick={() => {
                  if (isNew) return;
                  setPreviewOpen(true);
                }}
                style={{ width: "100%", justifyContent: "center" }}
              >
                Preview Event
              </CMSButton>

              <SaveActions
                isNew={isNew}
                saving={saving}
                onSave={requestSave}
                onCancel={handleCancel}
                onDelete={handleDelete}
              />
            </div>
          </div>
        )}

        {previewOpen && !isNew && (
          <EventPreviewModal
            clubSlug={clubSlug}
            eventId={id}
            onClose={() => setPreviewOpen(false)}
          />
        )}

        {publishPromptOpen && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              width: "100vw",
              height: "100vh",
              background: "rgba(0,0,0,0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 99999,
              padding: "20px",
            }}
          >
            <div
              style={{
                width: "100%",
                maxWidth: "420px",
                background: "#FFF",
                borderRadius: "12px",
                padding: "20px",
                boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
                display: "flex",
                flexDirection: "column",
                gap: "16px",
              }}
            >
              <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 600 }}>
                Event is not published
              </h2>
              <p style={{ margin: 0, fontSize: "14px", color: "#4B5563" }}>
                Would you like to publish the event?
              </p>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                <CMSButton
                  variant="secondary"
                  onClick={() => {
                    handleSave(false);
                  }}
                  disabled={saving}
                >
                  No
                </CMSButton>
                <CMSButton
                  variant="primary"
                  onClick={() => {
                    setEventData((prev) => ({ ...prev, is_published: true }));
                    handleSave(true);
                  }}
                  disabled={saving}
                >
                  Yes
                </CMSButton>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}