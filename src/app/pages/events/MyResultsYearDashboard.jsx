import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDownIcon } from "@heroicons/react/24/solid";
import Card from "@/components/ui/Card";
import ClassFolderTabs from "@/components/ui/ClassFolderTabs";
import FilterDropdown from "@/components/ui/FilterDropdown";
import useTheme from "@/app/providers/useTheme";
import { useTranslation } from "@/app/i18n/I18nContext";
import { useDrivers } from "@/app/providers/DriverProvider";
import { supabase } from "@/supabaseClient";
import { normalizeDriverName } from "@/app/lib/results/driverName";
import { formatMs } from "@/app/lib/results/resultTime";
import {
  buildMyResultsYearSummary,
  competitorSeriesPoints,
  sliceClassBundleForDriver,
} from "@/app/lib/results/buildMyResultsYearSummary";
import { buildMyChampionshipYearSummary } from "@/app/lib/results/buildMyChampionshipYearSummary";
import { richTextToPlainText } from "@/app/lib/richText";
import { ResultsDataTable } from "@/app/pages/events/results/ResultsTableSection";
import ResultsSeasonLineChart from "@/app/pages/events/results/ResultsSeasonLineChart";

function StatTile({ label, value, accent }) {
  return (
    <div
      className="rounded-lg px-3 py-2 min-w-0 border"
      style={
        accent
          ? { borderColor: `${accent}33`, backgroundColor: `${accent}0d` }
          : undefined
      }
    >
      <div className="text-[10px] uppercase tracking-wide text-text-muted">{label}</div>
      <div className="text-sm font-bold text-text-base tabular-nums">{value ?? "—"}</div>
    </div>
  );
}

function formatShortDate(date) {
  if (!date) return "";
  try {
    return new Date(date).toLocaleDateString(undefined, { day: "numeric", month: "short" });
  } catch {
    return date;
  }
}

export default function MyResultsYearDashboard({
  year,
  events,
  championships = [],
  clubId,
  clubSlug,
  dashboardClass = "",
  onDashboardClassChange,
  compareDriver = "",
  onCompareDriverChange,
  onActiveHouseholdDriverChange,
}) {
  const { t } = useTranslation();
  const { palette } = useTheme();
  const { drivers } = useDrivers();
  const [summary, setSummary] = useState(null);
  const [championshipRows, setChampionshipRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [champLoading, setChampLoading] = useState(false);
  const [activeDriver, setActiveDriver] = useState("");

  const driverIds = useMemo(() => new Set((drivers || []).map((d) => d.id)), [drivers]);
  const driverNameKeys = useMemo(() => {
    const keys = new Set();
    (drivers || []).forEach((driver) => {
      const parts = [driver.first_name, driver.last_name, driver.display_name, driver.name]
        .filter(Boolean)
        .join(" ");
      if (parts) keys.add(normalizeDriverName(parts));
    });
    return keys;
  }, [drivers]);

  const canLoad = Boolean(events?.length && (driverIds.size || driverNameKeys.size));
  const shouldLoadChamps = Boolean(canLoad && clubId && championships?.length);
  const primaryColor = palette?.primary || "#2563eb";
  const compareColor = palette?.secondary || "#b45309";

  useEffect(() => {
    if (!canLoad) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setLoading(true);
    });
    buildMyResultsYearSummary(events, driverIds, driverNameKeys, drivers)
      .then((data) => {
        if (!cancelled) setSummary(data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [canLoad, events, driverIds, driverNameKeys, drivers, year]);

  useEffect(() => {
    if (!shouldLoadChamps) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setChampLoading(true);
    });
    buildMyChampionshipYearSummary({
      supabase,
      clubId,
      year,
      championships,
      driverIds,
      driverNameKeys,
    })
      .then((rows) => {
        if (!cancelled) setChampionshipRows(rows);
      })
      .finally(() => {
        if (!cancelled) setChampLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [shouldLoadChamps, clubId, year, championships, driverIds, driverNameKeys]);

  const classBundles = useMemo(() => summary?.classBundles || [], [summary]);

  const activeClass = useMemo(() => {
    if (!classBundles.length) return "";
    if (dashboardClass && classBundles.some((b) => b.className === dashboardClass)) {
      return dashboardClass;
    }
    return classBundles[0].className;
  }, [classBundles, dashboardClass]);

  const classOptions = useMemo(
    () => classBundles.map((b) => ({ value: b.className, label: b.className })),
    [classBundles]
  );

  const bundle = useMemo(
    () => classBundles.find((b) => b.className === activeClass) || null,
    [classBundles, activeClass]
  );

  const householdDriverNames = useMemo(() => {
    const names = new Set();
    classBundles.forEach((row) => row.driverNames?.forEach((name) => names.add(name)));
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [classBundles]);

  const driverTabOptions = useMemo(
    () => householdDriverNames.map((name) => ({ value: name, label: name })),
    [householdDriverNames]
  );

  useEffect(() => {
    if (householdDriverNames.length > 1) {
      setActiveDriver((prev) =>
        prev && householdDriverNames.includes(prev) ? prev : householdDriverNames[0]
      );
    } else {
      setActiveDriver("");
    }
  }, [householdDriverNames]);

  useEffect(() => {
    if (!onActiveHouseholdDriverChange) return;
    const name =
      householdDriverNames.length > 1
        ? activeDriver || householdDriverNames[0]
        : householdDriverNames[0] || "";
    onActiveHouseholdDriverChange(name);
  }, [householdDriverNames, activeDriver, onActiveHouseholdDriverChange]);

  const displayBundle = useMemo(() => {
    if (!bundle) return null;
    if (householdDriverNames.length <= 1) return bundle;
    const driver = activeDriver || householdDriverNames[0];
    return sliceClassBundleForDriver(bundle, driver);
  }, [bundle, householdDriverNames, activeDriver]);

  const rivalCompareOptions = useMemo(() => {
    const rivals = displayBundle?.rivals || [];
    if (!rivals.length) return [];
    return [
      { value: "", label: t("results.compareNone") },
      ...rivals.map(({ name, avgGap }) => {
        const gapLabel =
          avgGap != null ? t("results.competitorAvgGapSuffix", { gap: avgGap }) : "";
        return {
          value: name,
          label: `${t("results.competitorCloseMarker")}${name}${gapLabel}`,
        };
      }),
    ];
  }, [displayBundle?.rivals, t]);

  useEffect(() => {
    if (!compareDriver || !onCompareDriverChange) return;
    const allowed = new Set((displayBundle?.rivals || []).map((r) => r.name));
    if (!allowed.has(compareDriver)) onCompareDriverChange("");
  }, [displayBundle?.rivals, compareDriver, onCompareDriverChange]);

  const compareKey = compareDriver ? normalizeDriverName(compareDriver) : "";

  const selectedCompetitor = useMemo(() => {
    if (!compareDriver || !displayBundle?.competitors) return null;
    return (
      displayBundle.competitors[compareDriver] ||
      Object.values(displayBundle.competitors).find(
        (row) => normalizeDriverName(row.name) === compareKey
      ) ||
      null
    );
  }, [compareDriver, displayBundle?.competitors, compareKey]);

  const classChampionships = useMemo(() => {
    const driver =
      householdDriverNames.length > 1 ? activeDriver || householdDriverNames[0] : "";
    return championshipRows.filter((row) => {
      if (row.className !== activeClass) return false;
      if (!driver) return true;
      return normalizeDriverName(row.driverName) === normalizeDriverName(driver);
    });
  }, [championshipRows, activeClass, householdDriverNames, activeDriver]);

  const seasonMatchups = useMemo(() => {
    if (!displayBundle || !compareKey) return [];
    return displayBundle.matchupsByRivalKey?.[compareKey] || [];
  }, [displayBundle, compareKey]);

  if (!drivers?.length) {
    return (
      <Card className="p-4 text-sm text-text-muted">{t("results.dashboardNoDrivers")}</Card>
    );
  }

  if (!canLoad) {
    return (
      <Card className="p-4 text-sm text-text-muted m-0">{t("results.dashboardNoDataYear")}</Card>
    );
  }

  if (loading && !summary) {
    return <p className="text-sm text-text-muted m-0">{t("results.dashboardLoading")}</p>;
  }

  if (!summary || summary.eventsWithResults === 0 || !displayBundle) {
    return (
      <Card className="p-4 text-sm text-text-muted m-0">{t("results.dashboardNoDataYear")}</Card>
    );
  }

  const lapTrendLabel =
    displayBundle.lapTrendMs == null
      ? "—"
      : displayBundle.lapTrendMs < 0
        ? t("results.trendFaster", { time: formatMs(Math.abs(displayBundle.lapTrendMs)) })
        : displayBundle.lapTrendMs > 0
          ? t("results.trendSlower", { time: formatMs(displayBundle.lapTrendMs) })
          : t("results.trendFlat");

  const finishChartPoints =
    displayBundle.monthlyFinishes?.length > 0
      ? displayBundle.monthlyFinishes.map((row) => ({
          id: row.monthKey,
          sortKey: row.monthKey,
          monthKey: row.monthKey,
          monthLabel: row.monthLabel,
          value: row.finish,
          tooltip: t("results.chartFinishTooltip", {
            month: row.monthLabel,
            pos: row.finish,
          }),
        }))
      : displayBundle.eventFinishes.map((row, i) => ({
          id: `${row.eventId}-${i}`,
          sortKey: row.eventDate,
          monthLabel: formatShortDate(row.eventDate),
          value: row.finish,
          tooltip: t("results.chartFinishTooltipEvent", { pos: row.finish }),
        }));

  const lapChartPoints =
    displayBundle.monthlyLaps?.length > 0
      ? displayBundle.monthlyLaps.map((row) => ({
          id: row.monthKey,
          sortKey: row.monthKey,
          monthKey: row.monthKey,
          monthLabel: row.monthLabel,
          value: row.fastLapMs,
          tooltip: t("results.chartLapTooltip", {
            month: row.monthLabel,
            lap: formatMs(row.fastLapMs),
          }),
        }))
      : displayBundle.eventLaps.map((row, i) => ({
          id: `${row.eventId}-${i}`,
          sortKey: row.eventDate,
          monthLabel: formatShortDate(row.eventDate),
          value: row.fastLapMs,
          tooltip: formatMs(row.fastLapMs),
        }));

  const monthlyChart = displayBundle.monthlyFinishes?.length > 0;
  const compareFinishOverlays = selectedCompetitor
    ? [
        {
          id: "compare-finish",
          label: selectedCompetitor.name,
          stroke: compareColor,
          points: competitorSeriesPoints(selectedCompetitor, "finish", {
            monthlyFirst: monthlyChart,
            formatShortDate,
          }),
        },
      ]
    : [];
  const compareLapOverlays = selectedCompetitor
    ? [
        {
          id: "compare-lap",
          label: selectedCompetitor.name,
          stroke: compareColor,
          points: competitorSeriesPoints(selectedCompetitor, "lap", {
            monthlyFirst: displayBundle.monthlyLaps?.length > 0,
            formatShortDate,
          }),
        },
      ]
    : [];

  const dashboardTitle = t("results.yearDashboardTitle", { year });

  return (
    <Card className="p-0 overflow-hidden border-border shadow-sm">
      <details className="group" open>
        <summary
          className="list-none [&::-webkit-details-marker]:hidden cursor-pointer px-4 py-3 border-b border-border"
          style={{ background: `linear-gradient(135deg, ${primaryColor}14 0%, transparent 55%)` }}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-text-base m-0 leading-snug">{dashboardTitle}</p>
              <p className="text-[11px] text-text-muted m-0 mt-1">{t("results.yearDashboardHint")}</p>
            </div>
            <ChevronDownIcon
              className="h-5 w-5 shrink-0 text-text-muted transition-transform group-open:rotate-180"
              style={{ color: primaryColor }}
              aria-hidden
            />
          </div>
        </summary>

        {householdDriverNames.length > 1 ? (
          <ClassFolderTabs
            options={driverTabOptions}
            value={activeDriver || householdDriverNames[0]}
            onChange={setActiveDriver}
            brand={primaryColor}
          />
        ) : null}

        {classOptions.length > 1 && onDashboardClassChange ? (
          <ClassFolderTabs
            options={classOptions}
            value={activeClass}
            onChange={onDashboardClassChange}
            brand={primaryColor}
          />
        ) : null}

        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <StatTile label={t("results.dashboardClassEntries")} value={displayBundle.starts} accent={primaryColor} />
            <StatTile label={t("results.dashboardBestFinish")} value={`P${displayBundle.bestFinish ?? "—"}`} accent={primaryColor} />
            <StatTile label={t("results.dashboardAvgFinish")} value={displayBundle.avgFinish} />
            <StatTile
              label={t("results.dashboardBestLap")}
              value={displayBundle.bestLapMs ? formatMs(displayBundle.bestLapMs) : "—"}
            />
          </div>

          {rivalCompareOptions.length > 0 ? (
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold text-text-muted m-0 px-0.5 leading-snug">
                {t("results.mainCompetitors")}
              </p>
              <p className="text-[10px] text-text-muted m-0 px-0.5 leading-snug">
                {t("results.mainCompetitorsHint")}
              </p>
              <FilterDropdown
                value={compareDriver || ""}
                onChange={(value) => onCompareDriverChange?.(value || "")}
                ariaLabel={t("results.mainCompetitors")}
                emptyTriggerLabel={t("results.compareDriverPlaceholder")}
                options={rivalCompareOptions}
                hideSelectedOption={false}
                preserveOptionOrder
                compact
                menuInline
                className="w-full"
              />
            </div>
          ) : null}

          <div className="grid gap-3 md:grid-cols-2">
            <ResultsSeasonLineChart
              title={t("results.finishPositionTrend")}
              hint={
                selectedCompetitor
                  ? t("results.finishTrendCompareHint", { name: selectedCompetitor.name })
                  : t("results.finishTrendByMonthHint")
              }
              points={finishChartPoints}
              overlaySeries={compareFinishOverlays}
              formatValue={(v) => `P${Math.round(v)}`}
              lowerIsBetter
              stroke={primaryColor}
              fill={primaryColor}
            />
            <ResultsSeasonLineChart
              title={t("results.fastLapTrendByMonth")}
              hint={
                selectedCompetitor
                  ? t("results.lapTrendCompareHint", { name: selectedCompetitor.name, trend: lapTrendLabel })
                  : t("results.lapTrendByMonthHint", { trend: lapTrendLabel })
              }
              points={lapChartPoints}
              overlaySeries={compareLapOverlays}
              formatValue={(v) => formatMs(v)}
              lowerIsBetter
              stroke={primaryColor}
              fill={primaryColor}
            />
          </div>

          {shouldLoadChamps && !champLoading && classChampionships.length > 0 && (
            <div className="rounded-xl border border-border/80 px-3 py-2.5 space-y-2">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                {t("results.championshipYearTitle")}
              </div>
              {classChampionships.map((row) => (
                <div key={`${row.championshipId}-${row.driverName}`} className="text-sm">
                  <span className="font-semibold">
                    {richTextToPlainText(row.championshipName) || row.championshipName}
                  </span>
                  <span className="text-text-muted text-xs ml-2">
                    {t("results.championshipStandingLine", {
                      rank: row.rank,
                      points: row.totalPoints,
                    })}
                  </span>
                  {clubSlug ? (
                    <Link
                      to={`/${clubSlug}/app/championships/${row.championshipId}`}
                      className="text-xs font-medium ml-2 text-primary"
                    >
                      →
                    </Link>
                  ) : null}
                </div>
              ))}
            </div>
          )}

          {compareDriver && seasonMatchups.length > 0 && (
            <div className="rounded-xl border border-amber-200/80 bg-amber-50/30 px-3 py-2 overflow-x-auto">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-900/80 mb-2">
                {t("results.seasonHeadToHead", { name: compareDriver })}
              </div>
              <ResultsDataTable className="text-xs">
                <thead>
                  <tr>
                    <th className="my-results-th">{t("results.h2hEvent")}</th>
                    <th className="my-results-th">{t("results.h2hYou")}</th>
                    <th className="my-results-th">{t("results.h2hThem")}</th>
                    <th className="my-results-th">{t("results.h2hGap")}</th>
                  </tr>
                </thead>
                <tbody>
                  {seasonMatchups.map((row) => {
                    const gap = row.rivalFinish - row.myFinish;
                    const gapLabel =
                      gap === 0
                        ? t("results.h2hTied")
                        : gap > 0
                          ? t("results.h2hAhead", { count: gap })
                          : t("results.h2hBehind", { count: Math.abs(gap) });
                    return (
                      <tr key={row.eventId} className="my-results-row-you font-semibold">
                        <td className="py-1 pr-2 whitespace-nowrap">
                          {formatShortDate(row.eventDate)}
                          {row.myDriverName ? (
                            <span
                              className="ml-1 text-[10px] font-bold px-1 rounded"
                              style={{ color: primaryColor }}
                            >
                              {row.myDriverName.split(" ").pop()}
                            </span>
                          ) : null}
                        </td>
                        <td className="py-1 pr-2 font-bold tabular-nums" style={{ color: primaryColor }}>
                          P{row.myFinish}
                        </td>
                        <td className="py-1 pr-2 tabular-nums text-amber-900">P{row.rivalFinish}</td>
                        <td className="py-1">{gapLabel}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </ResultsDataTable>
            </div>
          )}
        </div>
      </details>
    </Card>
  );
}