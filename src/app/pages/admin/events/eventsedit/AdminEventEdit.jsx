// src/app/pages/admin/events/eventsedit/AdminEventEdit.jsx
import { useEffect, useRef, useState } from "react";
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
import { isRichTextEmpty } from "@/app/lib/richText";
import { triggerNominationsOpenProcessing } from "@/app/lib/userNotifications";
import { formatEdgeFunctionInvokeError } from "@/app/lib/edgeFunctionErrors";
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
import {
  datetimeLocalToIso,
  isoToDatetimeLocal,
  mergeNominationFieldsFromDom,
} from "@/app/lib/eventDatetime";

const EVENT_EDIT_SELECT =
  "*, pricing, late_entries_enabled, late_fee_activation, late_entries_close";

function flushFocusedFieldValue() {
  const el = document.activeElement;
  if (
    el &&
    (el.tagName === "INPUT" || el.tagName === "TEXTAREA") &&
    typeof el.blur === "function"
  ) {
    el.blur();
  }
}

function waitForInputCommit() {
  flushFocusedFieldValue();
  return new Promise((resolve) => {
    setTimeout(() => setTimeout(resolve, 0), 0);
  });
}

const initialEventState = {
  id: null,
  club_id: null,
  club_slug: null,
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
  nominations_customized: false,
  notify_nominations_open: false,
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
  const [previewRefreshKey, setPreviewRefreshKey] = useState(0);
  const [publishPromptOpen, setPublishPromptOpen] = useState(false);
  const [sendingOpenNotifications, setSendingOpenNotifications] = useState(false);
  const eventDataRef = useRef(eventData);

  useEffect(() => {
    eventDataRef.current = eventData;
  }, [eventData]);

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
            club_slug: clubSlug,
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
          club_slug: clubSlug,
          nominations_open: isoToDatetimeLocal(data.nominations_open),
          nominations_close: isoToDatetimeLocal(data.nominations_close),
          late_entries_enabled: !!data.late_entries_enabled,
          notify_nominations_open: !!data.notify_nominations_open,
          nominations_customized: !!(data.nominations_open || data.nominations_close),
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
      if (prev.nominations_customized) return prev;
      if (!isNew && (prev.nominations_open || prev.nominations_close)) return prev;
      if (!nominationsNeedAutofill(prev)) return prev;

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
  const nominationScheduleFields = new Set([
    "nominations_open",
    "nominations_close",
    "late_fee_activation",
    "late_entries_close",
    "late_entries_enabled",
  ]);

  const handleFieldChange = (field, value) => {
    setEventData((prev) => {
      let next = { ...prev, [field]: value };

      if (nominationScheduleFields.has(field)) {
        next.nominations_customized = true;
        eventDataRef.current = next;
      }

      if (field === "event_date" && !prev.is_multi_day) {
        const dayDelta = dayDiffBetweenDates(prev.event_date, value);
        if (Array.isArray(prev.days) && prev.days.length > 0) {
          const days = [...prev.days];
          days[0] = { ...days[0], date: value };
          next.days = days;
        }
        if (nominationsNeedAutofill(prev)) {
          next = applyNominationsFromTypeDefaults(next, eventTypes, { overwrite: true });
        } else if (dayDelta !== 0) {
          next = shiftEventNominationDates(next, dayDelta);
        }
      }

      if (field === "days" && prev.is_multi_day && nominationsNeedAutofill(prev)) {
        next = applyNominationsFromTypeDefaults(next, eventTypes, { overwrite: true });
      }

      if (
        nominationsNeedAutofill(prev) &&
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

      return {
        ...applyEventTypeDefaults(next, typeRow, trackId),
        nominations_customized: next.nominations_customized,
      };
    });
  };

  // CLASSES CHANGE HANDLER
  const handleClassesChange = (classesByDay) => {
    setEventData((prev) => {
      const next = {
        ...prev,
        classes_by_day: classesByDay,
      };
      if (!prev.is_multi_day) {
        const dayClasses = Array.isArray(classesByDay?.[0]?.classes)
          ? classesByDay[0].classes
          : [];
        next.classes = dayClasses;
      }
      return next;
    });
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
      return datetimeLocalToIso(s);
    }
    return s;
  };

  const requestSave = async () => {
    if (saving) return;
    await waitForInputCommit();
    if (!eventDataRef.current.is_published) {
      setPublishPromptOpen(true);
      return;
    }
    handleSave(true);
  };

  async function runNominationsOpenNotifications(eventId, { force = false } = {}) {
    if (!eventId) return null;
    setSendingOpenNotifications(true);
    try {
      const { data, error: fnError } = await triggerNominationsOpenProcessing(
        supabase,
        eventId,
        { force }
      );
      if (fnError) {
        setError(
          formatEdgeFunctionInvokeError(fnError, "process-nominations-open") ||
            "Could not run nominations-open notifications. Check Edge Function logs."
        );
        return null;
      }
      if (data?.error) {
        setError(String(data.error));
        return null;
      }
      const row = Array.isArray(data?.summary) ? data.summary[0] : null;
      if (row && row.inApp === 0 && row.push === 0 && row.email === 0) {
        setError(
          "Notification job ran but sent 0 in-app, 0 push, and 0 email. Check member accounts, notification settings, push subscription, and SQL migrations."
        );
      }
      return data;
    } finally {
      setSendingOpenNotifications(false);
    }
  }

  const handleSendOpenNotificationsNow = async () => {
    if (isNew || !id) {
      setError("Save the event first, then send notifications.");
      return;
    }
    setError(null);
    await runNominationsOpenNotifications(id, { force: true });
  };

  const handleSave = async (
    isPublished = eventDataRef.current.is_published,
    { navigateAfter = true } = {}
  ) => {
    if (saving) return false;
    await waitForInputCommit();
    const snapshot = mergeNominationFieldsFromDom(eventDataRef.current);
    eventDataRef.current = snapshot;
    setPublishPromptOpen(false);
    setSaving(true);
    setError(null);

    console.log("DEBUG classes_by_day:", snapshot.classes_by_day);

    const err = validateEvent(snapshot);
    if (err) {
      setError(err);
      setSaving(false);
      return false;
    }

    const finalLogoUrl =
      typeof snapshot.logourl === "string" ? snapshot.logourl : null;

// Normalize days
const normalizedDays = (snapshot.days || []).map((d, index) => ({
  date: normalizeDate(d?.date),
  label: d?.label ?? "",
  gates_open_at: d?.gates_open_at ?? "",
  practice_at: d?.practice_at ?? "",
  drivers_brief_at: d?.drivers_brief_at ?? "",
  race_start_at: d?.race_start_at ?? "",
  is_practice: !!(
    d?.is_practice ?? snapshot.classes_by_day?.[index]?.is_practice
  ),
}));

// FIX: classes_by_day must match normalizedDays
const normalizedClassesByDay = normalizedDays.map((d, index) => ({
  date: d.date,
  label: d.label,
  classes: Array.isArray(snapshot.classes_by_day?.[index]?.classes)
    ? snapshot.classes_by_day[index].classes
    : [],
  is_practice: !!(
    snapshot.classes_by_day?.[index]?.is_practice ?? d.is_practice
  ),
}));

const payload = {
  club_id: snapshot.club_id ?? null,
  name: snapshot.name ?? "",
  description: snapshot.description ?? null,
  event_type: snapshot.event_type ?? null,
  track: snapshot.track ?? null,
  logourl: finalLogoUrl,
  is_multi_day: !!snapshot.is_multi_day,
  event_date: snapshot.is_multi_day
    ? null
    : normalizeDate(snapshot.event_date || snapshot.days?.[0]?.date),
  days: normalizedDays,
  nominations_open: normalizeDate(snapshot.nominations_open),
  nominations_close: normalizeDate(snapshot.nominations_close),
  late_entries_enabled: !!snapshot.late_entries_enabled,
  notify_nominations_open: !!snapshot.notify_nominations_open,
  late_fee_activation: normalizeDate(snapshot.late_fee_activation),
  late_entries_close: normalizeDate(snapshot.late_entries_close),

  classes_by_day: normalizedClassesByDay,
  classes: snapshot.is_multi_day
    ? []
    : normalizedClassesByDay[0]?.classes ?? snapshot.classes ?? [],
  class_entry_limits: snapshot.class_entry_limits ?? {},
  class_minimum_entries:
    snapshot.class_minimum_entries == null || snapshot.class_minimum_entries === ""
      ? null
      : Number(snapshot.class_minimum_entries),
  class_minimum_livetime_when_unmet: !!snapshot.class_minimum_livetime_when_unmet,
  merchandise: snapshot.merchandise ?? [],
  class_add_ons: snapshot.class_add_ons ?? [],
  club_requirements: snapshot.club_requirements ?? [],

  // ⭐ THIS WAS MISSING
  pricing: snapshot.pricing ?? {},

  is_published: !!isPublished,
  class_limit:
    snapshot.class_limit == null || snapshot.class_limit === ""
      ? 3
      : Number(snapshot.class_limit),
  class_limit_per_day: snapshot.is_multi_day
    ? snapshot.class_limit_per_day == null || snapshot.class_limit_per_day === ""
      ? null
      : snapshot.class_limit_per_day
    : null,
  class_limit_scope: snapshot.is_multi_day
    ? snapshot.class_limit_per_day != null &&
      snapshot.class_limit_per_day !== "" &&
      (snapshot.class_limit == null || snapshot.class_limit === "")
      ? "per_day"
      : "per_event"
    : "per_event",
  preference_enabled:
    typeof snapshot.preference_enabled === "boolean"
     ? snapshot.preference_enabled
      : true,
    requires_rcra_club: // <--- Add this line
    typeof snapshot.requires_rcra_club === "boolean" // <--- Add this line
     ? snapshot.requires_rcra_club // <--- Add this line
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
        return false;
      }

      if (!res.data) {
        setError("Save completed but no event was returned.");
        setSaving(false);
        return false;
      }

      const nominationsOpenAt = res.data.nominations_open
        ? new Date(res.data.nominations_open)
        : null;
      if (nominationsOpenAt && nominationsOpenAt <= new Date()) {
        await runNominationsOpenNotifications(res.data.id);
      }

      setEventData((prev) => ({
        ...prev,
        ...res.data,
        club_slug: clubSlug,
        nominations_open: isoToDatetimeLocal(res.data.nominations_open),
        nominations_close: isoToDatetimeLocal(res.data.nominations_close),
        late_fee_activation: isoToDatetimeLocal(res.data.late_fee_activation),
        late_entries_close: isoToDatetimeLocal(res.data.late_entries_close),
        late_entries_enabled: !!res.data.late_entries_enabled,
        notify_nominations_open: !!res.data.notify_nominations_open,
        nominations_customized:
          snapshot.nominations_customized ||
          !!(res.data.nominations_open || res.data.nominations_close),
      }));
      setSaving(false);
      if (navigateAfter) {
        navigate(`/${clubSlug}/app/admin/events`);
      }
      return true;
    } catch {
      setError("Unexpected error saving event.");
      setSaving(false);
      return false;
    }
  };

  const handlePreview = async () => {
    if (isNew || saving) return;
    const saved = await handleSave(eventDataRef.current.is_published, { navigateAfter: false });
    if (!saved) return;
    setPreviewRefreshKey(Date.now());
    setPreviewOpen(true);
  };

  // VALIDATION
  const validateEvent = (data = eventDataRef.current) => {
    if (isRichTextEmpty(data.name)) return "Event name is required.";
    if (!data.event_type) return "Event type is required.";
    if (!data.track) return "Track is required.";

    if (!data.is_multi_day && !data.event_date)
      return "Event date is required for single-day events.";

    if (data.is_multi_day) {
      if (!Array.isArray(data.days) || data.days.length === 0)
        return "At least one day is required.";

      for (const d of data.days) {
        if (!d.date) return "Each day must have a date.";
        if (typeof d.label !== "string") return "Day label must be a string.";
      }
    }

if (data.is_multi_day) {
  if (!Array.isArray(data.classes_by_day))
    return "classes_by_day must be an array.";

  for (const item of data.classes_by_day) {
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
                onSendOpenNotifications={handleSendOpenNotificationsNow}
                sendingOpenNotifications={sendingOpenNotifications}
                canSendOpenNotifications={!isNew && !!id}
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
                disabled={isNew || saving}
                onClick={handlePreview}
                style={{ width: "100%", justifyContent: "center" }}
              >
                {saving ? "Saving…" : "Preview Event"}
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
            refreshKey={previewRefreshKey}
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
                  onClick={async () => {
                    await waitForInputCommit();
                    handleSave(false);
                  }}
                  disabled={saving}
                >
                  No
                </CMSButton>
                <CMSButton
                  variant="primary"
                  onClick={async () => {
                    await waitForInputCommit();
                    setEventData((prev) => {
                      const next = { ...prev, is_published: true };
                      eventDataRef.current = next;
                      return next;
                    });
                    await waitForInputCommit();
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