import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/supabaseClient";

import CMSCard from "../cms/CMSCard";
import CMSButton from "../cms/CMSButton";
import { PlusIcon } from "@heroicons/react/24/solid";
import { cmsStyles } from "../cms/styles";

export default function AdminEvents() {
  const navigate = useNavigate();
  const { clubSlug } = useParams();

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const [clubClasses, setClubClasses] = useState([]);
  const [clubTracks, setClubTracks] = useState([]);

  const [nominations, setNominations] = useState([]);

  const [expanded, setExpanded] = useState({});

  // Filters
  const [query, setQuery] = useState("");
  const [trackFilter, setTrackFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("asc");
  const [dateFilter, setDateFilter] = useState("all");

  useEffect(() => {
    loadEvents();
    loadRelated();
    loadNominations();
  }, []);

async function loadEvents() {
  const { data, error } = await supabase
    .from("events")
    .select("*, pricing")
    .order("created_at", { ascending: true });

  if (error) {
    console.error(error);
    return;
  }

  setEvents(data || []);
  setLoading(false);
}

  async function loadRelated() {
    const { data: classes } = await supabase
      .from("club_classes")
      .select("id, name");

    const { data: tracks } = await supabase
      .from("club_tracks")
      .select("id, name");

    setClubClasses(classes || []);
    setClubTracks(tracks || []);
  }

  async function loadNominations() {
    const { data, error } = await supabase
      .from("nominations")
      .select("id, event_id, classes");

    if (error) {
      console.error(error);
      return;
    }

    setNominations(data || []);
  }

  const classMap = Object.fromEntries(
    clubClasses.map((c) => [c.id, c.name])
  );

  const trackMap = Object.fromEntries(
    clubTracks.map((t) => [t.id, t.name])
  );

  const handleCreate = () => {
    navigate(`/${clubSlug}/app/admin/events/new`);
  };

  const handleEdit = (ev) => {
    navigate(`/${clubSlug}/app/admin/events/${ev.id}`);
  };

  const handleDuplicate = async (ev) => {
    const newEvent = {
      ...ev,
      id: undefined,
      name: `${ev.name} (Copy)`,
      created_at: new Date().toISOString(),

      days: Array.isArray(ev.days)
        ? ev.days.map((d) => ({
            date: d.date,
            label: d.label,
            opens_at: d.opens_at,
            briefing_at: d.briefing_at,
            closes_at: d.closes_at,
          }))
        : [],
    };

    const { data, error } = await supabase
      .from("events")
      .insert(newEvent)
      .select()
      .single();

    if (error) {
      console.error("Duplicate failed:", error);
      return;
    }

    loadEvents();
  };

  const toggleExpanded = (id) => {
    setExpanded((s) => ({ ...s, [id]: !s[id] }));
  };

const formatDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;

  return d.toLocaleDateString(undefined, {
    weekday: "short",   // NEW → adds Mon, Tue, Wed
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatTimeOnly = (t) => {
  if (!t) return "—";
  try {
    const [h, m] = t.split(":");
    const d = new Date();
    d.setHours(Number(h), Number(m));
    return d.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return t;
  }
};

const formatTime = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";

  return d.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

const formatDateTime = (iso) => {
  if (!iso) return "—";
  return `${formatDate(iso)} — ${formatTime(iso)}`;
};

  const formatType = (t) =>
    t ? t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "—";

  const formatEventDateRange = (ev) => {
    if (Array.isArray(ev.days) && ev.days.length > 0) {
      const sorted = [...ev.days].sort(
        (a, b) => new Date(a.date) - new Date(b.date)
      );
      const first = sorted[0].date;
      const last = sorted[sorted.length - 1].date;

      const firstStr = formatDate(first);
      const lastStr = formatDate(last);

      return firstStr === lastStr ? firstStr : `${firstStr} - ${lastStr}`;
    }

    return ev.event_date ? formatDate(ev.event_date) : "—";
  };

  const getNominationSummary = (eventId) => {
    const eventNoms = nominations.filter((n) => n.event_id === eventId);

    const nominated = eventNoms.length;

    const classesEntered = eventNoms.reduce((sum, n) => {
      if (!n.classes) return sum;
      try {
        const arr =
          typeof n.classes === "string" ? JSON.parse(n.classes) : n.classes;
        if (Array.isArray(arr)) {
          return sum + arr.length;
        }
        return sum;
      } catch {
        return sum;
      }
    }, 0);

    return { nominated, classesEntered };
  };

  const now = new Date();

  let filteredEvents = events.filter((ev) => {
    const q = query.toLowerCase();

    const matchesQuery =
      ev.name?.toLowerCase().includes(q) ||
      ev.track?.toLowerCase().includes(q);

    const matchesTrack =
      trackFilter === "all" ||
      (ev.track || "").toLowerCase() === trackFilter.toLowerCase();

    const matchesType =
      typeFilter === "all" ||
      (ev.event_type || "").toLowerCase() === typeFilter.toLowerCase();

    const eventStartDate = Array.isArray(ev.days) && ev.days.length > 0
      ? new Date(ev.days[0].date)
      : new Date(ev.event_date);

    const matchesDate =
      dateFilter === "upcoming"
        ? eventStartDate >= now
        : dateFilter === "past"
        ? eventStartDate < now
        : true;

    return matchesQuery && matchesTrack && matchesType && matchesDate;
  });

  filteredEvents.sort((a, b) => {
    const getDate = (ev) => {
      if (Array.isArray(ev.days) && ev.days.length > 0) {
        const sorted = [...ev.days].sort(
          (a, b) => new Date(a.date) - new Date(b.date)
        );
        return new Date(sorted[0].date);
      }
      return new Date(ev.event_date);
    };

    const da = getDate(a);
    const db = getDate(b);

    return sortOrder === "asc" ? da - db : db - da;
  });

  return (
    <div style={cmsStyles.pageContainer}>
      <div style={cmsStyles.pageContent}>
        <div style={cmsStyles.sectionHeader}>
          <h1 style={cmsStyles.sectionHeaderTitle}>Manage Events</h1>
          <p style={cmsStyles.sectionHeaderSubtitle}>
            Create, edit, and manage all club events.
          </p>
        </div>

        {/* Filters */}
        <div
          style={{
            marginBottom: "16px",
            display: "flex",
            flexWrap: "wrap",
            gap: "8px",
            alignItems: "center",
          }}
        >
          <input
            placeholder="Search events…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              padding: "10px 12px",
              borderRadius: "6px",
              border: "1px solid #D1D5DB",
              fontSize: "12px",
              flex: "1",
              minWidth: "180px",
            }}
          />

          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            style={{
              padding: "10px 12px",
              borderRadius: "6px",
              border: "1px solid #D1D5DB",
              fontSize: "12px",
            }}
          >
            <option value="all">All Events</option>
            <option value="upcoming">Upcoming</option>
            <option value="past">Past</option>
          </select>

          <select
            value={trackFilter}
            onChange={(e) => setTrackFilter(e.target.value)}
            style={{
              padding: "10px 12px",
              borderRadius: "6px",
              border: "1px solid #D1D5DB",
              fontSize: "12px",
            }}
          >
            <option value="all">All Tracks</option>
            {clubTracks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            style={{
              padding: "10px 12px",
              borderRadius: "6px",
              border: "1px solid #D1D5DB",
              fontSize: "12px",
            }}
          >
            <option value="all">All Types</option>
            <option value="racing">Racing</option>
            <option value="practice">Practice</option>
            <option value="club_meet">Club Meet</option>
          </select>

          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            style={{
              padding: "10px 12px",
              borderRadius: "6px",
              border: "1px solid #D1D5DB",
              fontSize: "12px",
            }}
          >
            <option value="asc">Date ↑</option>
            <option value="desc">Date ↓</option>
          </select>
        </div>

        {/* Events */}
        <CMSCard
          title="Events"
          actions={
            <CMSButton
              onClick={handleCreate}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                whiteSpace: "nowrap",
              }}
            >
              <PlusIcon style={{ width: 16, height: 16, color: "#DC2626" }} />
              Create Event
            </CMSButton>
          }
        >
          {loading ? (
            <div style={{ padding: "16px" }}>Loading events…</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {filteredEvents.map((ev) => {
                const isExpanded = expanded[ev.id];
                const { nominated, classesEntered } = getNominationSummary(ev.id);

                return (
                  <div
                    key={ev.id}
                    style={{
                      border: "1px solid #E5E7EB",
                      borderRadius: 8,
                      padding: 12,
                      background: "#fff",
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                    }}
                  >
                    {/* Compact Row */}
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <button
                        type="button"
                        onClick={() => toggleExpanded(ev.id)}
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 6,
                          border: "1px solid #E5E7EB",
                          background: isExpanded ? "#F3F4F6" : "#FFFFFF",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                        }}
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          style={{
                            transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                            transition: "transform 120ms ease",
                          }}
                        >
                          <path d="M8 5v14l11-7L8 5z" fill="#374151" />
                        </svg>
                      </button>

                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <div style={{ fontSize: 15, fontWeight: 700 }}>
                            {ev.name}
                          </div>

                          <div style={{ fontSize: 13, color: "#6B7280" }}>
                            {formatEventDateRange(ev)}
                          </div>

                          <div
                            style={{
                              marginTop: 4,
                              display: "flex",
                              gap: 16,
                              fontSize: 12,
                              color: "#6B7280",
                            }}
                          >
                            <span>Nominated: {nominated}</span>
                            <span>Classes Entered: {classesEntered}</span>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: 8 }}>
                        <CMSButton onClick={() => handleEdit(ev)}>Edit</CMSButton>

                        <CMSButton
                          onClick={() => handleDuplicate(ev)}
                          style={{ background: "#E5E7EB", color: "#111827" }}
                        >
                          Duplicate
                        </CMSButton>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div
                        style={{
                          borderTop: "1px dashed #E5E7EB",
                          paddingTop: 10,
                          display: "flex",
                          flexDirection: "column",
                          gap: 20,
                        }}
                      >
                        {/* Event Info */}
                        <div>
                          <div style={{ fontSize: 13, color: "#6B7280" }}>
                            Event Info
                          </div>

                          <div style={{ fontSize: 14 }}>
                            Type: {formatType(ev.event_type)}
                          </div>

                          <div style={{ fontSize: 14 }}>
                            Description: {ev.description || "—"}
                          </div>
                        </div>

                        {/* Track */}
                        <div>
                          <div style={{ fontSize: 13, color: "#6B7280" }}>
                            Track
                          </div>
                          <div style={{ fontSize: 14 }}>
                            {trackMap[ev.track] || ev.track || "—"}
                          </div>
                        </div>

{/* Event Timing */}
<div style={{ marginTop: 12 }}>
  <div style={{ fontSize: 13, color: "#6B7280" }}>
    Event Timing
  </div>

  {Array.isArray(ev.days) && ev.days.length > 0 ? (
    ev.days.map((d, i) => (
      <div key={i} style={{ marginTop: 10 }}>
        {d.label && (
          <div style={{ fontSize: 13, fontWeight: 600 }}>
            {d.label}
          </div>
        )}

        <div style={{ fontSize: 14 }}>
          Gates Open: {formatTimeOnly(d.gates_open_at)}
        </div>

        <div style={{ fontSize: 14 }}>
          Practice: {formatTimeOnly(d.practice_at)}
        </div>

        <div style={{ fontSize: 14 }}>
          Drivers Brief: {formatTimeOnly(d.drivers_brief_at)}
        </div>

        <div style={{ fontSize: 14 }}>
          Race Start: {formatTimeOnly(d.race_start_at)}
        </div>
      </div>
    ))
  ) : (
    <div style={{ fontSize: 14 }}>No timing set</div>
  )}
</div>

{/* Nominations Timing */}
<div>
  <div style={{ fontSize: 13, color: "#6B7280" }}>
    Nominations Timing
  </div>

  <div style={{ fontSize: 14 }}>
    Opens: {formatDateTime(ev.nominations_open)}
  </div>

  <div style={{ fontSize: 14 }}>
    Closes: {formatDateTime(ev.nominations_close)}
  </div>
</div>

{/* Classes */}
<div>
  <div style={{ fontSize: 13, color: "#6B7280" }}>
    Classes
  </div>

  {Array.isArray(ev.classes_by_day) && ev.classes_by_day.length > 0 ? (
    ev.classes_by_day.map((info, i) => {
      const dayClasses = info.classes || [];

      return (
        <div key={i} style={{ marginTop: 8 }}>
          <strong>{info.label || ""}</strong>

          {dayClasses.length > 0 ? (
            dayClasses.map((cid) => (
              <div key={cid} style={{ fontSize: 14 }}>
                {classMap[cid] || cid}
              </div>
            ))
          ) : (
            <div style={{ fontSize: 14 }}>—</div>
          )}
        </div>
      );
    })
  ) : (
    <div style={{ fontSize: 14 }}>—</div>
  )}
</div>

{/* Pricing */}
<div style={{ marginTop: 12 }}>
  <div style={{ fontSize: 13, color: "#6B7280" }}>Pricing</div>

  {!ev.pricing ? (
    <div style={{ fontSize: 14 }}>No pricing set</div>
  ) : (
    <div style={{ fontSize: 14, marginTop: 6 }}>

      {/* ⭐ MODE LABEL FIX */}
      {(() => {
        const modeLabel = {
          per_entry: "Per Entry",
          tiered: "Tiered",
          per_class: "Per Class",
        }[ev.pricing.mode] || ev.pricing.mode;

        return <div>Mode: {modeLabel}</div>;
      })()}

      {/* Per Entry */}
      {ev.pricing.mode === "per_entry" && (
        <div style={{ marginTop: 6 }}>
          {ev.pricing.global?.free ? (
            <div>Free Entry</div>
          ) : (
            <>
              <div>Member: ${ev.pricing.global?.member ?? 0}</div>
              <div>Non‑Member: ${ev.pricing.global?.non_member ?? 0}</div>
              <div>Junior: ${ev.pricing.global?.junior ?? 0}</div>
            </>
          )}
          <div>
            Charge Preferences: {ev.pricing.charge_preferences ? "Yes" : "No"}
          </div>
        </div>
      )}

      {/* Tiered */}
      {ev.pricing.mode === "tiered" && (
        <div style={{ marginTop: 6 }}>
          <strong>Member</strong>
          <div>First: ${ev.pricing.tiered?.member?.first_class ?? 0}</div>
          <div>Additional: ${ev.pricing.tiered?.member?.additional_class ?? 0}</div>

          <strong>Non‑Member</strong>
          <div>First: ${ev.pricing.tiered?.non_member?.first_class ?? 0}</div>
          <div>Additional: ${ev.pricing.tiered?.non_member?.additional_class ?? 0}</div>

          <strong>Junior</strong>
          <div>First: ${ev.pricing.tiered?.junior?.first_class ?? 0}</div>
          <div>Additional: ${ev.pricing.tiered?.junior?.additional_class ?? 0}</div>

          <div>
            Charge Preferences: {ev.pricing.charge_preferences ? "Yes" : "No"}
          </div>
        </div>
      )}

      {/* Per Class */}
      {ev.pricing.mode === "per_class" && (
        <div style={{ marginTop: 6 }}>
          {Object.entries(ev.pricing.class_prices || {}).map(([classId, cp]) => (
            <div key={classId} style={{ marginBottom: 6 }}>

              {/* ⭐ CLASS NAME FIX */}
              <strong>{classMap[classId] || `Class ${classId}`}</strong>

              {cp.free ? (
                <div>Free</div>
              ) : (
                <>
                  <div>Member: ${cp.member ?? 0}</div>
                  <div>Non‑Member: ${cp.non_member ?? 0}</div>
                  <div>Junior: ${cp.junior ?? 0}</div>
                </>
              )}
            </div>
          ))}

          <div>
            Charge Preferences: {ev.pricing.charge_preferences ? "Yes" : "No"}
          </div>
        </div>
      )}

      {/* Late Fee */}
      {ev.pricing.late_fee && (
        <div style={{ marginTop: 6 }}>
          Late Fee: ${ev.pricing.late_fee}
        </div>
      )}
    </div>
  )}
</div>

                        {/* Merchandise + Add-ons */}
                        <div>
                          <div style={{ fontSize: 13, color: "#6B7280" }}>
                            Merchandise
                          </div>

                          {Array.isArray(ev.merchandise) &&
                          ev.merchandise.length > 0 ? (
                            ev.merchandise.map((m, i) => (
                              <div key={i} style={{ fontSize: 14 }}>
                                {m.name} {m.price ? `$${m.price}` : ""}
                              </div>
                            ))
                          ) : (
                            <div style={{ fontSize: 14 }}>—</div>
                          )}

                          <div
                            style={{
                              marginTop: 10,
                              fontSize: 13,
                              color: "#6B7280",
                            }}
                          >
                            Add-ons
                          </div>

                          {Array.isArray(ev.class_add_ons) &&
                          ev.class_add_ons.length > 0 ? (
                            ev.class_add_ons.map((a, i) => (
                              <div key={i} style={{ fontSize: 14 }}>
                                {a.name} {a.price ? `$${a.price}` : ""}
                              </div>
                            ))
                          ) : (
                            <div style={{ fontSize: 14 }}>—</div>
                          )}
                        </div>

                        {/* Other */}
                        <div>
                          <div style={{ fontSize: 13, color: "#6B7280" }}>
                            Other
                          </div>

                          <div style={{ fontSize: 14 }}>
                            Class Limit: {ev.class_limit || "—"}
                          </div>

                          <div style={{ fontSize: 14 }}>
                            Preference Enabled:{" "}
                            {ev.preference_enabled ? "Yes" : "No"}
                          </div>

                          <div style={{ fontSize: 14 }}>
                            Published: {ev.is_published ? "Yes" : "No"}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CMSCard>
      </div>
    </div>
  );
}
