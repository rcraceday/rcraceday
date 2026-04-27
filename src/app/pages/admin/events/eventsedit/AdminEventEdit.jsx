import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/supabaseClient";

import CMSCard from "@cms/CMSCard";
import CMSToggle from "@cms/CMSToggle";

import EventBasicsCard from "./components/EventBasicsCard";
import EventTimingCard from "./components/EventTimingCard";
import EventNominationsCard from "./components/EventNominationsCard";
import EventPricingCard from "./components/EventPricingCard";
import AdvancedSettingsCard from "./components/AdvancedSettingsCard";
import SaveActions from "./components/SaveActions";

import { cmsStyles } from "@cms/styles";

const initialEventState = {
  id: null,
  club_id: null,
  name: "",
  description: "",
  event_type: "",
  event_date: "",
  event_opens_at: "",
  drivers_briefing_at: "",
  event_closes_at: "",
  track: "",
  logourl: "",
  classes: [],
  class_limit: 3,
  preference_enabled: true,
  nominations_open: "",
  nominations_close: "",
  member_price: "",
  non_member_price: "",
  junior_price: "",
  is_published: true,
  location: "",
  created_at: null,
};

export default function AdminEventEdit() {
  const navigate = useNavigate();
  const { clubSlug, id } = useParams();

  const isNew = !id || id === "new";

  const [eventData, setEventData] = useState(initialEventState);
  const [eventTypes, setEventTypes] = useState([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  //
  // LOAD CLUB ID FOR NEW EVENTS
  //
  useEffect(() => {
    if (!isNew) return;

    async function loadClub() {
      const { data } = await supabase
        .from("clubs")
        .select("id")
        .eq("slug", clubSlug)
        .single();

      if (data) {
        setEventData((prev) => ({
          ...prev,
          club_id: data.id,
        }));
      }
    }

    loadClub();
  }, [isNew, clubSlug]);

  //
  // LOAD EVENT (IF EDITING)
  //
  useEffect(() => {
    if (isNew) return;

    async function loadEvent() {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("id", id)
        .single();

      console.log("RAW EVENT FROM DB:", data);

      if (error) {
        console.error("Failed to load event:", error);
        setError("Failed to load event.");
        setLoading(false);
        return;
      }

      setEventData({
        ...initialEventState,
        ...data,
        club_id: data.club_id,
        classes: Array.isArray(data.classes) ? data.classes : [],
      });

      setLoading(false);
    }

    loadEvent();
  }, [id, isNew]);

  //
  // LOAD EVENT TYPES (DYNAMIC PER CLUB)
  //
  useEffect(() => {
    if (!eventData.club_id) return;

    async function loadEventTypes() {
      const { data, error } = await supabase
        .from("club_event_types")
        .select("*")
        .eq("club_id", eventData.club_id)
        .order("sort_order", { ascending: true });

      if (!error) setEventTypes(data);
    }

    loadEventTypes();
  }, [eventData.club_id]);

  //
  // FIELD UPDATERS
  //
  const handleFieldChange = (field, value) => {
    setEventData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleClassesChange = (classes) => {
    setEventData((prev) => ({
      ...prev,
      classes,
    }));
  };

  //
  // LOGO HANDLER
  //
  const handleLogoChange = (fileOrNull) => {
    setEventData((prev) => ({
      ...prev,
      logourl: fileOrNull,
    }));
  };

  //
  // SAVE EVENT
  //
  const handleSave = async () => {
    setSaving(true);
    setError(null);

    const payload = {
      club_id: eventData.club_id,

      name: eventData.name || null,
      description: eventData.description || null,
      event_type: eventData.event_type || null,
      event_date: eventData.event_date || null,

      event_opens_at: eventData.event_opens_at || null,
      drivers_briefing_at: eventData.drivers_briefing_at || null,
      event_closes_at: eventData.event_closes_at || null,

      logourl: eventData.logourl || null,

      classes: eventData.classes || [],
      class_limit: Number(eventData.class_limit) || 3,
      preference_enabled: !!eventData.preference_enabled,

      nominations_open: eventData.nominations_open || null,
      nominations_close: eventData.nominations_close || null,

      member_price:
        eventData.member_price === "" ? null : Number(eventData.member_price),
      non_member_price:
        eventData.non_member_price === ""
          ? null
          : Number(eventData.non_member_price),
      junior_price:
        eventData.junior_price === "" ? null : Number(eventData.junior_price),

      is_published: !!eventData.is_published,
    };

    let result;
    if (isNew) {
      result = await supabase.from("events").insert(payload).select().single();
    } else {
      result = await supabase
        .from("events")
        .update(payload)
        .eq("id", id)
        .select()
        .single();
    }

    if (result.error) {
      console.error("Failed to save event:", result.error);
      setError("Failed to save event.");
      setSaving(false);
      return;
    }

    setSaving(false);
    navigate(`/${clubSlug}/app/admin/events`);
  };

  //
  // DELETE EVENT
  //
  const handleDelete = async () => {
    if (isNew) return;

    const confirmed = window.confirm(
      "Are you sure you want to delete this event? This cannot be undone."
    );
    if (!confirmed) return;

    setSaving(true);
    setError(null);

    const { error } = await supabase.from("events").delete().eq("id", id);

    if (error) {
      console.error("Failed to delete event:", error);
      setError("Failed to delete event.");
      setSaving(false);
      return;
    }

    setSaving(false);
    navigate(`/${clubSlug}/app/admin/events`);
  };

  const handleCancel = () => {
    navigate(`/${clubSlug}/app/admin/events`);
  };

  //
  // RENDER
  //
  return (
    <div style={cmsStyles.pageContainer}>
      <div style={cmsStyles.pageContent}>

        {/* CANONICAL HEADER */}
        <div style={cmsStyles.sectionHeader}>
          <h1 style={cmsStyles.sectionHeaderTitle}>
            {isNew ? "Create Event" : "Edit Event"}
          </h1>
          <p style={cmsStyles.sectionHeaderSubtitle}>
            Configure event details, nominations, pricing, and settings.
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
          <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>

            {/* BASICS */}
            <CMSCard
              title="Event Details"
              actions={
                <CMSToggle
                  label="Published"
                  checked={eventData.is_published}
                  onChange={(v) => handleFieldChange("is_published", v)}
                />
              }
            >
              <EventBasicsCard
                event={eventData}
                onChange={handleFieldChange}
                onLogoChange={handleLogoChange}
                eventTypes={eventTypes}
              />
            </CMSCard>

            {/* TIMING */}
            <CMSCard title="Timing">
              <EventTimingCard event={eventData} onChange={handleFieldChange} />
            </CMSCard>

            {/* NOMINATIONS */}
            <CMSCard title="Nominations">
              <EventNominationsCard
                event={eventData}
                onChange={handleFieldChange}
                onClassesChange={handleClassesChange}
              />
            </CMSCard>

            {/* PRICING */}
            <CMSCard title="Pricing">
              <EventPricingCard event={eventData} onChange={handleFieldChange} />
            </CMSCard>

            {/* ADVANCED */}
            <CMSCard title="Advanced Settings">
              <AdvancedSettingsCard
                event={eventData}
                onChange={handleFieldChange}
              />
            </CMSCard>

            {/* ACTIONS */}
            <SaveActions
              isNew={isNew}
              saving={saving}
              onSave={handleSave}
              onCancel={handleCancel}
              onDelete={handleDelete}
            />
          </div>
        )}

      </div>
    </div>
  );
}
