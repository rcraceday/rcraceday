import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/supabaseClient";

import CMSCard from "../cms/CMSCard";
import CMSButton from "../cms/CMSButton";
import { PlusIcon } from "@heroicons/react/24/solid";
import { cmsStyles } from "../cms/styles";
import { normalizeDayRecord } from "@app/pages/admin/events/eventDefaults";
import { richTextToPlainText } from "@/app/lib/richText";
import { useTranslation } from "@/app/i18n/I18nContext";
import { loadEventResultSummariesForEvents } from "@/app/lib/results/summarizeEventResultStats";

export default function AdminEvents() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { clubSlug } = useParams();

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const [clubClasses, setClubClasses] = useState([]);
  const [clubTracks, setClubTracks] = useState([]);

  const [nominations, setNominations] = useState([]);
  const [resultStatsByEvent, setResultStatsByEvent] = useState({});

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

  useEffect(() => {
    if (!events.length) {
      setResultStatsByEvent({});
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const summaries = await loadEventResultSummariesForEvents(
          supabase,
          events.map((event) => event.id)
        );
        if (!cancelled) setResultStatsByEvent(summaries);
      } catch (err) {
        console.error(err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [events]);

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
      .select("id, event_id, nomination_entries ( id )");

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
    const { id: _id, created_at: _createdAt, ...eventFields } = ev;

    const newEvent = {
      ...eventFields,
      name: `${richTextToPlainText(ev.name) || t("admin.nominations.eventFallback")}${t("admin.nominations.eventCopySuffix")}`,
      created_at: new Date().toISOString(),
      days: Array.isArray(ev.days)
        ? ev.days.map((day) => normalizeDayRecord(day))
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
      const entries = n.nomination_entries;
      if (Array.isArray(entries)) return sum + entries.length;
      return sum;
    }, 0);

    return { nominated, classesEntered };
  };

  const now = new Date();

  let filteredEvents = events.filter((ev) => {
    const q = query.toLowerCase();

    const matchesQuery =
      richTextToPlainText(ev.name).toLowerCase().includes(q) ||
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
          <h1 style={cmsStyles.sectionHeaderTitle}>{t("admin.events.title")}</h1>
          <p style={cmsStyles.sectionHeaderSubtitle}>{t("admin.events.subtitle")}</p>
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
            placeholder={t("admin.events.searchPlaceholder")}
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
            <option value="all">{t("admin.events.filterAllEvents")}</option>
            <option value="upcoming">{t("admin.events.filterUpcoming")}</option>
            <option value="past">{t("admin.events.filterPast")}</option>
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
            <option value="all">{t("admin.events.filterAllTracks")}</option>
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
            <option value="all">{t("admin.events.filterAllTypes")}</option>
            <option value="racing">{t("admin.events.typeRacing")}</option>
            <option value="practice">{t("admin.events.typePractice")}</option>
            <option value="club_meet">{t("admin.events.typeClubMeet")}</option>
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
            <option value="asc">{t("admin.events.sortDateAsc")}</option>
            <option value="desc">{t("admin.events.sortDateDesc")}</option>
          </select>
        </div>

        {/* Events */}
        <CMSCard
          titleKey="admin.events.eventsCard"
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
              {t("admin.events.createEvent")}
            </CMSButton>
          }
        >
          {loading ? (
            <div style={{ padding: "16px" }}>{t("admin.common.loadingEvents")}</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {filteredEvents.map((ev) => {
                const isExpanded = expanded[ev.id];
                const { nominated, classesEntered } = getNominationSummary(ev.id);
                const resultStats = resultStatsByEvent[ev.id];

                return (
                  <div
                    key={ev.id}
                    className="admin-event-card"
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
                    <div className="admin-event-card__row" style={{ display: "flex", alignItems: "center", gap: 12 }}>
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
                            {richTextToPlainText(ev.name)}
                          </div>

                          <div style={{ fontSize: 13, color: "#6B7280" }}>
                            {formatEventDateRange(ev)}
                          </div>

                          <div
                            style={{
                              marginTop: 4,
                              display: "flex",
                              flexWrap: "wrap",
                              gap: 16,
                              fontSize: 12,
                              color: "#6B7280",
                            }}
                          >
                            <span>{t("admin.events.nominated")}: {nominated}</span>
                            {resultStats ? (
                              <>
                                <span>
                                  {t("admin.events.resultEntries")}: {resultStats.entries}
                                </span>
                                <span>
                                  {t("admin.events.resultDrivers")}: {resultStats.drivers}
                                </span>
                              </>
                            ) : (
                              <span>
                                {t("admin.events.classesEntered")}: {classesEntered}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="admin-event-card__actions" style={{ display: "flex", gap: 8 }}>
                        <CMSButton onClick={() => handleEdit(ev)}>{t("admin.common.edit")}</CMSButton>
                        <CMSButton
                          onClick={() => navigate(`/${clubSlug}/app/admin/events/${ev.id}/results`)}
                          style={{ background: "#E5E7EB", color: "#111827" }}
                        >
                          {t("admin.events.results")}
                        </CMSButton>
                        <CMSButton
                          onClick={() => handleDuplicate(ev)}
                          style={{ background: "#E5E7EB", color: "#111827" }}
                        >
                          {t("admin.events.duplicate")}
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
                            {t("admin.common.eventInfo")}
                          </div>

                          <div style={{ fontSize: 14 }}>
                            {t("admin.common.type")}: {formatType(ev.event_type)}
                          </div>

                          <div style={{ fontSize: 14 }}>
                            {t("admin.common.description")}: {ev.description || "—"}
                          </div>
                        </div>

                        {/* Track */}
                        <div>
                          <div style={{ fontSize: 13, color: "#6B7280" }}>
                            {t("admin.common.track")}
                          </div>
                          <div style={{ fontSize: 14 }}>
                            {trackMap[ev.track] || ev.track || "—"}
                          </div>
                        </div>

{/* Event Timing */}
<div style={{ marginTop: 12 }}>
  <div style={{ fontSize: 13, color: "#6B7280" }}>
    {t("admin.events.eventTiming")}
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
          {t("admin.common.gatesOpen")}: {formatTimeOnly(d.gates_open_at)}
        </div>

        <div style={{ fontSize: 14 }}>
          {t("admin.common.practice")}: {formatTimeOnly(d.practice_at)}
        </div>

        <div style={{ fontSize: 14 }}>
          {t("admin.common.driversBrief")}: {formatTimeOnly(d.drivers_brief_at)}
        </div>

        <div style={{ fontSize: 14 }}>
          {t("admin.common.raceStart")}: {formatTimeOnly(d.race_start_at)}
        </div>
      </div>
    ))
  ) : (
    <div style={{ fontSize: 14 }}>{t("admin.common.noTimingSet")}</div>
  )}
</div>

{/* Nominations Timing */}
<div>
  <div style={{ fontSize: 13, color: "#6B7280" }}>
    {t("admin.common.nominationsTiming")}
  </div>

  <div style={{ fontSize: 14 }}>
    {t("admin.common.opens")}: {formatDateTime(ev.nominations_open)}
  </div>

  <div style={{ fontSize: 14 }}>
    {t("admin.common.closes")}: {formatDateTime(ev.nominations_close)}
  </div>
</div>

{/* Classes */}
<div>
  <div style={{ fontSize: 13, color: "#6B7280" }}>
    {t("admin.common.classes")}
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
  <div style={{ fontSize: 13, color: "#6B7280" }}>{t("admin.events.pricing")}</div>

  {!ev.pricing ? (
    <div style={{ fontSize: 14 }}>{t("admin.common.noPricingSet")}</div>
  ) : (
    <div style={{ fontSize: 14, marginTop: 6 }}>

      {/* ⭐ MODE LABEL FIX */}
      {(() => {
        const modeLabel = {
          per_entry: t("admin.common.perEntry"),
          tiered: t("admin.common.tieredLabel"),
          per_class: t("admin.common.perClass"),
        }[ev.pricing.mode] || ev.pricing.mode;

        return <div>{t("admin.common.mode")}: {modeLabel}</div>;
      })()}

      {/* Per Entry */}
      {ev.pricing.mode === "per_entry" && (
        <div style={{ marginTop: 6 }}>
          {ev.pricing.global?.free ? (
            <div>{t("admin.common.freeEntry")}</div>
          ) : (
            <>
              <div>{t("admin.common.member")}: ${ev.pricing.global?.member ?? 0}</div>
              <div>{t("admin.common.nonMember")}: ${ev.pricing.global?.non_member ?? 0}</div>
              <div>{t("admin.common.junior")}: ${ev.pricing.global?.junior ?? 0}</div>
            </>
          )}
          <div>
            {t("admin.common.chargePreferences")}: {ev.pricing.charge_preferences ? t("admin.common.yes") : t("admin.common.no")}
          </div>
        </div>
      )}

      {/* Tiered */}
      {ev.pricing.mode === "tiered" && (
        <div style={{ marginTop: 6 }}>
          <strong>{t("admin.common.member")}</strong>
          <div>{t("admin.common.first")}: ${ev.pricing.tiered?.member?.first_class ?? 0}</div>
          <div>{t("admin.common.additional")}: ${ev.pricing.tiered?.member?.additional_class ?? 0}</div>

          <strong>{t("admin.common.nonMember")}</strong>
          <div>{t("admin.common.first")}: ${ev.pricing.tiered?.non_member?.first_class ?? 0}</div>
          <div>{t("admin.common.additional")}: ${ev.pricing.tiered?.non_member?.additional_class ?? 0}</div>

          <strong>{t("admin.common.junior")}</strong>
          <div>{t("admin.common.first")}: ${ev.pricing.tiered?.junior?.first_class ?? 0}</div>
          <div>{t("admin.common.additional")}: ${ev.pricing.tiered?.junior?.additional_class ?? 0}</div>

          <div>
            {t("admin.common.chargePreferences")}: {ev.pricing.charge_preferences ? t("admin.common.yes") : t("admin.common.no")}
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
                <div>{t("admin.common.free")}</div>
              ) : (
                <>
                  <div>{t("admin.common.member")}: ${cp.member ?? 0}</div>
                  <div>{t("admin.common.nonMember")}: ${cp.non_member ?? 0}</div>
                  <div>{t("admin.common.junior")}: ${cp.junior ?? 0}</div>
                </>
              )}
            </div>
          ))}

          <div>
            {t("admin.common.chargePreferences")}: {ev.pricing.charge_preferences ? t("admin.common.yes") : t("admin.common.no")}
          </div>
        </div>
      )}

      {/* Late Fee */}
      {ev.pricing.late_fee && (
        <div style={{ marginTop: 6 }}>
          {t("admin.events.lateFeeLabel")}: ${ev.pricing.late_fee}
        </div>
      )}
    </div>
  )}
</div>

                        {/* Merchandise + Add-ons */}
                        <div>
                          <div style={{ fontSize: 13, color: "#6B7280" }}>
                            {t("admin.events.merchandise")}
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
                            {t("admin.common.addOns")}
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
                            {t("admin.common.other")}
                          </div>

                          <div style={{ fontSize: 14 }}>
                            {t("admin.common.classLimit")}: {ev.class_limit || "—"}
                          </div>

                          <div style={{ fontSize: 14 }}>
                            {t("admin.common.preferenceEnabled")}:{" "}
                            {ev.preference_enabled ? t("admin.common.yes") : t("admin.common.no")}
                          </div>

                          <div style={{ fontSize: 14 }}>
                            {t("admin.common.published")}: {ev.is_published ? t("admin.common.yes") : t("admin.common.no")}
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
