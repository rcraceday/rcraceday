// src/app/pages/events/EventNominate.jsx

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/supabaseClient";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

import { useClub } from "@/app/providers/ClubProvider";
import { useProfile } from "@/app/providers/ProfileProvider";
import { useDrivers } from "@/app/providers/DriverProvider";

export default function EventNominate() {
  const { eventId, clubSlug } = useParams();
  const navigate = useNavigate();

  const { club } = useClub();
  const { profile } = useProfile();
  const { drivers, loadingDrivers } = useDrivers();

  const brand = club?.theme?.hero?.backgroundColor || "#0A66C2";

  const [event, setEvent] = useState(null);
  const [classes, setClasses] = useState([]);
  const [loadingEvent, setLoadingEvent] = useState(true);
  const [loadingClasses, setLoadingClasses] = useState(true);

  const [selectedDriver, setSelectedDriver] = useState("");
  const [selectedClasses, setSelectedClasses] = useState([]);
  const [saving, setSaving] = useState(false);

  /* ===========================
     LOAD EVENT
     =========================== */

  useEffect(() => {
    async function loadEvent() {
      setLoadingEvent(true);

      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("id", eventId)
        .single();

      if (!error) setEvent(data);

      setLoadingEvent(false);
    }

    loadEvent();
  }, [eventId]);

  /* ===========================
     LOAD EVENT CLASSES
     =========================== */

  useEffect(() => {
    async function loadClasses() {
      setLoadingClasses(true);

      const { data, error } = await supabase
        .from("nomination_classes")
        .select(`
          id,
          class_id,
          event_id,
          is_enabled,
          event_classes (
            id,
            name
          )
        `)
        .eq("event_id", eventId)
        .eq("is_enabled", true)
        .order("order_index", { ascending: true });

      if (!error && data) {
        setClasses(
          data.map((c) => ({
            id: c.class_id,
            name: c.event_classes?.name || "Unnamed Class",
          }))
        );
      }

      setLoadingClasses(false);
    }

    loadClasses();
  }, [eventId]);

  /* ===========================
     HANDLE CLASS TOGGLE
     =========================== */

  function toggleClass(classId) {
    setSelectedClasses((prev) =>
      prev.includes(classId)
        ? prev.filter((id) => id !== classId)
        : [...prev, classId]
    );
  }

  /* ===========================
     SAVE NOMINATION
     =========================== */

  async function submitNomination() {
    if (!selectedDriver || selectedClasses.length === 0) return;

    setSaving(true);

    // 1. Create nomination row
    const { data: nomination, error: nomError } = await supabase
      .from("nominations")
      .insert({
        event_id: eventId,
        driver_id: selectedDriver,
      })
      .select()
      .single();

    if (nomError || !nomination) {
      setSaving(false);
      return;
    }

    // 2. Insert class entries
    const entries = selectedClasses.map((classId, index) => ({
      nomination_id: nomination.id,
      class_id: classId,
      order_index: index,
    }));

    await supabase.from("nomination_entries").insert(entries);

    setSaving(false);

    navigate(`/${clubSlug}/app/events/${eventId}`, {
      state: { toast: "Nomination saved." },
    });
  }

  /* ===========================
     LOADING STATES
     =========================== */

  if (loadingEvent || loadingClasses || loadingDrivers) {
    return (
      <div className="min-h-screen flex justify-center items-center text-text-muted">
        Loading nomination form…
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex justify-center items-center text-text-muted">
        Event not found.
      </div>
    );
  }

  /* ===========================
     PAGE
     =========================== */

  return (
    <div className="min-h-screen w-full bg-background text-text-base">
      <main className="max-w-2xl mx-auto px-4 py-10 space-y-10">

        {/* HEADER */}
        <h1 className="text-2xl font-semibold">
          Nominate for {event.name}
        </h1>

        {/* DRIVER SELECT */}
        <section>
          <h2 className="text-sm font-semibold uppercase text-text-muted mb-2">
            Select Driver
          </h2>

          <Card className="p-4" style={{ border: `2px solid ${brand}` }}>
            <select
              className="w-full p-2 border rounded-md"
              value={selectedDriver}
              onChange={(e) => setSelectedDriver(e.target.value)}
            >
              <option value="">Select a driver…</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.first_name} {d.last_name} — #{d.number}
                  {d.is_junior ? " (Junior)" : ""}
                </option>
              ))}
            </select>
          </Card>
        </section>

        {/* CLASS SELECT */}
        <section>
          <h2 className="text-sm font-semibold uppercase text-text-muted mb-2">
            Select Classes
          </h2>

          <Card className="p-4 space-y-3" style={{ border: `2px solid ${brand}` }}>
            {classes.length === 0 && (
              <p className="text-text-muted">No classes available.</p>
            )}

            {classes.map((c) => (
              <label key={c.id} className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={selectedClasses.includes(c.id)}
                  onChange={() => toggleClass(c.id)}
                />
                <span>{c.name}</span>
              </label>
            ))}
          </Card>
        </section>

        {/* SUBMIT */}
        <section>
          <Button
            className="w-full !py-3 !rounded-lg text-white font-semibold"
            style={{ backgroundColor: brand }}
            disabled={!selectedDriver || selectedClasses.length === 0 || saving}
            onClick={submitNomination}
          >
            {saving ? "Saving…" : "Submit Nomination"}
          </Button>
        </section>

      </main>
    </div>
  );
}
