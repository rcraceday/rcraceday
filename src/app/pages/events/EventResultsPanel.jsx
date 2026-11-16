import { useCallback, useEffect, useMemo, useState } from "react";
import Card from "@/components/ui/Card";
import ClassFolderTabs from "@/components/ui/ClassFolderTabs";
import FilterDropdown from "@/components/ui/FilterDropdown";
import useTheme from "@/app/providers/useTheme";
import { useHouseholdResultHighlight } from "@/app/hooks/useHouseholdResultHighlight";
import { useTranslation } from "@/app/i18n/I18nContext";
import { supabase } from "@/supabaseClient";
import { richTextToPlainText } from "@/app/lib/richText";
import { loadEventResultBundle } from "@/app/lib/results/loadEventResults";
import { pickInitialResultClass, uniqueClassNames } from "@/app/lib/results/overallOrder";
import { normalizeDriverName } from "@/app/lib/results/driverName";
import { compareRacesForDisplay, formatMs, positionsGained, raceTitle } from "@/app/lib/results/resultTime";
import {
  aggregateDriverMainStats,
  formatOverallMainsColumn,
  latestMainEntry,
} from "@/app/lib/results/aggregateDriverStats";
import {
  DEFAULT_LIVE_RC_QUAL_ORDER,
  primaryQualifyingMetric,
  qualifyingOrderLabel,
} from "@/app/lib/results/qualifyingRank";
import {
  isCompareDriver,
  isHouseholdResultRow,
  resultsTableRowClass,
} from "@/app/lib/results/resultsRowHighlight";
import ResultsStatTile from "@/app/pages/events/results/ResultsStatTile";
import ResultsTableSection, {
  ResultsDataTable,
  PositionCell,
} from "@/app/pages/events/results/ResultsTableSection";

function formatGain(value) {
  if (value == null) return "—";
  if (value > 0) return `+${value}`;
  return String(value);
}

function formatEventDate(date) {
  if (!date) return "";
  try {
    return new Date(date).toLocaleDateString(undefined, {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return date;
  }
}

function entryRowClass(entry, driverIds, driverNameKeys, compareDriver) {
  const isMe = isHouseholdResultRow(entry, driverIds, driverNameKeys);
  const isCompare = isCompareDriver(entry, compareDriver);
  return resultsTableRowClass({ isMe, isCompare });
}

export default function EventResultsPanel({
  eventId,
  previewUnpublished = false,
  eventName = null,
  showDraftBanner = true,
  compareDriver = "",
  onCompareDriverChange,
  compareExcludeDriver = "",
  preferredClass = "",
  embedded = false,
  eventOptions = null,
  onEventChange,
}) {
  const { t } = useTranslation();
  const { palette } = useTheme();
  const primaryColor = palette?.primary || "#2563eb";
  const { driverIds, driverNameKeys, isMyRow } = useHouseholdResultHighlight();

  const [eventRow, setEventRow] = useState(null);
  const [bundle, setBundle] = useState(null);
  const [className, setClassName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mainsScope, setMainsScope] = useState("mine");

  useEffect(() => {
    async function load() {
      if (!eventId) return;
      setLoading(true);
      setError("");
      try {
        const { data: eventData } = await supabase
          .from("events")
          .select("id, name, event_date")
          .eq("id", eventId)
          .single();
        setEventRow(eventData);
        const next = await loadEventResultBundle(eventId, {
          includeUnpublished: previewUnpublished,
        });
        setBundle(next);
      } catch (err) {
        setError(err.message || t("results.loadFailed"));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [eventId, previewUnpublished, t]);

  useEffect(() => {
    if (!bundle) return;
    const classes = uniqueClassNames(bundle);
    setClassName((current) => {
      if (current && classes.includes(current)) return current;
      if (preferredClass && classes.includes(preferredClass)) return preferredClass;
      return pickInitialResultClass(bundle, driverIds, (name) =>
        driverNameKeys.has(normalizeDriverName(name))
      );
    });
  }, [bundle, driverIds, driverNameKeys, preferredClass]);

  const classOptions = useMemo(() => {
    if (!bundle) return [];
    return uniqueClassNames(bundle).map((name) => ({ value: name, label: name }));
  }, [bundle]);

  const overall = (bundle?.overall || [])
    .filter((row) => row.className === className)
    .sort((a, b) => (a.overallPosition || a.position || 0) - (b.overallPosition || b.position || 0));
  const races = (bundle?.races || []).filter((race) => race.className === className);

  const sortedClassRaces = useMemo(
    () => [...races].sort(compareRacesForDisplay),
    [races]
  );

  const raceHasHouseholdDriver = useCallback(
    (race) =>
      (race?.entries || []).some((entry) =>
        isHouseholdResultRow(entry, driverIds, driverNameKeys)
      ),
    [driverIds, driverNameKeys]
  );

  const hasMyMains = useMemo(
    () =>
      sortedClassRaces.some(
        (race) => race.raceKind !== "qualifying" && raceHasHouseholdDriver(race)
      ),
    [sortedClassRaces, raceHasHouseholdDriver]
  );

  const qualifyingRaces = useMemo(
    () => sortedClassRaces.filter((race) => race.raceKind === "qualifying"),
    [sortedClassRaces]
  );

  const mainRaces = useMemo(() => {
    const mains = sortedClassRaces.filter((race) => race.raceKind !== "qualifying");
    if (mainsScope === "mine" && hasMyMains) {
      return mains.filter(raceHasHouseholdDriver);
    }
    return mains;
  }, [sortedClassRaces, mainsScope, hasMyMains, raceHasHouseholdDriver]);

  useEffect(() => {
    setMainsScope(hasMyMains ? "mine" : "all");
  }, [className, hasMyMains]);
  const myRows = useMemo(() => {
    const rows = overall.filter((row) => isHouseholdResultRow(row, driverIds, driverNameKeys));
    const seen = new Map();
    rows.forEach((row) => {
      const key = normalizeDriverName(row.driverNameRaw);
      const finish = row.overallPosition || row.position;
      const existing = seen.get(key);
      if (!existing) {
        seen.set(key, row);
        return;
      }
      const existingFinish = existing.overallPosition || existing.position;
      if (finish != null && (existingFinish == null || finish < existingFinish)) {
        seen.set(key, row);
      }
    });
    return [...seen.values()];
  }, [overall, driverIds, driverNameKeys]);

  const compareOptions = useMemo(() => {
    const excludeKey = compareExcludeDriver
      ? normalizeDriverName(compareExcludeDriver)
      : null;
    const names = new Set();
    overall.forEach((row) => {
      const name = row.driverNameRaw;
      if (!name) return;
      const isHousehold = isHouseholdResultRow(row, driverIds, driverNameKeys);
      if (isHousehold) {
        if (!excludeKey || normalizeDriverName(name) === excludeKey) return;
      }
      names.add(name);
    });
    const items = [...names].sort((a, b) => a.localeCompare(b)).map((name) => ({
      value: name,
      label: name,
    }));
    if (onCompareDriverChange) {
      return [{ value: "", label: t("results.compareNone") }, ...items];
    }
    return items;
  }, [overall, onCompareDriverChange, compareExcludeDriver, driverIds, driverNameKeys, t]);

  useEffect(() => {
    if (!compareDriver || !onCompareDriverChange) return;
    const allowed = new Set(compareOptions.map((o) => o.value).filter(Boolean));
    if (!allowed.has(compareDriver)) onCompareDriverChange("");
  }, [compareOptions, compareDriver, onCompareDriverChange]);

  const mainsTabOptions = useMemo(() => {
    const all = { value: "all", label: t("results.mainsTabAll") };
    if (!hasMyMains) return [all];
    return [
      { value: "mine", label: t("results.mainsTabMine") },
      all,
    ];
  }, [hasMyMains, t]);

  const rivalRow = useMemo(
    () => (compareDriver ? overall.find((row) => isCompareDriver(row, compareDriver)) : null),
    [overall, compareDriver]
  );
  const primaryMyRow = useMemo(() => {
    if (compareExcludeDriver) {
      const key = normalizeDriverName(compareExcludeDriver);
      const match = myRows.find((row) => normalizeDriverName(row.driverNameRaw) === key);
      if (match) return match;
    }
    return myRows[0] || null;
  }, [myRows, compareExcludeDriver]);

  const heading =
    eventName != null ? eventName : eventRow?.name ? richTextToPlainText(eventRow.name) : null;
  const eventDateLabel = eventRow?.event_date ? formatEventDate(eventRow.event_date) : "";

  const body = (
    <>
      {showDraftBanner && previewUnpublished && bundle?.result?.published === false && (
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 m-0">
          {t("results.adminPreviewDraft")}
        </p>
      )}

      {loading && <p className="text-text-muted m-0 text-sm px-4 py-3">{t("loading.loading")}</p>}
      {error && <p className="text-red-600 m-0 text-sm px-4 py-3">{error}</p>}
      {!loading && !bundle && (
        <p className="text-text-muted m-0 text-sm px-4 py-3">{t("results.notAvailable")}</p>
      )}

      {bundle && (
        <div className="p-4 space-y-4">
          <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              {embedded && eventOptions?.length && onEventChange ? (
                <FilterDropdown
                  value={eventId}
                  onChange={onEventChange}
                  ariaLabel={t("results.filterEvent")}
                  options={eventOptions}
                  hideSelectedOption={false}
                  compact
                  className="flex-1 min-w-[12rem]"
                />
              ) : null}
              {classOptions.length > 0 && (
                <FilterDropdown
                  value={className}
                  onChange={setClassName}
                  ariaLabel={t("results.filterClass")}
                  options={classOptions}
                  hideSelectedOption={false}
                  compact
                  className="flex-1 min-w-[10rem]"
                />
              )}
            </div>
            {onCompareDriverChange && compareOptions.length > 0 && (
              <FilterDropdown
                value={compareDriver || ""}
                onChange={(value) => onCompareDriverChange(value || "")}
                ariaLabel={t("results.compareDriver")}
                options={compareOptions}
                hideSelectedOption={false}
                compact
                menuInline
                className="w-full min-w-0"
              />
            )}
          </div>

          {compareDriver && primaryMyRow && (
            <div className="rounded-xl border border-amber-200/90 bg-amber-50/35 px-3 py-3 space-y-2">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-900/80">
                {t("results.eventHeadToHead", { name: compareDriver })}
              </div>
              {rivalRow ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <ResultsStatTile
                    label={t("results.h2hYourFinish")}
                    value={`P${primaryMyRow.overallPosition || primaryMyRow.position}`}
                    accent={primaryColor}
                  />
                  <ResultsStatTile
                    label={t("results.h2hTheirFinish")}
                    value={`P${rivalRow.overallPosition || rivalRow.position}`}
                  />
                  <ResultsStatTile
                    label={t("results.h2hPositionGap")}
                    value={(() => {
                      const mine = primaryMyRow.overallPosition || primaryMyRow.position;
                      const theirs = rivalRow.overallPosition || rivalRow.position;
                      if (mine == null || theirs == null) return "—";
                      const gap = theirs - mine;
                      if (gap === 0) return t("results.h2hTied");
                      return gap > 0
                        ? t("results.h2hAhead", { count: gap })
                        : t("results.h2hBehind", { count: Math.abs(gap) });
                    })()}
                  />
                  <ResultsStatTile
                    label={t("results.h2hFastLapDelta")}
                    value={(() => {
                      const mine = aggregateDriverMainStats(primaryMyRow, races).fastLapMs;
                      const theirs = aggregateDriverMainStats(rivalRow, races).fastLapMs;
                      if (!mine || !theirs) return "—";
                      const delta = theirs - mine;
                      return delta > 0
                        ? t("results.h2hYouFaster", { time: formatMs(delta) })
                        : delta < 0
                          ? t("results.h2hTheyFaster", { time: formatMs(Math.abs(delta)) })
                          : t("results.h2hSameLap");
                    })()}
                  />
                </div>
              ) : (
                <p className="text-sm text-text-muted m-0">{t("results.compareNotInClass")}</p>
              )}
            </div>
          )}

          {myRows.map((row) => {
            const entry = latestMainEntry(row, races);
            const lapStats = aggregateDriverMainStats(row, races);
            const finish = row.overallPosition || row.position;
            const seed = entry?.seed;
            return (
              <div
                key={row.id || row.driverNameRaw}
                className="my-results-driver-card rounded-xl border-2 px-3 py-3 space-y-3"
              >
                <div className="flex flex-wrap items-center gap-2 justify-between">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-text-muted m-0 font-semibold">
                      {t("results.myResult")}
                    </p>
                    <p className="text-base font-bold m-0 text-text-base">
                      {row.driverNameRaw}
                      {row.isTq || entry?.isTq ? (
                        <span className="text-xs font-semibold text-primary ml-1">TQ</span>
                      ) : null}
                    </p>
                  </div>
                  <ResultsStatTile
                    label={t("results.finish")}
                    value={finish != null ? `P${finish}` : "—"}
                    accent={primaryColor}
                    emphasis
                  />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <ResultsStatTile label={t("results.seed")} value={seed} />
                  <ResultsStatTile
                    label={t("results.gained")}
                    value={formatGain(positionsGained(seed, finish))}
                  />
                  <ResultsStatTile
                    label={t("results.fastLap")}
                    value={formatMs(lapStats.fastLapMs)}
                    accent={primaryColor}
                  />
                  <ResultsStatTile label={t("results.avgLap")} value={formatMs(lapStats.avgLapMs)} />
                  <ResultsStatTile
                    label={t("results.consistency")}
                    value={
                      lapStats.consistencyPct != null ? `${lapStats.consistencyPct}%` : "—"
                    }
                  />
                  <ResultsStatTile
                    label={t("results.mainLetter")}
                    value={row.mainLetter ? `${row.mainLetter} Main` : "—"}
                  />
                  <ResultsStatTile
                    label={t("results.tq")}
                    value={row.isTq || entry?.isTq ? t("results.tq") : "—"}
                  />
                </div>
              </div>
            );
          })}

          <ResultsTableSection title={t("results.finalResults")}>
            <ResultsDataTable>
              <thead>
                <tr>
                  <th className="my-results-th">{t("results.pos")}</th>
                  <th className="my-results-th">{t("results.driver")}</th>
                  <th className="my-results-th">{t("results.ifmarPoints")}</th>
                  <th className="my-results-th">{t("results.mains")}</th>
                </tr>
              </thead>
              <tbody>
                {overall.map((row) => {
                  const isMe = isMyRow(row);
                  const isCompare = isCompareDriver(row, compareDriver);
                  const pos = row.overallPosition || row.position;
                  return (
                    <tr
                      key={`${row.driverNameRaw}-${pos}`}
                      className={resultsTableRowClass({ isMe, isCompare })}
                    >
                      <PositionCell value={pos} />
                      <td className="py-2 pr-2 font-medium">
                        {row.driverNameRaw}
                        {row.isTq ? (
                          <span className="text-[10px] uppercase text-primary ml-1">TQ</span>
                        ) : null}
                      </td>
                      <td className="py-2 pr-2 tabular-nums">{row.ifmarPoints ?? "—"}</td>
                      <td className="py-2 text-xs text-text-muted">
                        {formatOverallMainsColumn(row, races)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </ResultsDataTable>
          </ResultsTableSection>

          {(qualifyingRaces.length > 0 || mainRaces.length > 0) && (
            <div className="space-y-3">
              {mainsTabOptions.length > 1 ? (
                <ClassFolderTabs
                  options={mainsTabOptions}
                  value={mainsScope}
                  onChange={setMainsScope}
                  brand={primaryColor}
                />
              ) : null}

              {qualifyingRaces.map((race) => (
                <ResultsTableSection key={race.id || raceTitle(race)} title={raceTitle(race)}>
                  <QualifyingResultsTable
                    race={race}
                    driverIds={driverIds}
                    driverNameKeys={driverNameKeys}
                    compareDriver={compareDriver}
                    t={t}
                  />
                </ResultsTableSection>
              ))}

              {mainRaces.map((race) => (
                <ResultsTableSection key={race.id || raceTitle(race)} title={raceTitle(race)}>
                  <MainResultsTable
                    race={race}
                    driverIds={driverIds}
                    driverNameKeys={driverNameKeys}
                    compareDriver={compareDriver}
                    t={t}
                  />
                </ResultsTableSection>
              ))}

              {mainsScope === "mine" && mainRaces.length === 0 && (
                <p className="text-sm text-text-muted m-0 px-1">{t("results.mainsTabNone")}</p>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );

  if (!embedded && !heading && loading) {
    return <div className="space-y-4">{body}</div>;
  }

  return (
    <Card
      className="p-0 overflow-hidden shadow-sm text-text-base"
      style={{
        border: "1px solid var(--border, #e5e7eb)",
        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
        borderRadius: "16px",
      }}
    >
      <div
        className="px-4 py-3 border-b border-border"
        style={{ background: `linear-gradient(135deg, ${primaryColor}14 0%, transparent 55%)` }}
      >
        {embedded ? (
          <p className="text-[10px] uppercase tracking-widest text-text-muted m-0 font-semibold">
            {t("results.eventDetailSection")}
          </p>
        ) : null}
        {heading ? (
          <h2 className="text-lg font-bold m-0 mt-0.5 text-text-base tracking-tight leading-snug">
            {heading}
          </h2>
        ) : null}
        {eventDateLabel ? (
          <p className="text-xs text-text-muted m-0 mt-1">{eventDateLabel}</p>
        ) : null}
        {className ? (
          <span
            className="inline-block text-[10px] font-bold uppercase tracking-wide mt-2 px-2 py-0.5 rounded-md text-white"
            style={{ backgroundColor: primaryColor }}
          >
            {className}
          </span>
        ) : null}
      </div>
      {body}
    </Card>
  );
}

function MainResultsTable({ race, driverIds, driverNameKeys, compareDriver, t }) {
  return (
    <ResultsDataTable>
      <thead>
        <tr>
          <th className="my-results-th">{t("results.pos")}</th>
          <th className="my-results-th">{t("results.driver")}</th>
          <th className="my-results-th">{t("results.lapsTime")}</th>
          <th className="my-results-th">{t("results.fastLap")}</th>
          <th className="my-results-th">{t("results.avgLap")}</th>
          <th className="my-results-th">{t("results.seed")}</th>
          <th className="my-results-th">{t("results.gained")}</th>
          <th className="my-results-th">{t("results.consistency")}</th>
        </tr>
      </thead>
      <tbody>
        {race.entries.map((entry) => (
          <tr
            key={`${entry.driverNameRaw}-${entry.position}`}
            className={entryRowClass(entry, driverIds, driverNameKeys, compareDriver)}
          >
            <PositionCell value={entry.position} />
            <td className="py-2 pr-2">
              {entry.driverNameRaw}
              {entry.isTq ? (
                <span className="text-[10px] uppercase text-primary ml-1">TQ</span>
              ) : null}
            </td>
            <td className="py-2 pr-2 tabular-nums">{entry.lapsTimeLabel || "—"}</td>
            <td className="py-2 pr-2 tabular-nums font-medium">{formatMs(entry.fastLapMs)}</td>
            <td className="py-2 pr-2 tabular-nums">{formatMs(entry.avgLapMs)}</td>
            <td className="py-2 pr-2 tabular-nums">{entry.seed ?? "—"}</td>
            <td className="py-2 pr-2 tabular-nums">{formatGain(positionsGained(entry.seed, entry.position))}</td>
            <td className="py-2 tabular-nums">
              {entry.consistencyPct != null ? `${entry.consistencyPct}%` : "—"}
            </td>
          </tr>
        ))}
      </tbody>
    </ResultsDataTable>
  );
}

function QualifyingResultsTable({ race, driverIds, driverNameKeys, compareDriver, t }) {
  const order = race.qualifyingRankMethod || DEFAULT_LIVE_RC_QUAL_ORDER;
  const rankLabel = race.qualifyingRankLabel || qualifyingOrderLabel(order, t);
  const showHeat = race.entries.some((entry) => entry.qualHeatLabel);
  const showTop5 =
    order !== "top_5_average" && race.entries.some((entry) => entry.top5AvgMs != null);
  const showTop3 = order === "top_3_consecutive" || race.entries.some((entry) => entry.top3ConMs != null);

  return (
    <ResultsDataTable>
      <thead>
        <tr>
          <th className="my-results-th">{t("results.pos")}</th>
          <th className="my-results-th">{t("results.driver")}</th>
          {showHeat && <th className="my-results-th">{t("results.heat")}</th>}
          <th className="my-results-th">{rankLabel}</th>
          <th className="my-results-th">{t("results.lapsTime")}</th>
          {showTop5 && <th className="my-results-th">{t("results.top5Average")}</th>}
          {showTop3 && <th className="my-results-th">{t("results.top3Consecutive")}</th>}
          <th className="my-results-th">{t("results.fastLap")}</th>
          <th className="my-results-th">{t("results.avgLap")}</th>
        </tr>
      </thead>
      <tbody>
        {race.entries.map((entry) => {
          const rankMs = primaryQualifyingMetric(entry, order);
          const rankDisplay =
            order === "laps_time" ? entry.lapsTimeLabel || formatMs(rankMs) : formatMs(rankMs);
          return (
            <tr
              key={`${entry.driverNameRaw}-${entry.position}`}
              className={entryRowClass(entry, driverIds, driverNameKeys, compareDriver)}
            >
              <PositionCell value={entry.position} />
              <td className="py-2 pr-2">{entry.driverNameRaw}</td>
              {showHeat && <td className="py-2 pr-2">{entry.qualHeatLabel || "—"}</td>}
              <td className="py-2 pr-2 font-medium tabular-nums">{rankDisplay || "—"}</td>
              <td className="py-2 pr-2 tabular-nums">{entry.lapsTimeLabel || "—"}</td>
              {showTop5 && <td className="py-2 pr-2 tabular-nums">{formatMs(entry.top5AvgMs)}</td>}
              {showTop3 && <td className="py-2 pr-2 tabular-nums">{formatMs(entry.top3ConMs)}</td>}
              <td className="py-2 pr-2 tabular-nums font-medium">{formatMs(entry.fastLapMs)}</td>
              <td className="py-2 pr-2 tabular-nums">{formatMs(entry.avgLapMs)}</td>
            </tr>
          );
        })}
      </tbody>
    </ResultsDataTable>
  );
}