// src/app/pages/admin/settings/TracksAndClasses.jsx

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { useClub } from "@/app/providers/ClubProvider";
import { supabase } from "@/supabaseClient";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

import { useTranslation } from "@/app/i18n/I18nContext";
import {
  Squares2X2Icon,
  PlusIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/24/solid";

export default function TracksAndClasses() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { clubSlug } = useParams();
  const { club } = useClub();

  const brand = club?.theme?.hero?.backgroundColor || "#0A66C2";

  const [tracks, setTracks] = useState([]);
  const [classes, setClasses] = useState([]);
  const [trackClasses, setTrackClasses] = useState([]);

  const [selectedTrackId, setSelectedTrackId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignState, setAssignState] = useState({}); // { classId: boolean }

  /* LOAD ALL DATA */
  useEffect(() => {
    async function loadAll() {
      setLoading(true);

      const [tracksRes, classesRes, tcRes] = await Promise.all([
        supabase
          .from("tracks")
          .select("*")
          .eq("club_id", club.id)
          .order("order", { ascending: true }),

        supabase
          .from("classes")
          .select("*")
          .eq("club_id", club.id)
          .order("name", { ascending: true }),

        supabase
          .from("track_classes")
          .select("*")
          .eq("club_id", club.id)
          .order("order", { ascending: true }),
      ]);

      if (tracksRes.error) console.error(">>> load tracks error", tracksRes.error);
      if (classesRes.error) console.error(">>> load classes error", classesRes.error);
      if (tcRes.error) console.error(">>> load track_classes error", tcRes.error);

      setTracks(tracksRes.data || []);
      setClasses(classesRes.data || []);
      setTrackClasses(tcRes.data || []);

      // Auto-select first track if none selected
      if (!selectedTrackId && tracksRes.data?.length > 0) {
        setSelectedTrackId(tracksRes.data[0].id);
      }

      setLoading(false);
    }

    loadAll();
  }, [club]);

  /* ADD TRACK */
  async function addTrack() {
    const name = prompt("Track name:");
    if (!name) return;

    const { data, error } = await supabase.from("tracks").insert([
      {
        club_id: club.id,
        name,
        order: tracks.length,
      },
    ]);

    if (error) {
      console.error(">>> addTrack error", error);
      return;
    }

    setTracks([...tracks, data[0]]);
  }

  /* DELETE TRACK */
  async function deleteTrack(trackId) {
    if (!confirm("Delete this track?")) return;

    await supabase.from("tracks").delete().eq("id", trackId);
    await supabase.from("track_classes").delete().eq("track_id", trackId);

    setTracks(tracks.filter((t) => t.id !== trackId));
    setTrackClasses(trackClasses.filter((tc) => tc.track_id !== trackId));

    if (selectedTrackId === trackId) {
      setSelectedTrackId(tracks[0]?.id || null);
    }
  }

  /* REMOVE CLASS FROM TRACK */
  async function removeClassFromTrack(classId) {
    await supabase
      .from("track_classes")
      .delete()
      .eq("track_id", selectedTrackId)
      .eq("class_id", classId);

    setTrackClasses(
      trackClasses.filter(
        (tc) => !(tc.track_id === selectedTrackId && tc.class_id === classId)
      )
    );
  }

  /* OPEN ASSIGN MODAL */
  function openAssignModal() {
    const assigned = trackClasses
      .filter((tc) => tc.track_id === selectedTrackId)
      .map((tc) => tc.class_id);

    const initialState = {};
    classes.forEach((cls) => {
      initialState[cls.id] = assigned.includes(cls.id);
    });

    setAssignState(initialState);
    setAssignModalOpen(true);
  }

  /* SAVE ASSIGNMENTS */
  async function saveAssignments() {
    const assignedClassIds = Object.keys(assignState).filter(
      (id) => assignState[id]
    );

    // Delete all existing assignments for this track
    await supabase
      .from("track_classes")
      .delete()
      .eq("track_id", selectedTrackId);

    // Insert new assignments
    const inserts = assignedClassIds.map((classId, index) => ({
      club_id: club.id,
      track_id: selectedTrackId,
      class_id: Number(classId),
      order: index,
    }));

    if (inserts.length > 0) {
      await supabase.from("track_classes").insert(inserts);
    }

    // Update local state
    setTrackClasses([
      ...trackClasses.filter((tc) => tc.track_id !== selectedTrackId),
      ...inserts,
    ]);

    setAssignModalOpen(false);
  }

  /* GET CLASSES FOR SELECTED TRACK */
  const assignedClasses = trackClasses
    .filter((tc) => tc.track_id === selectedTrackId)
    .sort((a, b) => a.order - b.order)
    .map((tc) => classes.find((c) => c.id === tc.class_id))
    .filter(Boolean);

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        background: "var(--background)",
        color: "var(--text-base)",
      }}
    >
      {/* PAGE HEADER */}
      <section
        style={{
          width: "100%",
          borderBottom: "1px solid var(--surface-border)",
          background: "var(--surface)",
        }}
      >
        <div
          style={{
            maxWidth: "960px",
            margin: "0 auto",
            padding: "16px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <Squares2X2Icon
            style={{
              width: "20px",
              height: "20px",
              color: brand,
            }}
          />

          <h1
            style={{
              fontSize: "20px",
              fontWeight: 600,
              letterSpacing: "-0.3px",
            }}
          >
            Tracks & Classes
          </h1>
        </div>
      </section>

      {/* MAIN */}
      <main
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
          padding: "40px 16px",
          display: "flex",
          gap: "24px",
        }}
      >
        {/* LEFT COLUMN — TRACKS */}
        <Card
          noPadding
          style={{
            width: "280px",
            border: `2px solid ${brand}`,
            background: "white",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              background: brand,
              color: "white",
              padding: "16px 20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <h2 style={{ fontSize: "16px", fontWeight: 600 }}>Tracks</h2>

            <Button
              variant="primary"
              onClick={addTrack}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 10px",
              }}
            >
              <PlusIcon style={{ width: "14px", height: "14px", color: "white" }} />
            </Button>
          </div>

          <div
            style={{
              padding: "16px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            {tracks.map((track) => (
              <div
                key={track.id}
                onClick={() => setSelectedTrackId(track.id)}
                style={{
                  padding: "12px",
                  borderRadius: "8px",
                  border:
                    selectedTrackId === track.id
                      ? `2px solid ${brand}`
                      : "1px solid var(--surface-border)",
                  background:
                    selectedTrackId === track.id
                      ? "var(--surface)"
                      : "white",
                  cursor: "pointer",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span style={{ fontWeight: 600 }}>{track.name}</span>

                <TrashIcon
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteTrack(track.id);
                  }}
                  style={{
                    width: "16px",
                    height: "16px",
                    color: "var(--text-muted)",
                    cursor: "pointer",
                  }}
                />
              </div>
            ))}
          </div>
        </Card>

        {/* RIGHT COLUMN — CLASSES FOR TRACK */}
        <Card
          noPadding
          style={{
            flex: 1,
            border: `2px solid ${brand}`,
            background: "white",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              background: brand,
              color: "white",
              padding: "16px 20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <h2 style={{ fontSize: "16px", fontWeight: 600 }}>
              {selectedTrackId
                ? `Classes for ${
                    tracks.find((t) => t.id === selectedTrackId)?.name
                  }`
                : "Select a Track"}
            </h2>

            {selectedTrackId && (
              <Button
                variant="primary"
                onClick={openAssignModal}
                style={{
                  padding: "8px 12px",
                }}
              >
                Assign Classes
              </Button>
            )}
          </div>

          <div
            style={{
              padding: "20px",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            }}
          >
            {assignedClasses.length === 0 && (
              <p style={{ color: "var(--text-muted)" }}>
                No classes assigned to this track.
              </p>
            )}

            {assignedClasses.map((cls) => (
              <div
                key={cls.id}
                style={{
                  padding: "14px",
                  borderRadius: "8px",
                  border: "1px solid var(--surface-border)",
                  background: "white",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span style={{ fontWeight: 600 }}>{cls.name}</span>

                <Button
                  variant="secondary"
                  onClick={() => removeClassFromTrack(cls.id)}
                  style={{ padding: "6px 10px" }}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        </Card>
      </main>

      {/* ASSIGN CLASSES MODAL */}
      {assignModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
        >
          <Card
            noPadding
            style={{
              width: "420px",
              border: `2px solid ${brand}`,
              background: "white",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                background: brand,
                color: "white",
                padding: "16px 20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <h2 style={{ fontSize: "16px", fontWeight: 600 }}>
                Assign Classes
              </h2>

              <XMarkIcon
                onClick={() => setAssignModalOpen(false)}
                style={{
                  width: "20px",
                  height: "20px",
                  cursor: "pointer",
                }}
              />
            </div>

            <div
              style={{
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                maxHeight: "400px",
                overflowY: "auto",
              }}
            >
              {classes.map((cls) => (
                <label
                  key={cls.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={assignState[cls.id] || false}
                    onChange={(e) =>
                      setAssignState({
                        ...assignState,
                        [cls.id]: e.target.checked,
                      })
                    }
                  />
                  <span style={{ fontWeight: 600 }}>{cls.name}</span>
                </label>
              ))}
            </div>

            <div
              style={{
                padding: "16px 20px",
                display: "flex",
                justifyContent: "flex-end",
                gap: "12px",
              }}
            >
              <Button
                variant="secondary"
                onClick={() => setAssignModalOpen(false)}
              >
                Cancel
              </Button>

              <Button variant="primary" onClick={saveAssignments}>
                Save
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
