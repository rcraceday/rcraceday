// TracksClassesSettings.jsx
import { useEffect, useState } from "react";
import { supabase } from "@/supabaseClient";

import CMSCard from "@cms/CMSCard";
import { cmsStyles } from "@cms/styles";
import { useMembership } from "@/app/providers/MembershipProvider";

import AddTrackForm from "./components/AddTrackForm";
import TrackCard from "./components/TrackCard";

import { PlusCircleIcon } from "@heroicons/react/24/solid";
import { useTranslation } from "@/app/i18n/I18nContext";

const actionButton = cmsStyles.table.actionButton;
const actionIcon = cmsStyles.table.actionIcon;

export default function TracksClassesSettings() {
  const { t } = useTranslation();
  const { membership, loadingMembership } = useMembership();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [tracks, setTracks] = useState([]);
  const [trackClassesMap, setTrackClassesMap] = useState({});

  const [collapsedTracks, setCollapsedTracks] = useState({});

  const [addingTrack, setAddingTrack] = useState(false);

  const [addingClassTrackId, setAddingClassTrackId] = useState(null);
  const [bulkModeTrackId, setBulkModeTrackId] = useState(null);

  const [newClassName, setNewClassName] = useState("");
  const [newClassDesc, setNewClassDesc] = useState("");
  const [bulkClassesInput, setBulkClassesInput] = useState("");

  const [editingClassId, setEditingClassId] = useState(null);
  const [editClassName, setEditClassName] = useState("");
  const [editClassDesc, setEditClassDesc] = useState("");

  // -----------------------------
  // Load Tracks + Classes + Assignments
  // -----------------------------
  useEffect(() => {
    async function loadAll() {
      setLoading(true);
      setError(null);

      if (loadingMembership) return;
      if (!membership?.club_id) {
        setError("No club context available.");
        setLoading(false);
        return;
      }

      const clubId = membership.club_id;

      const { data: trackData, error: trackErr } = await supabase
        .from("club_tracks")
        .select("*")
        .eq("club_id", clubId)
        .order("name", { ascending: true });

      const { data: classData, error: classErr } = await supabase
        .from("club_classes")
        .select("*")
        .eq("club_id", clubId)
        .order("name", { ascending: true });

      const { data: assignData, error: assignErr } = await supabase
        .from("club_track_classes")
        .select("*");

      if (trackErr || classErr || assignErr) {
        setError("Failed to load tracks or classes.");
        setLoading(false);
        return;
      }

      setTracks(trackData || []);

      const classesById = {};
      (classData || []).forEach((c) => (classesById[c.id] = c));

      const map = {};
      (assignData || []).forEach((row) => {
        const cls = classesById[row.class_id];
        if (!cls) return;
        if (!map[row.track_id]) map[row.track_id] = [];
        map[row.track_id].push(cls);
      });

      setTrackClassesMap(map);
      setLoading(false);
    }

    loadAll();
  }, [loadingMembership, membership?.club_id]);

  // -----------------------------
  // Livetime Notice Component
  // -----------------------------
  const LivetimeNotice = () => (
    <div
      style={{
        marginTop: "8px",
        padding: "8px 10px",
        borderRadius: "6px",
        backgroundColor: "#EFF6FF",
        color: "#1D4ED8",
        fontSize: "12px",
        lineHeight: 1.4,
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: "4px" }}>
        Livetime Compatibility Notice
      </div>
      <div>Class names must match Livetime exactly.</div>
    </div>
  );

  // -----------------------------
  // Track Collapse
  // -----------------------------
  const toggleTrackCollapse = (trackId) => {
    setCollapsedTracks((prev) => ({
      ...prev,
      [trackId]: !prev[trackId],
    }));
  };

  // -----------------------------
  // Add Class to Track
  // -----------------------------
  const startAddClassForTrack = (trackId) => {
    setAddingClassTrackId(trackId);
    setBulkModeTrackId(null);
    setNewClassName("");
    setNewClassDesc("");
    setBulkClassesInput("");
  };

  const cancelAddClassForTrack = () => {
    setAddingClassTrackId(null);
    setNewClassName("");
    setNewClassDesc("");
  };

  const handleAddClassToTrack = async (trackId) => {
    if (!newClassName.trim()) return;

    const clubId = membership.club_id;

    const { data: cls, error: classErr } = await supabase
      .from("club_classes")
      .insert({
        name: newClassName.trim(),
        description: newClassDesc.trim(),
        club_id: clubId,
      })
      .select()
      .single();

    if (classErr) {
      setError(`Failed to add class: ${classErr.message}`);
      return;
    }

    await supabase.from("club_track_classes").insert({
      track_id: trackId,
      class_id: cls.id,
    });

    setTrackClassesMap((prev) => ({
      ...prev,
      [trackId]: [...(prev[trackId] || []), cls],
    }));

    setNewClassName("");
    setNewClassDesc("");
    setAddingClassTrackId(null);
  };

  // -----------------------------
  // Bulk Add Classes
  // -----------------------------
  const startBulkForTrack = (trackId) => {
    setBulkModeTrackId(trackId);
    setAddingClassTrackId(null);
    setNewClassName("");
    setNewClassDesc("");
    setBulkClassesInput("");
  };

  const cancelBulkForTrack = () => {
    setBulkModeTrackId(null);
    setBulkClassesInput("");
  };

  const handleBulkAddClassesToTrack = async (trackId) => {
    const lines = bulkClassesInput
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length === 0) return;

    const clubId = membership.club_id;

    const payload = lines.map((name) => ({
      name,
      description: "",
      club_id: clubId,
    }));

    const { data: classRows, error: classErr } = await supabase
      .from("club_classes")
      .insert(payload)
      .select();

    if (classErr) {
      setError(`Failed to bulk add classes: ${classErr.message}`);
      return;
    }

    const assignPayload = classRows.map((c) => ({
      track_id: trackId,
      class_id: c.id,
    }));

    await supabase.from("club_track_classes").insert(assignPayload);

    setTrackClassesMap((prev) => ({
      ...prev,
      [trackId]: [...(prev[trackId] || []), ...classRows],
    }));

    setBulkClassesInput("");
    setBulkModeTrackId(null);
  };

  // -----------------------------
  // Edit Class
  // -----------------------------
  const startEditClass = (trackId, cls) => {
    setEditingClassId(cls.id);
    setEditClassName(cls.name || "");
    setEditClassDesc(cls.description || "");
  };

  const cancelEditClass = () => {
    setEditingClassId(null);
    setEditClassName("");
    setEditClassDesc("");
  };

  const saveEditClass = async (trackId) => {
    if (!editingClassId) return;

    const clubId = membership.club_id;

    const { data: updated, error: classErr } = await supabase
      .from("club_classes")
      .update({
        name: editClassName.trim(),
        description: editClassDesc.trim(),
        club_id: clubId,
      })
      .eq("id", editingClassId)
      .select()
      .single();

    if (classErr) {
      setError(`Failed to update class: ${classErr.message}`);
      return;
    }

    setTrackClassesMap((prev) => {
      const list = prev[trackId] || [];
      return {
        ...prev,
        [trackId]: list.map((c) => (c.id === editingClassId ? updated : c)),
      };
    });

    setEditingClassId(null);
    setEditClassName("");
    setEditClassDesc("");
  };

  // -----------------------------
  // Delete Class
  // -----------------------------
  const handleDeleteClass = async (trackId, classId) => {
    const confirmed = window.confirm("Delete this class?");
    if (!confirmed) return;

    await supabase.from("club_classes").delete().eq("id", classId);
    await supabase
      .from("club_track_classes")
      .delete()
      .eq("track_id", trackId)
      .eq("class_id", classId);

    setTrackClassesMap((prev) => {
      const list = prev[trackId] || [];
      return {
        ...prev,
        [trackId]: list.filter((c) => c.id !== classId),
      };
    });
  };

  // -----------------------------
  // Delete Track
  // -----------------------------
  const handleDeleteTrack = async (trackId) => {
    const confirmed = window.confirm(
      "Delete this track and all its class assignments?"
    );
    if (!confirmed) return;

    await supabase.from("club_track_classes").delete().eq("track_id", trackId);
    await supabase.from("club_tracks").delete().eq("id", trackId);

    setTracks((prev) => prev.filter((t) => t.id !== trackId));
    setTrackClassesMap((prev) => {
      const copy = { ...prev };
      delete copy[trackId];
      return copy;
    });
  };

  // -----------------------------
  // Render
  // -----------------------------
  return (
    <div style={cmsStyles.pageContainer}>
      <div style={cmsStyles.pageContent}>
        <div style={cmsStyles.sectionHeader}>
          <h1 style={cmsStyles.sectionHeaderTitle}>Track and Class Manager</h1>
          <p style={cmsStyles.sectionHeaderSubtitle}>
            Track & Class Management.
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
            <div style={{ padding: "16px" }}>Loading…</div>
          </CMSCard>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* ADD TRACK AT TOP WHEN NO TRACKS */}
            {tracks.length === 0 && (
              <CMSCard
                title="Add Track"
                actions={
                  !addingTrack && (
                    <button
                      type="button"
                      style={actionButton}
                      onClick={() => setAddingTrack(true)}
                    >
                      <PlusCircleIcon style={actionIcon} />
                      New Track
                    </button>
                  )
                }
              >
                {addingTrack && (
                  <AddTrackForm
                    membership={membership}
                    onError={setError}
                    onTrackAdded={(track, insertedClasses) => {
                      setTracks((prev) => [...prev, track]);
                      setTrackClassesMap((prev) => ({
                        ...prev,
                        [track.id]: insertedClasses,
                      }));
                      setAddingTrack(false);
                    }}
                    onCancel={() => setAddingTrack(false)}
                    LivetimeNotice={LivetimeNotice}
                  />
                )}
              </CMSCard>
            )}

            {/* TRACK CARDS */}
            {tracks.map((track) => (
              <TrackCard
                key={track.id}
                track={track}
                classes={trackClassesMap[track.id] || []}
                collapsed={collapsedTracks[track.id] || false}
                actionButton={actionButton}
                actionIcon={actionIcon}
                addingClassTrackId={addingClassTrackId}
                bulkModeTrackId={bulkModeTrackId}
                newClassName={newClassName}
                newClassDesc={newClassDesc}
                bulkClassesInput={bulkClassesInput}
                editingClassId={editingClassId}
                editClassName={editClassName}
                editClassDesc={editClassDesc}
                onToggleCollapse={toggleTrackCollapse}
                onStartAddClass={startAddClassForTrack}
                onStartBulk={startBulkForTrack}
                onCancelAddClass={cancelAddClassForTrack}
                onCancelBulk={cancelBulkForTrack}
                onAddClass={handleAddClassToTrack}
                onBulkAddClasses={handleBulkAddClassesToTrack}
                onStartEditClass={startEditClass}
                onCancelEditClass={cancelEditClass}
                onSaveEditClass={saveEditClass}
                onDeleteClass={handleDeleteClass}
                onDeleteTrack={handleDeleteTrack}
                setNewClassName={setNewClassName}
                setNewClassDesc={setNewClassDesc}
                setBulkClassesInput={setBulkClassesInput}
                setEditClassName={setEditClassName}
                setEditClassDesc={setEditClassDesc}
                LivetimeNotice={LivetimeNotice}
              />
            ))}

            {/* ADD TRACK AT BOTTOM WHEN TRACKS EXIST */}
            {tracks.length > 0 && (
              <CMSCard
                title="Add Track"
                actions={
                  !addingTrack && (
                    <button
                      type="button"
                      style={actionButton}
                      onClick={() => setAddingTrack(true)}
                    >
                      <PlusCircleIcon style={actionIcon} />
                      New Track
                    </button>
                  )
                }
              >
                {addingTrack && (
                  <AddTrackForm
                    membership={membership}
                    onError={setError}
                    onTrackAdded={(track, insertedClasses) => {
                      setTracks((prev) => [...prev, track]);
                      setTrackClassesMap((prev) => ({
                        ...prev,
                        [track.id]: insertedClasses,
                      }));
                      setAddingTrack(false);
                    }}
                    onCancel={() => setAddingTrack(false)}
                    LivetimeNotice={LivetimeNotice}
                  />
                )}
              </CMSCard>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
