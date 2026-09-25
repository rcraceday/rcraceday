import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ClipboardDocumentListIcon } from "@heroicons/react/24/solid";
import { supabase } from "@/supabaseClient";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import PageTitle from "@/components/ui/PageTitle";
import useTheme from "@app/providers/useTheme";
import { getEffectiveDayClassIds } from "@/app/lib/eventClassLimit";
import {
  classMeetsMinimumEntryCount,
  eventClassMinimumEntries,
} from "@app/pages/nominations/classMinimumEntries";

function driverName(driver) {
  return [driver?.first_name, driver?.last_name].filter(Boolean).join(" ").trim();
}

function sortDrivers(a, b) {
  return `${a.last_name || ""} ${a.first_name || ""}`.localeCompare(
    `${b.last_name || ""} ${b.first_name || ""}`
  );
}

function classMaxLimit(event, classId) {
  const raw = event?.class_entry_limits?.[classId];
  if (raw == null || raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function collectEventClassIds(event, trackClassIds) {
  const ids = [];
  const seen = new Set();
  const add = (id) => {
    if (!id || seen.has(id)) return;
    seen.add(id);
    ids.push(id);
  };

  if (Array.isArray(event?.classes_by_day) && event.classes_by_day.length > 0) {
    event.classes_by_day.forEach((_, index) => {
      getEffectiveDayClassIds(event, index, trackClassIds).forEach(add);
    });
  }

  if (Array.isArray(event?.classes)) {
    event.classes.forEach(add);
  }

  return ids;
}

function ClassCountDisplay({ count, max, minimum, contentText, size = "md" }) {
  const belowMin =
    minimum != null && !classMeetsMinimumEntryCount(count, minimum);
  const countClass = size === "sm" ? "text-base font-semibold leading-tight" : "text-lg font-semibold leading-tight";

  if (belowMin) {
    return (
      <div>
        <p className={countClass} style={{ color: "#dc2626" }}>{count}</p>
        <p className="text-[11px] font-medium mt-0.5" style={{ color: "#dc2626" }}>
          Min entries {minimum}
        </p>
      </div>
    );
  }

  return (
    <p className={countClass} style={{ color: contentText }}>
      {max != null ? `${count} / ${max}` : count}
    </p>
  );
}

function classNominationTally(group, classMinimum, contentText) {
  const belowMin =
    classMinimum != null && !classMeetsMinimumEntryCount(group.count, classMinimum);

  if (belowMin) {
    return (
      <p className="text-sm font-medium" style={{ color: "#dc2626" }}>
        {group.count} · Min entries {classMinimum}
      </p>
    );
  }

  if (group.max != null) {
    return (
      <p className="text-sm font-medium" style={{ color: contentText }}>
        {group.count} / {group.max} nominations
      </p>
    );
  }

  return (
    <p className="text-sm font-medium" style={{ color: contentText }}>
      {group.count} nomination{group.count === 1 ? "" : "s"}
    </p>
  );
}

export default function NominationsView() {
  const { clubSlug, eventId } = useParams();
  const { palette } = useTheme();
  const brand = palette?.primary || "#00438a";
  const contentText = palette?.text || "#1f2937";
  const buttonText = palette?.buttonText || "#ffffff";

  const [event, setEvent] = useState(null);
  const [nominations, setNominations] = useState([]);
  const [entries, setEntries] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [classMap, setClassMap] = useState({});
  const [trackClassIds, setTrackClassIds] = useState([]);
  const [activeClassId, setActiveClassId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);

      const { data: eventRow } = await supabase
        .from("events")
        .select("*")
        .eq("id", eventId)
        .single();

      const { data: nominationRows } = await supabase
        .from("nominations")
        .select("id, driver_id")
        .eq("event_id", eventId);

      const nominationIds = (nominationRows || []).map((row) => row.id);
      const driverIds = [...new Set((nominationRows || []).map((row) => row.driver_id).filter(Boolean))];

      const { data: entryRows } = nominationIds.length
        ? await supabase
            .from("nomination_entries")
            .select("id, nomination_id, class_id, is_preference, order_index")
            .in("nomination_id", nominationIds)
        : { data: [] };

      const { data: driverRows } = driverIds.length
        ? await supabase.from("drivers").select("id, first_name, last_name").in("id", driverIds)
        : { data: [] };

      const ids = new Set();
      let trackIds = [];

      if (eventRow?.track) {
        const { data: trackRows } = await supabase
          .from("club_track_classes")
          .select("class_id, club_classes ( id, name )")
          .eq("track_id", eventRow.track);
        trackIds = (trackRows || []).map((row) => row.club_classes?.id).filter(Boolean);
        trackIds.forEach((id) => ids.add(id));
      }

      collectEventClassIds(eventRow, trackIds).forEach((id) => ids.add(id));
      (entryRows || []).forEach((entry) => {
        if (entry.class_id) ids.add(entry.class_id);
      });

      const { data: classRows } = ids.size
        ? await supabase.from("club_classes").select("id, name").in("id", Array.from(ids))
        : { data: [] };

      if (cancelled) return;

      setEvent(eventRow || null);
      setNominations(nominationRows || []);
      setEntries(entryRows || []);
      setDrivers(driverRows || []);
      setClassMap(Object.fromEntries((classRows || []).map((row) => [row.id, row.name])));
      setTrackClassIds(trackIds);
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  const driverMap = useMemo(
    () => new Map(drivers.map((driver) => [driver.id, driver])),
    [drivers]
  );

  const racingEntries = useMemo(
    () => entries.filter((entry) => !entry.is_preference),
    [entries]
  );

  const classGroups = useMemo(() => {
    const orderedIds = collectEventClassIds(event, trackClassIds);
    const seen = new Set(orderedIds);
    racingEntries.forEach((entry) => {
      if (entry.class_id && !seen.has(entry.class_id)) {
        seen.add(entry.class_id);
        orderedIds.push(entry.class_id);
      }
    });

    return orderedIds.map((classId) => {
      const classEntries = racingEntries.filter((entry) => entry.class_id === classId);
      const uniqueDrivers = [];
      const driverSeen = new Set();
      classEntries.forEach((entry) => {
        const nomination = nominations.find((row) => row.id === entry.nomination_id);
        const driver = nomination && driverMap.get(nomination.driver_id);
        if (!driver || driverSeen.has(driver.id)) return;
        driverSeen.add(driver.id);
        uniqueDrivers.push(driver);
      });
      uniqueDrivers.sort(sortDrivers);
      return {
        classId,
        name: classMap[classId] || "Unknown class",
        count: classEntries.length,
        max: classMaxLimit(event, classId),
        drivers: uniqueDrivers,
      };
    });
  }, [event, trackClassIds, racingEntries, nominations, driverMap, classMap]);

  const classMinimum = eventClassMinimumEntries(event);

  const activeGroup = useMemo(
    () => classGroups.find((group) => group.classId === activeClassId) || null,
    [classGroups, activeClassId]
  );

  useEffect(() => {
    if (classGroups.length === 0) {
      setActiveClassId(null);
      return;
    }
    if (!classGroups.some((group) => group.classId === activeClassId)) {
      setActiveClassId(classGroups[0].classId);
    }
  }, [classGroups, activeClassId]);

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-background text-text-muted flex items-center justify-center">
        Loading nominations...
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", width: "100%", background: palette?.background || "#ffffff" }}>
      <PageTitle
        icon={ClipboardDocumentListIcon}
        title="Event Nominations"
        style={{ color: brand }}
        actions={
          <Link to={`/${clubSlug}/app/events/${eventId}`} className="no-underline">
            <Button variant="primary" size="sm" className="!py-1 !px-3 !text-xs !rounded-sm">
              Back to event
            </Button>
          </Link>
        }
      />

      <main
        style={{
          padding: "24px 0",
          display: "flex",
          flexDirection: "column",
          gap: "20px",
        }}
      >
        <h2
          className="text-center text-lg font-semibold leading-tight px-2"
          style={{ color: contentText }}
        >
          {event?.name || "Event"}
        </h2>

        <Card className="p-3 space-y-3 !text-text-base">
          <h2 className="font-semibold text-sm" style={{ color: contentText }}>
            Nominations dashboard
          </h2>
          <div
            className="rounded-md px-2 py-1.5"
            style={{
              background: palette?.surfaceAlt || "#f9fafb",
              border: `1px solid ${palette?.surfaceBorder || "#e5e7eb"}`,
            }}
          >
            <p className="text-[10px] uppercase tracking-wide text-text-muted">Total nominations</p>
            <p className="text-lg font-semibold leading-tight mt-0.5" style={{ color: brand }}>
              {nominations.length}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {classGroups.map((group) => (
              <div
                key={group.classId}
                className="rounded-md px-2 py-1.5 min-w-0"
                style={{
                  background: palette?.surfaceAlt || "#f9fafb",
                  border: `1px solid ${palette?.surfaceBorder || "#e5e7eb"}`,
                }}
              >
                <p className="text-[10px] uppercase tracking-wide text-text-muted truncate">
                  {group.name}
                </p>
                <div className="mt-0.5">
                  <ClassCountDisplay
                    count={group.count}
                    max={group.max}
                    minimum={classMinimum}
                    contentText={contentText}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {classGroups.length === 0 ? (
          <Card className="p-4">
            <p className="text-sm text-text-muted">No classes are configured for this event.</p>
          </Card>
        ) : (
          <Card className="p-3 !text-text-base">
            <div
              className="flex flex-wrap gap-1.5 pb-2 mb-3"
              role="tablist"
              aria-label="Classes"
              style={{ borderBottom: `1px solid ${palette?.surfaceBorder || "#e5e7eb"}` }}
            >
              {classGroups.map((group) => {
                const selected = activeClassId === group.classId;
                return (
                  <button
                    key={group.classId}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    className="rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors text-center leading-tight"
                    style={{
                      backgroundColor: selected ? brand : palette?.surfaceAlt || "#f9fafb",
                      color: selected ? buttonText : brand,
                      border: `1px solid ${brand}`,
                    }}
                    onClick={() => setActiveClassId(group.classId)}
                  >
                    {group.name}
                  </button>
                );
              })}
            </div>

            {activeGroup && (
              <div role="tabpanel" className="space-y-3">
                <div className="space-y-1">
                  {activeGroup.drivers.length === 0 ? (
                    <p className="text-sm text-text-muted">No drivers nominated in this class.</p>
                  ) : (
                    activeGroup.drivers.map((driver) => (
                      <p key={driver.id} className="text-sm" style={{ color: contentText }}>
                        {driverName(driver) || "Unnamed driver"}
                      </p>
                    ))
                  )}
                </div>
                {classNominationTally(activeGroup, classMinimum, contentText)}
              </div>
            )}
          </Card>
        )}
      </main>
    </div>
  );
}
