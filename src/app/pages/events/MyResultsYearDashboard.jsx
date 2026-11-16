import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Card from "@/components/ui/Card";
import FilterDropdown from "@/components/ui/FilterDropdown";
import useTheme from "@/app/providers/useTheme";
import { useTranslation } from "@/app/i18n/I18nContext";
import { useDrivers } from "@/app/providers/DriverProvider";
import { supabase } from "@/supabaseClient";
import { normalizeDriverName } from "@/app/lib/results/driverName";
import { formatMs } from "@/app/lib/results/resultTime";
import { buildMyResultsYearSummary } from "@/app/lib/results/buildMyResultsYearSummary";
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
}) {
  const { t } = useTranslation();
  const { palette } = useTheme();
  const { drivers } = useDrivers();
  const [summary, setSummary] = useState(null);
  const [championshipRows, setChampionshipRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [champLoading, setChampLoading] = useState(false);

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
  const rivalColor = palette?.secondary || "#b45309";

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

  const classChampionships = useMemo(
    () => championshipRows.filter((row) => row.className === activeClass),
    [championshipRows, activeClass]
  );

  const compareKey = compareDriver ? normalizeDriverName(compareDriver) : "";
  const seasonMatchups = useMemo(() => {
    if (!bundle || !compareKey) return [];
    return bundle.matchupsByRivalKey?.[compareKey] || [];
  }, [bundle, compareKey]);

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

  if (!summary || summary.eventsWithResults === 0 || !bundle) {
    return (
      <Card className="p-4 text-sm text-text-muted m-0">{t("results.dashboardNoDataYear")}</Card>
    );
  }

  const lapTrendLabel =
    bundle.lapTrendMs == null
      ? "—"
      : bundle.lapTrendMs < 0
        ? t("results.trendFaster", { time: formatMs(Math.abs(bundle.lapTrendMs)) })
        : bundle.lapTrendMs > 0
          ? t("results.trendSlower", { time: formatMs(bundle.lapTrendMs) })
          : t("results.trendFlat");

  const finishChartPoints =
    bundle.monthlyFinishes?.length > 0
      ? bundle.monthlyFinishes.map((row) => ({
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
      : bundle.eventFinishes.map((row, i) => ({
          id: `${row.eventId}-${i}`,
          sortKey: row.eventDate,
          monthLabel: formatShortDate(row.eventDate),
          value: row.finish,
          tooltip: t("results.chartFinishTooltipEvent", { pos: row.finish }),
        }));

  const lapChartPoints =
    bundle.monthlyLaps?.length > 0
      ? bundle.monthlyLaps.map((row) => ({
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
      : bundle.eventLaps.map((row, i) => ({
          id: `${row.eventId}-${i}`,
          sortKey: row.eventDate,
          monthLabel: formatShortDate(row.eventDate),
          value: row.fastLapMs,
          tooltip: formatMs(row.fastLapMs),
        }));

  return (
    <Card className="p-0 overflow-hidden border-border shadow-sm">
      <div
        className="px-4 py-3 border-b border-border"
        style={{ background: `linear-gradient(135deg, ${primaryColor}14 0%, transparent 55%)` }}
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-text-muted m-0 font-semibold">
              {t("results.yearDashboardTitle", { year })}
            </p>
            <h2 className="text-lg font-bold m-0 text-text-base tracking-tight">{activeClass}</h2>
            <p className="text-[11px] text-text-muted m-0 mt-1">{t("results.yearDashboardHint")}</p>
          </div>
          {classOptions.length > 1 && onDashboardClassChange ? (
            <FilterDropdown
              value={activeClass}
              onChange={(value) => onDashboardClassChange(value)}
              ariaLabel={t("results.filterClass")}
              options={classOptions}
              hideSelectedOption={false}
              compact
              fullWidth={false}
              className="!w-auto min-w-[10rem]"
            />
          ) : null}
        </div>
        {bundle.driverNames?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            <span className="text-[10px] uppercase text-text-muted self-center mr-1">
              {t("results.yourDrivers")}
            </span>
            {bundle.driverNames.map((name) => (
              <span
                key={name}
                className="text-xs font-bold px-2.5 py-1 rounded-full text-white shadow-sm"
                style={{ backgroundColor: primaryColor }}
              >
                {name}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <StatTile label={t("results.dashboardClassEntries")} value={bundle.starts} accent={primaryColor} />
          <StatTile label={t("results.dashboardBestFinish")} value={`P${bundle.bestFinish ?? "—"}`} accent={primaryColor} />
          <StatTile label={t("results.dashboardAvgFinish")} value={bundle.avgFinish} />
          <StatTile
            label={t("results.dashboardBestLap")}
            value={bundle.bestLapMs ? formatMs(bundle.bestLapMs) : "—"}
          />
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <ResultsSeasonLineChart
            title={t("results.finishPositionTrend")}
            hint={t("results.finishTrendByMonthHint")}
            points={finishChartPoints}
            formatValue={(v) => `P${Math.round(v)}`}
            lowerIsBetter
            stroke={primaryColor}
            fill={primaryColor}
          />
          <ResultsSeasonLineChart
            title={t("results.fastLapTrendByMonth")}
            hint={t("results.lapTrendByMonthHint", { trend: lapTrendLabel })}
            points={lapChartPoints}
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
                <span className="font-semibold">{richTextToPlainText(row.championshipName) || row.championshipName}</span>
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

        {bundle.rivals?.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
              {t("results.mainCompetitors")}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {bundle.rivals.map((rival) => {
                const active = compareDriver === rival.name;
                return (
                  <button
                    key={rival.name}
                    type="button"
                    onClick={() =>
                      onCompareDriverChange?.(active ? "" : rival.name)
                    }
                    className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md border transition-colors ${
                      active
                        ? "border-amber-400 bg-amber-50 text-amber-950"
                        : "border-border bg-surface-alt/50 text-text-base hover:border-primary/40"
                    }`}
                    style={active ? { borderColor: rivalColor } : undefined}
                  >
                    <span className="truncate max-w-[8.5rem]">{rival.name}</span>
                    <span className="text-[10px] tabular-nums text-text-muted font-semibold">
                      {rival.closeRaces}
                    </span>
                  </button>
                );
              })}
            </div>
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
    </Card>
  );
}