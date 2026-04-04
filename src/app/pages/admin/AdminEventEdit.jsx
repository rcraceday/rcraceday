// =========================
// 1. IMPORTS
// =========================

import { useEffect, useState, useRef } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { supabase } from "@/supabaseClient";

import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import { CSS } from "@dnd-kit/utilities";

import {
  InformationCircleIcon,
  CalendarDaysIcon,
} from "@heroicons/react/24/outline";

import { useClub } from "@/app/providers/ClubProvider";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";

// =========================
// 2. CONSTANTS & HELPERS
// =========================

const TRACK_OPTIONS = ["Dirt Track", "SIC Surface"];

function toLocalInputValue(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  const pad = (n) => n.toString().padStart(2, "0");
  return (
    date.getFullYear() +
    "-" +
    pad(date.getMonth() + 1) +
    "-" +
    pad(date.getDate()) +
    "T" +
    pad(date.getHours()) +
    ":" +
    pad(date.getMinutes())
  );
}

// =========================
// 3. DRAG & DROP COMPONENT
// =========================

function SortableItem({ cls, children }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: cls.class_id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between rounded-lg border border-gray-300 bg-white px-3 py-2"
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-gray-400"
        >
          <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
            <circle cx="7" cy="5" r="1.5" />
            <circle cx="13" cy="5" r="1.5" />
            <circle cx="7" cy="10" r="1.5" />
            <circle cx="13" cy="10" r="1.5" />
            <circle cx="7" cy="15" r="1.5" />
            <circle cx="13" cy="15" r="1.5" />
          </svg>
        </button>

        {children}
      </div>
    </div>
  );
}

// =========================
// 4. COMPONENT START
// =========================

export default function AdminEventEdit() {
  const { clubSlug, id } = useParams();
  const navigate = useNavigate();
  const isNew = id === "new";

  const { club } = useClub();
  const brand = club?.theme?.hero?.backgroundColor || "#0A66C2";

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // =========================
  // 4.1 STATE
  // =========================

  const [event, setEvent] = useState({
    name: "",
    event_date: "",
    description: "",
    logoUrl: "",
    track: "",
    nominations_open: "",
    nominations_close: "",
    member_price: 10,
    non_member_price: 20,
    junior_price: 0,
    preference_enabled: true,
    class_limit: 3,
  });

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const [showAdvanced, setShowAdvanced] = useState(false);

  const [clubClasses, setClubClasses] = useState([]);
  const [nominationClasses, setNominationClasses] = useState([]);
  const [nominationRows, setNominationRows] = useState([]);

  const [tooltipId, setTooltipId] = useState(null);

  const [saving, setSaving] = useState(false);

  const fileInputRef = useRef(null);

  // =========================
  // 5. EFFECTS
  // =========================
 useEffect(() => {
    if (club?.id) loadClubClasses(club.id);
  }, [club]);

  useEffect(() => {
    loadEventAndNominationRows();
  }, [id]);

  useEffect(() => {
    if (!clubClasses.length) {
      setNominationClasses([]);
      return;
    }

    if (isNew) {
      const initial = clubClasses.map((cls, index) => ({
        class_id: cls.id,
        class_name: cls.name,
        description: cls.description || "",
        is_enabled: false,
        order_index: index + 1,
      }));
      setNominationClasses(initial);
      return;
    }

    const rowMap = new Map(
      (nominationRows || []).map((row) => [row.class_id, row])
    );

    const merged = clubClasses.map((cls, index) => {
      const row = rowMap.get(cls.id);
      return {
        class_id: cls.id,
        class_name: cls.name,
        description: cls.description || "",
        is_enabled: !!row,
        order_index: row ? row.order_index : index + 1,
      };
    });

    merged.sort((a, b) => a.order_index - b.order_index);
    setNominationClasses(merged);
  }, [clubClasses, nominationRows, isNew]);

// =========================
// 6. DATA LOADERS
// =========================

async function loadClubClasses(clubId) {
  const { data } = await supabase
    .from("club_classes")
    .select("*")
    .eq("club_id", clubId)
    .order("order_index", { ascending: true });

  setClubClasses(data || []);
}

async function loadEventAndNominationRows() {
  if (isNew) {
    // New event → no nomination rows yet
    setNominationClasses([]); 
    return;
  }

  const { data: eventData } = await supabase
    .from("events")
    .select("*")
    .eq("id", id)
    .single();

  // ⭐ Normalize all nullable fields to prevent React crashes
  setEvent({
    ...eventData,

    event_date: toLocalInputValue(eventData.event_date),
    nominations_open: toLocalInputValue(eventData.nominations_open),
    nominations_close: toLocalInputValue(eventData.nominations_close),

    name: eventData.name ?? "",
    description: eventData.description ?? "",
    track: eventData.track ?? "",
    logoUrl: eventData.logoUrl ?? "",

    member_price: eventData.member_price ?? 0,
    non_member_price: eventData.non_member_price ?? 0,
    junior_price: eventData.junior_price ?? 0,
    class_limit: eventData.class_limit ?? 0,
    preference_enabled: eventData.preference_enabled ?? false,

    logoFileName: eventData.logoUrl
      ? eventData.logoUrl.split("/").pop()
      : "",
  });

  // Load nomination rows
  const { data: nominationData } = await supabase
    .from("nomination_classes")
    .select("*")
    .eq("event_id", id)
    .order("order_index", { ascending: true });

  // ⭐ Merge club classes with nomination rows
  const merged = clubClasses.map((cls) => {
    const existing = nominationData?.find((n) => n.class_id === cls.id);

    return (
      existing || {
        event_id: id,
        class_id: cls.id,
        class_name: cls.name,
        is_enabled: false,
        order_index: 999, // disabled classes go to bottom
      }
    );
  });

  // ⭐ Sort enabled first, then by order_index
  merged.sort((a, b) => {
    if (a.is_enabled && !b.is_enabled) return -1;
    if (!a.is_enabled && b.is_enabled) return 1;
    return a.order_index - b.order_index;
  });

  setNominationClasses(merged);
}
// =========================
// 7. MUTATORS / HANDLERS
// =========================

function handleDragEnd(event) {
  const { active, over } = event;
  if (!over || active.id === over.id) return;

  setNominationClasses((prev) => {
    const enabled = prev.filter((c) => c.is_enabled);
    const disabled = prev.filter((c) => !c.is_enabled);

    const oldIndex = enabled.findIndex((c) => c.class_id === active.id);
    const newIndex = enabled.findIndex((c) => c.class_id === over.id);

    if (oldIndex === -1 || newIndex === -1) return prev;

    const updatedEnabled = [...enabled];
    const [moved] = updatedEnabled.splice(oldIndex, 1);
    updatedEnabled.splice(newIndex, 0, moved);

    const reindexedEnabled = updatedEnabled.map((c, i) => ({
      ...c,
      order_index: i + 1,
    }));

    const reindexedDisabled = disabled.map((c, i) => ({
      ...c,
      order_index: reindexedEnabled.length + i + 1,
    }));

    return [...reindexedEnabled, ...reindexedDisabled];
  });
}

function handleTrackChange(e) {
  setEvent((prev) => ({ ...prev, track: e.target.value }));
}

async function handleFileUpload(e) {
  try {
    setUploading(true);
    setUploadError("");

    const file = e.target.files[0];
    if (!file) return;

    const fileExt = file.name.split(".").pop();
    const fileName = `event-${id}-${Date.now()}.${fileExt}`;
    const filePath = `event-logos/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("public")
      .upload(filePath, file);

    if (uploadError) {
      setUploadError("Upload failed.");
      return;
    }

    const { data: urlData } = supabase.storage
      .from("public")
      .getPublicUrl(filePath);

    setEvent((prev) => ({ ...prev, logoUrl: urlData.publicUrl }));
  } finally {
    setUploading(false);
  }
}

async function persistEventAndClasses() {
  setSaving(true);

  try {
    let eventId = id;

    if (isNew) {
      const { data } = await supabase
        .from("events")
        .insert([
          {
            club_slug: clubSlug,
            name: event.name,
            event_date: new Date(event.event_date).toISOString(),
            description: event.description,
            logoUrl: event.logoUrl,
            track: event.track,
            nominations_open: new Date(event.nominations_open).toISOString(),
            nominations_close: new Date(event.nominations_close).toISOString(),
            member_price: event.member_price,
            non_member_price: event.non_member_price,
            junior_price: event.junior_price,
            preference_enabled: event.preference_enabled,
            class_limit: event.class_limit,
          },
        ])
        .select()
        .single();

      eventId = data.id;
    } else {
      await supabase
        .from("events")
        .update({
          name: event.name,
          event_date: new Date(event.event_date).toISOString(),
          description: event.description,
          logoUrl: event.logoUrl,
          track: event.track,
          nominations_open: new Date(event.nominations_open).toISOString(),
          nominations_close: new Date(event.nominations_close).toISOString(),
          member_price: event.member_price,
          non_member_price: event.non_member_price,
          junior_price: event.junior_price,
          preference_enabled: event.preference_enabled,
          class_limit: event.class_limit,
        })
        .eq("id", eventId);
    }

    const enabledClasses = nominationClasses
      .filter((c) => c.is_enabled)
      .sort((a, b) => a.order_index - b.order_index);

    await supabase
      .from("nomination_classes")
      .delete()
      .eq("event_id", eventId);

    if (enabledClasses.length > 0) {
      const classPayload = enabledClasses.map((c, index) => ({
        event_id: eventId,
        class_id: c.class_id,
        class_name: c.class_name,
        order_index: index + 1,
      }));

      await supabase.from("nomination_classes").insert(classPayload);
    }

    return eventId;
  } finally {
    setSaving(false);
  }
}

async function handlePreview() {
  const savedId = await persistEventAndClasses();
  if (savedId) navigate(`/${clubSlug}/events/${savedId}`);
}

async function handleSubmit() {
  const savedId = await persistEventAndClasses();
  if (savedId) navigate(`/${clubSlug}/app/admin/events`);
}
  // =========================
  // 8. JSX RETURN
  // =========================

  return (
    <div className="min-h-screen w-full bg-background text-text-base">
      {/* ADMIN HEADER */}
      <section className="w-full border-b border-surfaceBorder bg-surface">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarDaysIcon className="h-5 w-5" style={{ color: brand }} />
            <h1 className="text-xl font-semibold tracking-tight">
              {isNew ? "Create Event" : "Edit Event"}
            </h1>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link to={`/${clubSlug}/app/admin`} className="no-underline">
              <Button variant="secondary" className="!rounded-md !px-3 !py-1.5 !text-sm">
                Back to Dashboard
              </Button>
            </Link>

            <Link to={`/${clubSlug}/app/admin/events`} className="no-underline">
              <Button variant="secondary" className="!rounded-md !px-3 !py-1.5 !text-sm">
                Back to Events
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* MAIN CONTENT */}
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">


        {/* ========================= */}
        {/* EVENT DETAILS CARD        */}
        {/* ========================= */}

<Card
  noPadding
  className="overflow-hidden"
  style={{ border: `2px solid ${brand}` }}
>
  <div
    className="px-4 py-2 text-white font-semibold"
    style={{ backgroundColor: brand }}
  >
    Event Details
  </div>

  <div className="bg-white p-6 space-y-6">

    {/* Event name */}
    <div>
      <label className="block text-sm font-medium text-gray-700">Event Name</label>
      <Input
        className="mt-1 w-full max-w-full box-border"
        value={event.name}
        onChange={(e) =>
          setEvent((prev) => ({ ...prev, name: e.target.value }))
        }
      />
    </div>

    {/* Event date */}
    <div>
      <label className="block text-sm font-medium text-gray-700">Event Date</label>
      <Input
        type="datetime-local"
        className="mt-1 w-full max-w-full box-border"
        value={event.event_date}
        onChange={(e) =>
          setEvent((prev) => ({ ...prev, event_date: e.target.value }))
        }
      />
    </div>

    {/* Description */}
    <div>
      <label className="block text-sm font-medium text-gray-700">Description</label>
      <Textarea
        className="mt-1 w-full max-w-full box-border"
        rows={4}
        value={event.description}
        onChange={(e) =>
          setEvent((prev) => ({ ...prev, description: e.target.value }))
        }
      />
    </div>

    {/* Track */}
    <div>
      <label className="block text-sm font-medium text-gray-700">Track</label>
      <select
        value={event.track}
        onChange={handleTrackChange}
        className="mt-1 w-full max-w-full box-border rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">Select a track</option>
        {TRACK_OPTIONS.map((track) => (
          <option key={track} value={track}>
            {track}
          </option>
        ))}
      </select>
    </div>

    {/* Event Logo */}
    <div>
      <label className="block text-sm font-medium text-gray-700">Event Logo</label>

      <div className="mt-2 flex items-start gap-4">

        {/* Preview box */}
        <div className="w-24 h-24 bg-white border border-gray-200 rounded-lg overflow-hidden flex items-center justify-center">
          {event.logoUrl ? (
            <img
              src={event.logoUrl}
              alt="Event Logo"
              className="w-full h-full object-contain"
            />
          ) : (
            <span className="text-xs text-gray-400 text-center px-2">
              No logo
            </span>
          )}
        </div>

        {/* Upload controls */}
        <div className="flex-1 flex items-center gap-3">

          {/* Hidden native file input */}
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;

              setEvent(prev => ({
                ...prev,
                logoFileName: file.name,
              }));

              handleFileUpload(e);
            }}
            className="hidden"
          />

          {/* Custom upload button */}
          <Button
            variant="secondary"
            className="!rounded-md !px-4 !py-2 !text-sm"
            onClick={() => fileInputRef.current?.click()}
          >
            Choose File
          </Button>

          {/* Filename display */}
          <span className="text-sm text-gray-600">
            {event.logoFileName || "No file selected"}
          </span>
        </div>

        {/* Upload status */}
        <div className="flex-1">
          {uploading && (
            <p className="text-sm text-gray-500 mt-1">Uploading...</p>
          )}
          {uploadError && (
            <p className="text-sm text-red-600 mt-1">{uploadError}</p>
          )}
        </div>

      </div>
    </div>

  </div>
</Card>
        {/* ========================= */}
        {/* Nomination & Pricing   */}
        {/* ========================= */}
<Card
  noPadding
  className="overflow-hidden"
  style={{ border: `2px solid ${brand}` }}
>
  <div
    className="px-4 py-2 text-white font-semibold"
    style={{ backgroundColor: brand }}
  >
    Nominations & Pricing
  </div>

  <div className="bg-white p-6 space-y-6">

    {/* Nominations window */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <label className="block text-sm font-medium text-gray-700">Nominations Open</label>
        <Input
          type="datetime-local"
          className="mt-1 w-full max-w-full box-border"
          value={event.nominations_open}
          onChange={(e) =>
            setEvent((prev) => ({ ...prev, nominations_open: e.target.value }))
          }
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Nominations Close</label>
        <Input
          type="datetime-local"
          className="mt-1 w-full max-w-full box-border"
          value={event.nominations_close}
          onChange={(e) =>
            setEvent((prev) => ({ ...prev, nominations_close: e.target.value }))
          }
        />
      </div>
    </div>

    {/* Pricing */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div>
        <label className="block text-sm font-medium text-gray-700">Member Price</label>
        <Input
          type="number"
          className="mt-1 w-full max-w-full box-border"
          value={event.member_price}
          onChange={(e) =>
            setEvent((prev) => ({ ...prev, member_price: Number(e.target.value) }))
          }
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Non‑Member Price</label>
        <Input
          type="number"
          className="mt-1 w-full max-w-full box-border"
          value={event.non_member_price}
          onChange={(e) =>
            setEvent((prev) => ({ ...prev, non_member_price: Number(e.target.value) }))
          }
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Junior Price</label>
        <Input
          type="number"
          className="mt-1 w-full max-w-full box-border"
          value={event.junior_price}
          onChange={(e) =>
            setEvent((prev) => ({ ...prev, junior_price: Number(e.target.value) }))
          }
        />
      </div>
    </div>

    {/* Advanced toggle */}
    <div className="pt-4">
      <Button
        type="button"
        variant="primary"
        onClick={() => setShowAdvanced((v) => !v)}
        className="!rounded-md !px-4 !py-2 !text-sm"
      >
        {showAdvanced ? "Hide Advanced Settings" : "Show Advanced Settings"}
      </Button>
    </div>

    {showAdvanced && (
      <div className="space-y-6 border-t pt-6">

        <div>
          <label className="block text-sm font-medium text-gray-700">Class Limit Per Driver</label>
          <Input
            type="number"
            className="mt-1 w-full max-w-full box-border"
            value={event.class_limit}
            onChange={(e) =>
              setEvent((prev) => ({ ...prev, class_limit: Number(e.target.value) }))
            }
          />
        </div>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={event.preference_enabled}
            onChange={(e) =>
              setEvent((prev) => ({ ...prev, preference_enabled: e.target.checked }))
            }
            className="h-4 w-4 text-blue-600 border-gray-300 rounded"
          />
          <label className="text-sm font-medium text-gray-700">
            Enable Preferred Class Selection
          </label>
        </div>

      </div>
    )}

  </div>
</Card>

        {/* ========================= */}
        {/* CLASS SELECTION & ORDER   */}
        {/* ========================= */}
        <Card
  noPadding
  className="overflow-hidden"
  style={{ border: `2px solid ${brand}` }}
>
  <div
    className="px-4 py-2 text-white font-semibold"
    style={{ backgroundColor: brand }}
  >
    Classes
  </div>

  <div className="bg-white p-6 space-y-6">

    <p className="text-sm text-gray-600">
      Enable the classes available for this event and drag to reorder.
    </p>

    {/* Enabled classes */}
    <div>
      <h3 className="text-sm font-medium text-gray-700 mb-2">Enabled Classes</h3>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext
          items={nominationClasses.filter((c) => c.is_enabled).map((c) => c.class_id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2 w-full max-w-full box-border">
            {nominationClasses
              .filter((c) => c.is_enabled)
              .map((cls) => (
                <SortableItem key={cls.class_id} cls={cls}>
                  <span className="font-medium">{cls.class_name}</span>
                </SortableItem>
              ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>

    {/* Disabled classes */}
    <div>
      <h3 className="text-sm font-medium text-gray-700 mb-2">Disabled Classes</h3>

      <div className="space-y-2 w-full max-w-full box-border">
        {nominationClasses
          .filter((c) => !c.is_enabled)
          .map((cls) => (
            <div
              key={cls.class_id}
              className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2"
            >
              <span className="text-gray-700">{cls.class_name}</span>

              <Button
                variant="secondary"
                className="!px-3 !py-1.5 !text-xs"
                onClick={() => toggleClassEnabled(cls.class_id)}
              >
                Enable
              </Button>
            </div>
          ))}
      </div>
    </div>

  </div>
</Card>
        {/* ========================= */}
        {/* SAVE / PREVIEW BUTTONS    */}
        {/* ========================= */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <Button
            variant="secondary"
            className="!px-4 !py-2"
            disabled={saving}
            onClick={handlePreview}
          >
            Preview Event
          </Button>

          <Button
            className="!px-4 !py-2"
            disabled={saving}
            onClick={handleSubmit}
          >
            {saving ? "Saving..." : "Save Event"}
          </Button>
        </div>

      </div>
    </div>
  );
}
