import { useCallback, useEffect, useMemo, useState } from "react";
import Card from "@/components/ui/Card";
import FilterDropdown from "@/components/ui/FilterDropdown";
import useTheme from "@/app/providers/useTheme";
import { useClub } from "@/app/providers/ClubProvider";
import { loadResultMatchContext } from "@/app/lib/results/resultMemberMatch";
import { filterResultsBundleForClubMembers } from "@/app/lib/results/filterResultsBundle";
import { useHouseholdResultHighlight } from "@/app/hooks/useHouseholdResultHighlight";
import { useTranslation } from "@/app/i18n/I18nContext";
import { supabase } from "@/supabaseClient";
import { richTextToPlainText } from "@/app/lib/richText";
import {
  listEventResultImports,
  loadEventResultBundle,
} from "@/app/lib/results/loadEventResults";
import {
  eventDaySelectLabel,
  getEventDayRecords,
} from "@/app/lib/results/eventResultDays";
import { pickInitialResultClass, uniqueClassNames } from "@/app/lib/results/overallOrder";
import { normalizeDriverName } from "@/app/lib/results/driverName";
import {
  compareRacesForDisplay,
  formatMs,
  positionsGained,
  raceTabKey,
  raceTabLabel,
  raceTitle,
} from "@/app/lib/results/resultTime";
import {
  aggregateDriverMainStats,
  displayOverallDriverName,
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
  resultSelectionKey = null,
  initialResultDayIndex = null,
  hideResultDayPicker = false,
}) {
  const { t } = useTranslation();
  const { club } = useClub();
  const { palette } = useTheme();
  const primaryColor = palette?.primary || "#2563eb";
  const { driverIds, driverNameKeys, isMyRow } = useHouseholdResultHighlight();

  const [eventRow, setEventRow] = useState(null);
  const [bundle, setBundle] = useState(null);
  const [className, setClassName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [raceViewTab, setRaceViewTab] = useState("mine");
  const [resultDayIndex, setResultDayIndex] = useState(0);
  const [resultsMembersOnly, setResultsMembersOnly] = useState(false);
  const [memberFilterContext, setMemberFilterContext] = useState(null);

  const eventDays = useMemo(() => getEventDayRecords(eventRow), [eventRow]);
  const showDayPicker = Boolean(
    !hideResultDayPicker && eventRow?.is_multi_day && eventDays.length > 1
  );

  const dayTabOptions = useMemo(() => {
    if (!showDayPicker) return [];
    return eventDays.map((day, index) => {
      return {
        value: String(index),
        label: eventDaySelectLabel(day, index, formatEventDate),
      };
    });
  }, [showDayPicker, eventDays]);

  const displayBundle = useMemo(() => {
    if (!bundle) return null;
    if (previewUnpublished || !resultsMembersOnly) return bundle;
    return filterResultsBundleForClubMembers(bundle, memberFilterContext);
  }, [bundle, previewUnpublished, resultsMembersOnly, memberFilterContext]);

  useEffect(() => {
    if (initialResultDayIndex != null && !Number.isNaN(initialResultDayIndex)) {
      setResultDayIndex(initialResultDayIndex);
    }
  }, [eventId, initialResultDayIndex]);

  useEffect(() => {
    async function loadMeta() {
      if (!eventId) return;
      setError("");
      setResultsMembersOnly(false);
      setMemberFilterContext(null);
      try {
        const { data: eventData } = await supabase
          .from("events")
          .select(
            "id, name, event_date, is_multi_day, days, classes_by_day, championship_id, club_id"
          )
          .eq("id", eventId)
          .single();
        setEventRow(eventData);
        let hideNonMembers = false;
        if (eventData?.championship_id) {
          const { data: champ } = await supabase
            .from("championships")
            .select("results_members_only")
            .eq("id", eventData.championship_id)
            .maybeSingle();
          hideNonMembers = champ?.results_members_only === true;
        }
        setResultsMembersOnly(hideNonMembers);
        const clubId = eventData?.club_id || club?.id;
        if (hideNonMembers && !previewUnpublished && clubId) {
          const roster = await loadResultMatchContext(supabase, clubId);
          if (!roster.loadError) {
            setMemberFilterContext({
              rosterIndex: roster.rosterIndex,
              drivers: roster.drivers,
              households: roster.households,
            });
          }
        }
        const imports = await listEventResultImports(eventId, {
          includeUnpublished: previewUnpublished,
        });
        const dayIndexes = imports
          .map((row) => row.result_day_index)
          .filter((value) => value != null);
        const preferred =
          initialResultDayIndex != null &&
          imports.some((row) => row.result_day_index === initialResultDayIndex)
            ? initialResultDayIndex
            : initialResultDayIndex != null
              ? initialResultDayIndex
              : dayIndexes.length
                ? Math.min(...dayIndexes)
                : 0;
        setResultDayIndex(preferred);
      } catch (err) {
        setError(err.message || t("results.loadFailed"));
      }
    }
    loadMeta();
  }, [eventId, previewUnpublished, initialResultDayIndex, club?.id, t]);

  useEffect(() => {
    async function loadBundle() {
      if (!eventId) return;
      setLoading(true);
      setError("");
      try {
        const loadOptions = {
          includeUnpublished: previewUnpublished,
        };
        if (eventRow?.is_multi_day) {
          loadOptions.resultDayIndex = resultDayIndex;
        }
        const next = await loadEventResultBundle(eventId, loadOptions);
        setBundle(next);
      } catch (err) {
        setError(err.message || t("results.loadFailed"));
        setBundle(null);
      } finally {
        setLoading(false);
      }
    }
    if (!eventRow) return;
    loadBundle();
  }, [eventId, eventRow, resultDayIndex, previewUnpublished, t]);

  useEffect(() => {
    if (!displayBundle) return;
    const classes = uniqueClassNames(displayBundle);
    setClassName((current) => {
      if (current && classes.includes(current)) return current;
      if (preferredClass && classes.includes(preferredClass)) return preferredClass;
      return pickInitialResultClass(displayBundle, driverIds, (name) =>
        driverNameKeys.has(normalizeDriverName(name))
      );
    });
  }, [displayBundle, driverIds, driverNameKeys, preferredClass]);

  const classOptions = useMemo(() => {
    if (!displayBundle) return [];
    return uniqueClassNames(displayBundle).map((name) => ({ value: name, label: name }));
  }, [displayBundle]);

  const overall = (displayBundle?.overall || [])
    .filter((row) => row.className === className)
    .sort((a, b) => (a.overallPosition || a.position || 0) - (b.overallPosition || b.position || 0));
  const races = (displayBundle?.races || []).filter((race) => race.className === className);

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

  const showRaceTabs = sortedClassRaces.length > 0;

  const raceTabOptions = useMemo(() => {
    if (!sortedClassRaces.length) return [];
    const options = [{ value: "mine", label: t("results.mainsTabMine") }];
    sortedClassRaces.forEach((race, index) => {
      options.push({
        value: raceTabKey(race, index),
        label: raceTabLabel(race),
      });
    });
    return options;
  }, [sortedClassRaces, t]);

  const visibleRacesForTab = useMemo(() => {
    if (raceViewTab === "mine") {
      return sortedClassRaces.filter(
        (race) => race.raceKind !== "qualifying" && raceHasHouseholdDriver(race)
      );
    }
    const index = raceTabOptions.findIndex((opt) => opt.value === raceViewTab);
    if (index < 0) return [];
    const raceIndex = index - 1;
    if (raceIndex < 0 || raceIndex >= sortedClassRaces.length) return [];
    return [sortedClassRaces[raceIndex]];
  }, [raceViewTab, raceTabOptions, sortedClassRaces, raceHasHouseholdDriver]);

  useEffect(() => {
    setRaceViewTab("mine");
  }, [className]);

  useEffect(() => {
    if (raceTabOptions.some((opt) => opt.value === raceViewTab)) return;
    setRaceViewTab("mine");
  }, [raceTabOptions, raceViewTab]);
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

  const hasCompareChoices = compareOptions.some((o) => o.value);

  const resolvedCompareValue = useMemo(() => {
    if (!compareDriver) return "";
    const key = normalizeDriverName(compareDriver);
    const match = compareOptions.find(
      (o) => o.value && normalizeDriverName(o.value) === key
    );
    return match?.value || "";
  }, [compareDriver, compareOptions]);

  const rivalRow = useMemo(
    () =>
      resolvedCompareValue
        ? overall.find((row) => isCompareDriver(row, resolvedCompareValue))
        : null,
    [overall, resolvedCompareValue]
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
  const eventDateLabel = useMemo(() => {
    if (bundle?.result?.result_day_date) return formatEventDate(bundle.result.result_day_date);
    if (showDayPicker && eventDays[resultDayIndex]?.date) {
      return formatEventDate(eventDays[resultDayIndex].date);
    }
    return eventRow?.event_date ? formatEventDate(eventRow.event_date) : "";
  }, [bundle, showDayPicker, eventDays, resultDayIndex, eventRow]);

  const body = (
    <>
      {showDraftBanner && previewUnpublished && bundle?.result?.published === false && (
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 m-0">
          {t("results.adminPreviewDraft")}
        </p>
      )}

      {loading && <p className="text-text-muted m-0 text-sm px-4 py-3">{t("loading.loading")}</p>}
      {error && <p className="text-red-600 m-0 text-sm px-4 py-3">{error}</p>}
      {resultsMembersOnly && displayBundle && !previewUnpublished && (
        <p className="text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 m-4 mb-0">
          {t("results.championshipMembersOnlyResults")}
        </p>
      )}

      {!loading && !displayBundle && !showDayPicker && (
        <p className="text-text-muted m-0 text-sm px-4 py-3">{t("results.notAvailable")}</p>
      )}

      {(showDayPicker || displayBundle) && (
        <div className="p-4 space-y-4">
          {showDayPicker && dayTabOptions.length > 0 && (
            <FilterDropdown
              value={String(resultDayIndex)}
              onChange={(value) => setResultDayIndex(Number(value) || 0)}
              options={dayTabOptions}
              ariaLabel={t("results.resultDay")}
              hideSelectedOption={false}
              preserveOptionOrder
              variant="premium"
            />
          )}
          {!loading && !displayBundle && showDayPicker && (
            <p className="text-text-muted m-0 text-sm">{t("results.notAvailableForDay")}</p>
          )}
          {displayBundle ? (
          <>
          <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              {embedded && eventOptions?.length && onEventChange ? (
                <FilterDropdown
                  value={resultSelectionKey ?? eventId}
                  onChange={onEventChange}
                  ariaLabel={t("results.filterEvent")}
                  options={eventOptions}
                  hideSelectedOption={false}
                  preserveOptionOrder
                  compact
                  variant="premium"
                  className="flex-1 min-w-[12rem]"
                />
              ) : null}
              {displayBundle && classOptions.length > 0 && (
                <FilterDropdown
                  value={className}
                  onChange={setClassName}
                  ariaLabel={t("results.filterClass")}
                  options={classOptions}
                  hideSelectedOption={false}
                  compact
                  variant="premium"
                  className="flex-1 min-w-[10rem]"
                />
              )}
            </div>
            {onCompareDriverChange && hasCompareChoices && (
              <FilterDropdown
                value={resolvedCompareValue}
                onChange={(value) => onCompareDriverChange(value || "")}
                ariaLabel={t("results.compareDriver")}
                emptyTriggerLabel={t("results.compareDriverPlaceholder")}
                options={compareOptions}
                hideSelectedOption={false}
                preserveOptionOrder
                compact
                menuInline
                className="w-full min-w-0"
              />
            )}
          </div>

          {resolvedCompareValue && primaryMyRow && (
            <div className="rounded-xl border border-amber-200/90 bg-amber-50/35 px-3 py-3 space-y-2">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-900/80">
                {t("results.eventHeadToHead", { name: resolvedCompareValue })}
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
                        {displayOverallDriverName(row, races)}
                        {row.isTq ? (
                          <span className="text-[10px] uppercase text-primary ml-1">TQ</span>
                        ) : null}
                      </td>
                      <td className="py-2 pr-2 tabular-nums">
                        {row.ifmarPoints != null && row.ifmarPoints !== ""
                          ? row.ifmarPoints
                          : /^\d+(\.\d+)?$/.test(String(row.tieBreaker || "").trim())
                            ? row.tieBreaker
                            : "—"}
                      </td>
                      <td className="py-2 text-xs text-text-muted">
                        {formatOverallMainsColumn(row, races)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </ResultsDataTable>
          </ResultsTableSection>

          {showRaceTabs && (
            <div className="space-y-3">
              <h4 className="m-0 text-[11px] font-semibold uppercase tracking-wider text-text-muted px-1">
                {t("results.qualifyingAndMains")}
              </h4>
              <FilterDropdown
                options={raceTabOptions}
                value={raceViewTab}
                onChange={setRaceViewTab}
                ariaLabel={t("results.qualifyingAndMains")}
                hideSelectedOption={false}
                preserveOptionOrder
                variant="premium"
              />

              {visibleRacesForTab.map((race) => (
                <ResultsTableSection key={race.id || raceTabKey(race)} title={raceTitle(race)}>
                  {race.raceKind === "qualifying" ? (
                    <QualifyingResultsTable
                      race={race}
                      driverIds={driverIds}
                      driverNameKeys={driverNameKeys}
                      compareDriver={compareDriver}
                      t={t}
                    />
                  ) : (
                    <MainResultsTable
                      race={race}
                      driverIds={driverIds}
                      driverNameKeys={driverNameKeys}
                      compareDriver={compareDriver}
                      t={t}
                    />
                  )}
                </ResultsTableSection>
              ))}

              {raceViewTab === "mine" && visibleRacesForTab.length === 0 && (
                <p className="text-sm text-text-muted m-0 px-1">{t("results.mainsTabNone")}</p>
              )}
            </div>
          )}
          </>
          ) : null}
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