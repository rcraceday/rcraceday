// components/AddTrackForm.jsx
import { useState } from "react";
import { supabase } from "@/supabaseClient";

import CMSInput from "@cms/CMSInput";
import CMSTextarea from "@cms/CMSTextarea";

import {
  AddButton,
  BulkButton,
  SaveButton,
  CancelButton,
} from "@cms/CMSButtonSet";

import {
  MiniAddButton,
  MiniDeleteButton,
} from "@cms/CMSMiniButtonSet";

export default function AddTrackForm({
  membership,
  onError,
  onTrackAdded,
  onCancel,
  LivetimeNotice,
}) {
  const [newTrackName, setNewTrackName] = useState("");
  const [newTrackDesc, setNewTrackDesc] = useState("");
  const [newTrackClasses, setNewTrackClasses] = useState([]);
  const [bulkTrackClassesInput, setBulkTrackClassesInput] = useState("");
  const [saving, setSaving] = useState(false);

  const addEmptyTrackClassRow = () => {
    setNewTrackClasses((prev) => [...prev, { name: "", description: "" }]);
  };

  const updateTrackClassRow = (index, field, value) => {
    setNewTrackClasses((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const removeTrackClassRow = (index) => {
    setNewTrackClasses((prev) => prev.filter((_, i) => i !== index));
  };

  const parseBulkTrackClasses = () => {
    const lines = bulkTrackClassesInput
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    return lines.map((name) => ({ name, description: "" }));
  };

  const handleAddTrack = async () => {
    if (saving) return;
    if (!newTrackName.trim()) {
      onError?.("Track name is required.");
      return;
    }

    if (!membership?.club_id) {
      onError?.("No club_id in membership context.");
      return;
    }

    setSaving(true);

    try {
      const clubId = membership.club_id;

      const { data: track, error: trackErr } = await supabase
        .from("club_tracks")
        .insert({
          name: newTrackName.trim(),
          description: newTrackDesc.trim(),
          club_id: clubId,
        })
        .select()
        .single();

      if (trackErr) {
        onError?.(`Failed to add track: ${trackErr.message}`);
        setSaving(false);
        return;
      }

      const manualClasses = newTrackClasses
        .map((c) => ({
          name: c.name.trim(),
          description: c.description.trim(),
        }))
        .filter((c) => c.name);

      const bulkClasses = parseBulkTrackClasses();
      const allClasses = [...manualClasses, ...bulkClasses];

      let insertedClasses = [];

      if (allClasses.length > 0) {
        const payload = allClasses.map((c) => ({
          name: c.name,
          description: c.description,
          club_id: clubId,
        }));

        const { data: classRows, error: classErr } = await supabase
          .from("club_classes")
          .insert(payload)
          .select();

        if (classErr) {
          onError?.(`Failed to add classes for track: ${classErr.message}`);
          setSaving(false);
          return;
        }

        insertedClasses = classRows || [];

        const assignPayload = insertedClasses.map((c) => ({
          track_id: track.id,
          class_id: c.id,
        }));

        const { error: assignErr } = await supabase
          .from("club_track_classes")
          .insert(assignPayload);

        if (assignErr) {
          onError?.(
            `Failed to assign classes to track: ${assignErr.message}`
          );
          setSaving(false);
          return;
        }
      }

      onTrackAdded?.(track, insertedClasses);

      setNewTrackName("");
      setNewTrackDesc("");
      setNewTrackClasses([]);
      setBulkTrackClassesInput("");
      setSaving(false);
    } catch (e) {
      onError?.("Unexpected error while saving track.");
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (saving) return;
    setNewTrackName("");
    setNewTrackDesc("");
    setNewTrackClasses([]);
    setBulkTrackClassesInput("");
    onCancel?.();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <CMSInput
        label="Track Name"
        value={newTrackName}
        onChange={(value) => setNewTrackName(value)}
      />

      <CMSTextarea
        label="Track Description"
        value={newTrackDesc}
        onChange={(value) => setNewTrackDesc(value)}
      />

      <div style={{ marginTop: "8px", fontWeight: 600, fontSize: "13px" }}>
        Classes for this track
      </div>

      {newTrackClasses.map((c, index) => (
        <div
          key={index}
          style={{
            border: "1px solid #E5E7EB",
            borderRadius: "6px",
            padding: "8px",
            marginBottom: "6px",
          }}
        >
          <CMSInput
            label={`Class Name #${index + 1}`}
            value={c.name}
            onChange={(value) =>
              updateTrackClassRow(index, "name", value)
            }
          />
          <CMSTextarea
            label="Description (optional)"
            value={c.description}
            onChange={(value) =>
              updateTrackClassRow(index, "description", value)
            }
          />

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginTop: "4px",
            }}
          >
            <MiniDeleteButton onClick={() => removeTrackClassRow(index)}>
              Remove
            </MiniDeleteButton>
          </div>
        </div>
      ))}

      <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
        <MiniAddButton onClick={addEmptyTrackClassRow}>
          Add Class Row
        </MiniAddButton>

        <MiniAddButton
          onClick={() =>
            setBulkTrackClassesInput(
              bulkTrackClassesInput || "2WD Stock\n4WD Mod"
            )
          }
        >
          Bulk Insert Helper
        </MiniAddButton>
      </div>

      <CMSTextarea
        label="Bulk Insert Classes (one per line)"
        value={bulkTrackClassesInput}
        onChange={(e) => setBulkTrackClassesInput(e.target.value)}
      />

      <LivetimeNotice />

      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: "8px",
          marginTop: "12px",
        }}
      >
        <SaveButton onClick={handleAddTrack} disabled={saving}>
          {saving ? "Saving…" : "Save Track"}
        </SaveButton>

        <CancelButton onClick={handleCancel} disabled={saving}>
          Cancel
        </CancelButton>
      </div>
    </div>
  );
}
