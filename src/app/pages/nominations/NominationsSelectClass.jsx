import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/supabaseClient";
import useTheme from "@app/providers/useTheme";
import { COUNTRIES } from "@/data/countries";

export default function NominationsSelectClass() {
  const { clubSlug, eventId, driverId } = useParams();
  const navigate = useNavigate();
  const { theme } = useTheme();

  const [driver, setDriver] = useState(null);
  const [profile, setProfile] = useState(null);
  const [event, setEvent] = useState(null);
  const [classes, setClasses] = useState([]);
  const [nominations, setNominations] = useState([]);
  const [entries, setEntries] = useState([]);

  const [selected, setSelected] = useState([]);
  const [preference, setPreference] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("You must be logged in.");
      setLoading(false);
      return;
    }

    const { data: household } = await supabase
      .from("household_memberships")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (!household) {
      setError("No household membership found.");
      setLoading(false);
      return;
    }

    const { data: driverRow } = await supabase
      .from("drivers")
      .select(
        `
        *,
        profile:driver_profiles(*)
      `
      )
      .eq("id", driverId)
      .eq("membership_id", household.id)
      .single();

    if (!driverRow) {
      setError("Driver not found or not part of your household.");
      setLoading(false);
      return;
    }

    const { data: eventRow } = await supabase
      .from("events")
      .select("*")
      .eq("id", eventId)
      .single();

    const { data: classRows } = await supabase
      .from("nomination_classes")
      .select("*, event_classes(*)")
      .eq("event_id", eventId)
      .eq("is_enabled", true)
      .order("order_index", { ascending: true });

    const { data: nomRows } = await supabase
      .from("nominations")
      .select("*")
      .eq("event_id", eventId)
      .eq("driver_id", driverId);

    const nomIds = (nomRows || []).map((n) => n.id);

    let entryRows = [];
    if (nomIds.length > 0) {
      const { data: e } = await supabase
        .from("nomination_entries")
        .select("*")
        .in("nomination_id", nomIds)
        .order("order_index", { ascending: true });

      entryRows = e || [];
    }

    setDriver(driverRow);
    setProfile(driverRow.profile);
    setEvent(eventRow);
    setClasses(classRows || []);
    setNominations(nomRows || []);
    setEntries(entryRows);

    const sorted = entryRows.sort((a, b) => a.order_index - b.order_index);
    const existingSelected = sorted.map((e) => e.class_id);
    const existingPref = sorted.find((e) => e.is_preference)?.class_id || null;

    setSelected(existingSelected);
    setPreference(existingPref);

    setLoading(false);
  }

  function toggleClass(classId) {
    if (!event) return;

    const limit = event.class_limit ?? 3;

    if (selected.includes(classId)) {
      setSelected(selected.filter((id) => id !== classId));

      if (preference === classId) {
        setPreference(null);
      }

      return;
    }

    if (selected.length >= limit) {
      setError(`You can select up to ${limit} classes.`);
      setTimeout(() => setError(""), 2000);
      return;
    }

    setSelected([...selected, classId]);
  }

  async function save() {
    if (!event) return;
    setLoading(true);

    const limit = event.class_limit ?? 3;

    const trimmed = selected.slice(0, limit);

    const pref = trimmed.includes(preference) ? preference : null;

    const primaryClassIds = trimmed.filter((id) => id !== pref);

    const nomIds = nominations.map((n) => n.id);

    if (nomIds.length > 0) {
      await supabase.from("nomination_entries").delete().in("nomination_id", nomIds);
      await supabase.from("nominations").delete().in("id", nomIds);
    }

    if (trimmed.length === 0) {
      setLoading(false);
      navigate(`/${clubSlug}/nominations/${eventId}/start`);
      return;
    }

    const existingGroupId =
      nominations[0]?.group_id || crypto.randomUUID();
    const existingPaid = nominations[0]?.paid || false;

    const { data: newNom, error: nomError } = await supabase
      .from("nominations")
      .insert({
        driver_id: driverId,
        event_id: eventId,
        group_id: existingGroupId,
        paid: existingPaid,
      })
      .select("*")
      .single();

    if (nomError || !newNom) {
      setError("Failed to save nomination.");
      setLoading(false);
      return;
    }

    const rows = [];

    primaryClassIds.forEach((classId, index) => {
      rows.push({
        nomination_id: newNom.id,
        class_id: classId,
        is_preference: false,
        order_index: index + 1,
      });
    });

    if (pref) {
      rows.push({
        nomination_id: newNom.id,
        class_id: pref,
        is_preference: true,
        order_index: primaryClassIds.length + 1,
      });
    }

    if (rows.length > 0) {
      await supabase.from("nomination_entries").insert(rows);
    }

    setLoading(false);
    navigate(`/${clubSlug}/nominations/${eventId}/start`);
  }

  function getPricingText() {
    const memberPrice = event?.member_price ?? 10;
    const nonMemberPrice = event?.non_member_price ?? 20;
    return `$${memberPrice} Member / $${nonMemberPrice} Non‑Member`;
  }

  if (loading || !driver || !event) {
    return (
      <div className="container" style={{ paddingTop: "1rem" }}>
        <p style={{ opacity: 0.7 }}>Loading…</p>
      </div>
    );
  }

  const country = COUNTRIES.find((c) => c.code === profile?.country_code);

  return (
    <div className="container" style={{ paddingTop: "1rem" }}>
      
      {/* PAGE TITLE */}
      <h1
        style={{
          fontSize: "1.7rem",
          fontWeight: "700",
          marginBottom: "1.5rem",
          color: theme?.textColor || "#000",
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
        }}
      >
        <img
          src={profile?.avatar_url || "/default-avatar.png"}
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "50%",
            objectFit: "cover",
            border: "1px solid #eee",
          }}
        />
        {profile?.nickname ||
          `${driver.first_name} ${driver.last_name}`}
        {country && <span style={{ fontSize: "1.4rem" }}>{country.flag}</span>}
      </h1>

      {/* ERROR */}
      {error && (
        <div
          style={{
            background: "#ffebee",
            color: "#b71c1c",
            padding: "0.8rem",
            borderRadius: "10px",
            marginBottom: "1rem",
          }}
        >
          {error}
        </div>
      )}

      {/* INSTRUCTIONS */}
      <div style={{ opacity: 0.85, fontSize: "0.9rem", marginBottom: "1rem" }}>
        You can select up to <strong>{event.class_limit}</strong> classes.  
        You may optionally choose <strong>one preference class</strong>, which is free.
      </div>

      {/* CLASS LIST */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {classes.map((cls) => {
          const classId = cls.class_id;
          const className = cls.event_classes.class_name;

          const isSelected = selected.includes(classId);
          const isPreference = preference === classId;

          return (
            <div
              key={classId}
              onClick={() => toggleClass(classId)}
              style={{
                background: isSelected ? "#e3f2fd" : "#fff",
                borderRadius: "12px",
                padding: "1.25rem",
                border: isSelected ? "1px solid #64b5f6" : "1px solid #eee",
                boxShadow: "0 2px 6px rgba(0,0,0,0.06)",
                cursor: "pointer",
                transition: "0.15s ease",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "0.5rem",
                }}
              >
                <div style={{ fontWeight: 600 }}>{className}</div>

                <div style={{ opacity: 0.8, fontSize: "0.9rem" }}>
                  {isPreference
                    ? "FREE (Preference)"
                    : driver.is_junior
                    ? "FREE (Junior)"
                    : getPricingText()}
                </div>
              </div>

              <div style={{ display: "flex", gap: "1.5rem", marginTop: "0.5rem" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleClass(classId)}
                  />
                  <span style={{ fontSize: "0.9rem" }}>Select</span>
                </label>

                <label style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <input
                    type="radio"
                    name="preference"
                    checked={isPreference}
                    disabled={!isSelected}
                    onChange={() => setPreference(classId)}
                  />
                  <span style={{ fontSize: "0.9rem" }}>Preference</span>
                </label>
              </div>
            </div>
          );
        })}
      </div>

      {/* SAVE BUTTON */}
      <button
        disabled={selected.length === 0}
        onClick={save}
        style={{
          width: "100%",
          marginTop: "1.5rem",
          padding: "0.9rem",
          borderRadius: "10px",
          fontWeight: "600",
          background:
            selected.length === 0
              ? "#ccc"
              : theme?.headerBackground || "#000",
          color:
            selected.length === 0
              ? "#666"
              : theme?.headerTextColor || "#fff",
          cursor: selected.length === 0 ? "not-allowed" : "pointer",
        }}
      >
        Save
      </button>
    </div>
  );
}
