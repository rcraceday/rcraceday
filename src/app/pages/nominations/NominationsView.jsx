import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { ChevronDownIcon, ClipboardDocumentListIcon } from "@heroicons/react/24/solid";
import { supabase } from "@/supabaseClient";
import FilterDropdown from "@/components/ui/FilterDropdown";
import PageTitle from "@/components/ui/PageTitle";
import { useTranslation } from "@/app/i18n/I18nContext";
import useTheme from "@app/providers/useTheme";
import { getEffectiveDayClassIds } from "@/app/lib/eventClassLimit";
import {
  classMeetsMinimumEntryCount,
  eventClassMinimumEntries,
} from "@app/pages/nominations/classMinimumEntries";
import { richTextToPlainText } from "@/app/lib/richText";
import NominationDriverExportMeta, {
  DriverCountryFlag,
  DriverPermanentNumber,
} from "@/app/pages/nominations/components/NominationDriverExportMeta";
import { chassisForDriverClass } from "@/app/pages/nominations/nominationChassis";
import BackNavButton from "@/components/ui/BackNavButton";

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

function ClassCountDisplay({ count, max, minimum, size = "md" }) {
  const belowMin =
    minimum != null && !classMeetsMinimumEntryCount(count, minimum);
  const countClass =
    size === "sm" ? "text-sm font-semibold tabular-nums" : "text-base font-semibold tabular-nums";

  if (belowMin) {
    return (
      <p
        className={`flex flex-wrap items-baseline justify-center gap-x-1.5 leading-snug text-red-600 ${countClass}`}
      >
        <span>{count}</span>
        <span className="font-medium">· Min entries {minimum}</span>
      </p>
    );
  }

  return (
    <p className={`${countClass} leading-snug text-center text-text-base`}>
      {max != null ? `${count} / ${max}` : count}
    </p>
  );
}

function classNominationTally(group, classMinimum) {
  const belowMin =
    classMinimum != null && !classMeetsMinimumEntryCount(group.count, classMinimum);

  if (belowMin) {
    return (
      <p className="text-sm font-medium text-red-600">
        {group.count} · Min entries {classMinimum}
      </p>
    );
  }

  if (group.max != null) {
    return (
      <p className="text-sm font-medium text-text-base">
        {group.count} / {group.max} nominations
      </p>
    );
  }

  return (
    <p className="text-sm font-medium text-text-base">
      {group.count} nomination{group.count === 1 ? "" : "s"}
    </p>
  );
}

export default function NominationsView() {
  const { eventId } = useParams();
  const { palette } = useTheme();
  const { t } = useTranslation();
  const brand = palette?.primary || "#00438a";

  const [event, setEvent] = useState(null);
  const [nominations, setNominations] = useState([]);
  const [entries, setEntries] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [classMap, setClassMap] = useState({});
  const [trackClassIds, setTrackClassIds] = useState([]);
  const [nominationByDriverId, setNominationByDriverId] = useState(() => new Map());
  const [driverClassChassisMap, setDriverClassChassisMap] = useState(() => new Map());
  const [activeClassId, setActiveClassId] = useState(null);
  const [dashboardOpen, setDashboardOpen] = useState(false);
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
        .select("id, driver_id, merchandise")
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
        ? await supabase
            .from("drivers")
            .select("id, first_name, last_name, country, permanent_number")
            .in("id", driverIds)
        : { data: [] };

      const { data: driverClassRows } = driverIds.length
        ? await supabase
            .from("driver_classes")
            .select("driver_id, class_id, chassis_manufacturer")
            .in("driver_id", driverIds)
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
      setNominationByDriverId(
        new Map((nominationRows || []).map((row) => [row.driver_id, row]))
      );
      setDriverClassChassisMap(
        new Map(
          (driverClassRows || []).map((row) => [
            `${row.driver_id}:${row.class_id}`,
            row.chassis_manufacturer || "",
          ])
        )
      );
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

  const totalDrivers = nominations.length;
  const totalNominations = racingEntries.length;

  const activeGroup = useMemo(
    () => classGroups.find((group) => group.classId === activeClassId) || null,
    [classGroups, activeClassId]
  );

  const classDropdownOptions = useMemo(
    () =>
      classGroups.map((group) => ({
        value: group.classId,
        label: `${group.name} (${group.count})`,
      })),
    [classGroups]
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
        title={t("nominations.viewTitle")}
        style={{ color: brand }}
        actions={<BackNavButton />}
      />

      <main className="app-page-main gap-5 max-w-3xl mx-auto w-full">
        {classGroups.length === 0 ? (
          <article className="event-list-card p-4">
            <p className="text-sm text-text-muted m-0">No classes are configured for this event.</p>
          </article>
        ) : (
          <article className="event-list-card text-text-base !overflow-visible">
            <div
              className="event-list-card-header px-3 py-2.5 flex items-start justify-between gap-2 border-b border-border/60"
              style={{
                background: `linear-gradient(135deg, ${brand}12 0%, transparent 70%)`,
              }}
            >
              <div className="min-w-0 flex-1">
                <h2 className="text-base sm:text-lg font-bold leading-tight m-0 text-text-base">
                  {richTextToPlainText(event?.name).replace(/\s+/g, " ") || "Event"}
                </h2>
                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 mt-1.5 text-sm text-text-muted">
                  <span>
                    <span
                      className="text-base font-bold tabular-nums"
                      style={{ color: brand }}
                    >
                      {totalNominations}
                    </span>{" "}
                    {t("nominations.totalNominationsLabel")}
                  </span>
                  <span>
                    <span
                      className="text-base font-bold tabular-nums"
                      style={{ color: brand }}
                    >
                      {totalDrivers}
                    </span>{" "}
                    {t("nominations.totalDriversLabel")}
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="shrink-0 p-1.5 rounded-lg border border-transparent text-text-muted hover:bg-white/60 hover:border-border/50 transition-colors"
                aria-expanded={dashboardOpen}
                aria-label={t("nominations.dashboardTitle")}
                title={t("nominations.dashboardTitle")}
                onClick={() => setDashboardOpen((open) => !open)}
              >
                <ChevronDownIcon
                  className={`h-5 w-5 transition-transform ${dashboardOpen ? "rotate-180" : ""}`}
                  style={{ color: brand }}
                  aria-hidden
                />
              </button>
            </div>

            <div className="p-3 sm:p-4 space-y-3 bg-gradient-to-b from-surface-alt/15 to-transparent">
              {dashboardOpen ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {classGroups.map((group) => (
                    <div
                      key={group.classId}
                      className="rounded-lg border border-border/80 bg-white px-2 py-1.5 min-w-0 text-center shadow-sm"
                    >
                      <p className="text-xs text-text-muted leading-snug line-clamp-2 m-0">{group.name}</p>
                      <div className="mt-0.5">
                        <ClassCountDisplay
                          count={group.count}
                          max={group.max}
                          minimum={classMinimum}
                          size="sm"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              <hr className="border-0 border-t border-border/60 m-0" />

              <h3 className="text-sm font-bold text-center text-text-base m-0 uppercase tracking-wide">
                {t("eventCard.viewNominations")}
              </h3>

              <FilterDropdown
                value={activeClassId ?? ""}
                onChange={setActiveClassId}
                ariaLabel="Class"
                options={classDropdownOptions}
                compact
                menuInline
                variant="cms"
              />

              {activeGroup && (
                <section aria-labelledby="nominations-class-drivers-heading">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <h4
                      id="nominations-class-drivers-heading"
                      className="text-sm font-semibold text-text-muted m-0"
                    >
                      {activeGroup.name}
                    </h4>
                    <div className="text-right">{classNominationTally(activeGroup, classMinimum)}</div>
                  </div>

                  {activeGroup.drivers.length === 0 ? (
                    <p className="text-sm text-text-muted m-0">No drivers nominated in this class.</p>
                  ) : (
                    <ul className="m-0 list-none p-0 flex flex-col gap-1">
                      {activeGroup.drivers.map((driver) => {
                        const nomination = nominationByDriverId.get(driver.id);
                        const chassis = chassisForDriverClass(
                          nomination,
                          driver.id,
                          activeGroup.classId,
                          driverClassChassisMap
                        );
                        return (
                          <li
                            key={driver.id}
                            className="rounded-lg border border-border/70 bg-white px-2.5 py-1.5 shadow-sm flex items-center flex-nowrap gap-x-2 min-h-0"
                          >
                            <DriverCountryFlag driver={driver} />
                            <DriverPermanentNumber driver={driver} accentColor={brand} />
                            <span className="flex-1 min-w-0 text-sm font-semibold text-text-base leading-tight truncate pr-1">
                              {driverName(driver) || "Unnamed driver"}
                            </span>
                            <NominationDriverExportMeta
                              driver={driver}
                              chassisName={chassis}
                              row
                              hideCountry
                              hideNumber
                            />
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </section>
              )}
            </div>
          </article>
        )}
      </main>
    </div>
  );
}
