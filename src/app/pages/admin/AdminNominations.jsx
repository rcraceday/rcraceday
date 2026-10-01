import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/supabaseClient";
import { useClub } from "@/app/providers/ClubProvider";
import { richTextToPlainText } from "@/app/lib/richText";
import {
  classEntryCounts,
  formatEventDate,
  nominationWindowStatus,
  policyHint,
  racingEntriesOf,
} from "@/app/lib/adminNominations";
import CMSCard from "@cms/CMSCard";
import CMSButton from "@cms/CMSButton";
import CMSInput from "@cms/CMSInput";
import { EditButton } from "@cms/CMSButtonSet";
import { cmsStyles } from "@cms/styles";
import { useTranslation } from "@/app/i18n/I18nContext";

const FILTERS = [
  { id: "upcoming", label: "Upcoming" },
  { id: "all", label: "All events" },
  { id: "past", label: "Past" },
  { id: "open", label: "Nominations open" },
];

function windowBadgeStyle(statusId) {
  if (statusId === "open") return cmsStyles.badgePublished;
  if (statusId === "late") {
    return { backgroundColor: "#FEF3C7", color: "#92400E", padding: "4px 8px", borderRadius: "6px", fontSize: "12px", fontWeight: 600 };
  }
  if (statusId === "closed") return cmsStyles.badgeDraft;
  return {
    backgroundColor: "#F3F4F6",
    color: "#374151",
    padding: "4px 8px",
    borderRadius: "6px",
    fontSize: "12px",
    fontWeight: 600,
  };
}

export default function AdminNominations() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { clubSlug } = useParams();
  const { club } = useClub();

  const [events, setEvents] = useState([]);
  const [nominations, setNominations] = useState([]);
  const [classNames, setClassNames] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("upcoming");

  async function load() {
    if (!club?.id) return;
    setLoading(true);
    setError("");

    const { data: eventRows, error: eventError } = await supabase
      .from("events")
      .select("id, name, event_date, is_published, nominations_open, nominations_close, late_entries_enabled, late_entries_close, late_fee_activation, classes, classes_by_day, class_entry_limits, class_minimum_entries")
      .eq("club_id", club.id)
      .order("event_date", { ascending: false });

    if (eventError) {
      setError(eventError.message || "Could not load events.");
      setEvents([]);
      setLoading(false);
      return;
    }

    const list = eventRows || [];
    setEvents(list);

    const eventIds = list.map((row) => row.id);
    if (eventIds.length === 0) {
      setNominations([]);
      setLoading(false);
      return;
    }

    const { data: nominationRows, error: nominationError } = await supabase
      .from("nominations")
      .select("id, event_id, paid, driver_id, nomination_entries ( id, class_id, is_preference )")
      .in("event_id", eventIds);

    if (nominationError) {
      setError((nominationError.message || "Could not load nominations.") + policyHint(nominationError.message));
      setNominations([]);
      setLoading(false);
      return;
    }

    const noms = nominationRows || [];
    setNominations(noms);

    const classIds = new Set();
    noms.forEach((nom) => {
      (nom.nomination_entries || []).forEach((entry) => {
        if (entry.class_id && !entry.is_preference) classIds.add(entry.class_id);
      });
    });

    if (classIds.size) {
      const { data: classRows } = await supabase
        .from("club_classes")
        .select("id, name")
        .in("id", Array.from(classIds));
      setClassNames(Object.fromEntries((classRows || []).map((row) => [row.id, row.name])));
    } else {
      setClassNames({});
    }

    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [club?.id]);

  const nominationsByEvent = useMemo(() => {
    const map = {};
    nominations.forEach((row) => {
      if (!map[row.event_id]) map[row.event_id] = [];
      map[row.event_id].push(row);
    });
    return map;
  }, [nominations]);

  const now = new Date();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return events.filter((event) => {
      const eventDate = event.event_date ? new Date(`${String(event.event_date).slice(0, 10)}T00:00:00`) : null;
      const window = nominationWindowStatus(event, now);

      if (filter === "upcoming" && eventDate && eventDate < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
        return false;
      }
      if (filter === "past" && eventDate && eventDate >= new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
        return false;
      }
      if (filter === "open" && window.id !== "open" && window.id !== "late") return false;

      if (!q) return true;
      return richTextToPlainText(event.name).toLowerCase().includes(q);
    });
  }, [events, search, filter]);

  return (
    <div style={cmsStyles.pageContainer}>
      <div style={cmsStyles.pageContent}>
        <header style={cmsStyles.sectionHeader}>
          <h1 style={cmsStyles.sectionHeaderTitle}>Nominations</h1>
          <p style={cmsStyles.sectionHeaderSubtitle}>
            Entries by event, with class counts. Open an event to add, change, or delete nominations.
          </p>
        </header>

        <CMSCard titleKey="admin.events.eventsCard">
          <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingTop: 8 }}>
            <CMSInput
              label="Search"
              placeholder="Event name"
              value={search}
              onChange={setSearch}
            />

            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {FILTERS.map((item) => (
                <CMSButton
                  key={item.id}
                  type="button"
                  onClick={() => setFilter(item.id)}
                  style={
                    filter === item.id
                      ? { borderColor: "#991B1B", backgroundColor: "#f8f3f3" }
                      : undefined
                  }
                >
                  {item.label}
                </CMSButton>
              ))}
            </div>

            {loading ? (
              <p style={{ color: "#6B7280", fontSize: 14 }}>Loading nominations…</p>
            ) : error ? (
              <p style={{ color: "#991B1B", fontSize: 14 }}>{error}</p>
            ) : filtered.length === 0 ? (
              <p style={{ color: "#6B7280", fontSize: 14 }}>No events match.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {filtered.map((event) => {
                  const noms = nominationsByEvent[event.id] || [];
                  const entries = noms.flatMap((row) => row.nomination_entries || []);
                  const racing = racingEntriesOf(entries);
                  const paidCount = noms.filter((row) => row.paid).length;
                  const counts = classEntryCounts(entries);
                  const window = nominationWindowStatus(event, now);
                  const classSummary = Object.entries(counts)
                    .sort((a, b) =>
                      String(classNames[a[0]] || "").localeCompare(String(classNames[b[0]] || ""))
                    )
                    .map(([id, count]) => `${classNames[id] || "Class"} ${count}`);

                  return (
                    <div
                      key={event.id}
                      style={{
                        display: "flex",
                        gap: 16,
                        alignItems: "flex-start",
                        padding: "16px 0",
                        borderBottom: "1px solid #F3F4F6",
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, color: "#111827" }}>
                          {richTextToPlainText(event.name).replace(/\s+/g, " ").trim() || "Untitled event"}
                        </div>
                        <div style={{ fontSize: 13, color: "#6B7280", marginTop: 2 }}>
                          {formatEventDate(event.event_date)}
                        </div>
                        <div
                          style={{
                            marginTop: 8,
                            display: "flex",
                            flexWrap: "wrap",
                            gap: 8,
                            alignItems: "center",
                          }}
                        >
                          <span style={windowBadgeStyle(window.id)}>{window.label}</span>
                          <span style={{ fontSize: 12, color: "#6B7280" }}>
                            {noms.length} driver{noms.length === 1 ? "" : "s"}
                          </span>
                          <span style={{ fontSize: 12, color: "#6B7280" }}>
                            {racing.length} {racing.length === 1 ? "entry" : "entries"}
                          </span>
                          <span style={{ fontSize: 12, color: "#6B7280" }}>
                            {paidCount} paid
                          </span>
                        </div>
                        {classSummary.length > 0 && (
                          <div style={{ marginTop: 8, fontSize: 13, color: "#374151" }}>
                            {classSummary.join(" · ")}
                          </div>
                        )}
                      </div>
                      <EditButton
                        onClick={() =>
                          navigate(`/${clubSlug}/app/admin/nominations/${event.id}`)
                        }
                      >
                        Open
                      </EditButton>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </CMSCard>
      </div>
    </div>
  );
}
