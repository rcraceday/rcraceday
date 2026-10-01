import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { FlagIcon } from "@heroicons/react/24/solid";
import PageTitle from "@/components/ui/PageTitle";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import useTheme from "@/app/providers/useTheme";
import { useDrivers } from "@/app/providers/DriverProvider";
import { useTranslation } from "@/app/i18n/I18nContext";
import { supabase } from "@/supabaseClient";
import { richTextToPlainText } from "@/app/lib/richText";
import { loadEventResultBundle } from "@/app/lib/results/loadEventResults";
import { pickInitialResultClass, uniqueClassNames } from "@/app/lib/results/overallOrder";
import { normalizeDriverName } from "@/app/lib/results/driverName";
import { formatMs, positionsGained, raceTitle } from "@/app/lib/results/resultTime";
import {
  aggregateDriverMainStats,
  formatOverallMainsColumn,
  latestMainEntry,
} from "@/app/lib/results/aggregateDriverStats";
import { primaryQualifyingMetric, qualifyingOrderLabel } from "@/app/lib/results/qualifyingRank";

function Stat({ label, value }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <div className="text-[11px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className="text-sm font-semibold text-slate-800">{value ?? "—"}</div>
    </div>
  );
}

export default function EventResults({ previewUnpublished = false, adminBack = false }) {
  const { clubSlug, id } = useParams();
  const { palette } = useTheme();
  const { t } = useTranslation();
  const { drivers } = useDrivers();
  const [eventRow, setEventRow] = useState(null);
  const [bundle, setBundle] = useState(null);
  const [className, setClassName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const driverIds = useMemo(() => new Set((drivers || []).map((driver) => driver.id)), [drivers]);
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

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const { data: eventData } = await supabase.from("events").select("id, name, event_date").eq("id", id).single();
        setEventRow(eventData);
        const next = await loadEventResultBundle(id, {
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
  }, [id, previewUnpublished]);

  useEffect(() => {
    if (!bundle) return;
    const classes = uniqueClassNames(bundle);
    setClassName((current) => {
      if (current && classes.includes(current)) return current;
      return pickInitialResultClass(bundle, driverIds, (name) =>
        driverNameKeys.has(normalizeDriverName(name))
      );
    });
  }, [bundle, driverIds, driverNameKeys]);

  const classes = bundle ? uniqueClassNames(bundle) : [];
  const overall = (bundle?.overall || [])
    .filter((row) => row.className === className)
    .sort((a, b) => (a.overallPosition || a.position || 0) - (b.overallPosition || b.position || 0));
  const races = (bundle?.races || []).filter((race) => race.className === className);
  const myRows = overall.filter((row) => {
    if (row.driverId && driverIds.has(row.driverId)) return true;
    return driverNameKeys.has(normalizeDriverName(row.driverNameRaw));
  });

  return (
    <div className="space-y-4 pb-8">
      <PageTitle icon={FlagIcon} title={t("results.title")} style={{ color: palette.primary }}>
        {richTextToPlainText(eventRow?.name) || t("results.title")}
      </PageTitle>

      <Link
        to={
          adminBack
            ? `/${clubSlug}/app/admin/events/${id}/results`
            : `/${clubSlug}/app/events/${id}`
        }
        className="no-underline"
      >
        <Button variant="secondary" size="sm">
          {adminBack ? t("results.backToImport") : t("results.backToEvent")}
        </Button>
      </Link>

      {previewUnpublished && bundle?.result?.published === false && (
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          {t("results.adminPreviewDraft")}
        </p>
      )}

      {loading && <p className="text-text-muted">{t("loading.loading")}</p>}
      {error && <p className="text-red-600">{error}</p>}
      {!loading && !bundle && <p className="text-text-muted">{t("results.notAvailable")}</p>}

      {bundle && (
        <>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {classes.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => setClassName(name)}
                className="rounded-full px-3 py-1 text-sm font-medium whitespace-nowrap"
                style={{
                  background: className === name ? palette.primary : "#F1F5F9",
                  color: className === name ? "#fff" : "#334155",
                }}
              >
                {name}
              </button>
            ))}
          </div>

          {myRows.map((row) => {
            const entry = latestMainEntry(row, races);
            const lapStats = aggregateDriverMainStats(row, races);
            const finish = row.overallPosition || row.position;
            const seed = entry?.seed;
            return (
            <Card key={row.id || row.driverNameRaw} className="p-4 space-y-3">
              <div className="font-semibold text-slate-900">{t("results.myResult")}</div>
              <div className="text-sm text-slate-600">{row.driverNameRaw}{row.isTq || entry?.isTq ? " [TQ]" : ""}</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <Stat label={t("results.seed")} value={seed} />
                <Stat label={t("results.finish")} value={finish} />
                <Stat label={t("results.gained")} value={formatGain(positionsGained(seed, finish))} />
                <Stat label={t("results.tq")} value={row.isTq || entry?.isTq ? t("results.tq") : "—"} />
                <Stat label={t("results.fastLap")} value={formatMs(lapStats.fastLapMs)} />
                <Stat label={t("results.avgLap")} value={formatMs(lapStats.avgLapMs)} />
                <Stat label={t("results.consistency")} value={lapStats.consistencyPct != null ? `${lapStats.consistencyPct}%` : "—"} />
                <Stat label={t("results.mainLetter")} value={row.mainLetter ? `${row.mainLetter} Main` : "—"} />
              </div>
            </Card>
            );
          })}

          <Card className="p-4 overflow-x-auto">
            <div className="font-semibold mb-3">{t("results.overall")}</div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="py-1 pr-2">{t("results.pos")}</th>
                  <th className="py-1 pr-2">{t("results.driver")}</th>
                  <th className="py-1 pr-2">{t("results.ifmarPoints")}</th>
                  <th className="py-1">{t("results.mains")}</th>
                </tr>
              </thead>
              <tbody>
                {overall.map((row) => (
                  <tr
                    key={`${row.driverNameRaw}-${row.overallPosition}`}
                    className={row.driverId && driverIds.has(row.driverId) ? "bg-slate-50 font-medium" : ""}
                  >
                    <td className="py-1 pr-2">{row.overallPosition || row.position}</td>
                    <td className="py-1 pr-2">
                      {row.driverNameRaw}
                      {row.isTq ? " [TQ]" : ""}
                    </td>
                    <td className="py-1 pr-2">{row.ifmarPoints ?? "—"}</td>
                    <td className="py-1 text-xs text-slate-600">
                      {formatOverallMainsColumn(row, races)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {races.map((race) => (
            <Card key={race.id || raceTitle(race)} className="p-4 overflow-x-auto">
              <div className="font-semibold mb-3">{raceTitle(race)}</div>
              {race.raceKind === "qualifying" ? (
                <QualifyingResultsTable race={race} driverIds={driverIds} t={t} />
              ) : (
                <MainResultsTable race={race} driverIds={driverIds} t={t} />
              )}
            </Card>
          ))}
        </>
      )}
    </div>
  );
}

function formatGain(value) {
  if (value == null) return "—";
  if (value > 0) return `+${value}`;
  return String(value);
}

function MainResultsTable({ race, driverIds, t }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-slate-500">
          <th className="py-1 pr-2">{t("results.pos")}</th>
          <th className="py-1 pr-2">{t("results.driver")}</th>
          <th className="py-1 pr-2">{t("results.lapsTime")}</th>
          <th className="py-1 pr-2">{t("results.fastLap")}</th>
          <th className="py-1 pr-2">{t("results.avgLap")}</th>
          <th className="py-1 pr-2">{t("results.seed")}</th>
          <th className="py-1 pr-2">{t("results.gained")}</th>
          <th className="py-1">{t("results.consistency")}</th>
        </tr>
      </thead>
      <tbody>
        {race.entries.map((entry) => (
          <tr
            key={`${entry.driverNameRaw}-${entry.position}`}
            className={entry.driverId && driverIds.has(entry.driverId) ? "bg-slate-50 font-medium" : ""}
          >
            <td className="py-1 pr-2">{entry.position}</td>
            <td className="py-1 pr-2">
              {entry.driverNameRaw}
              {entry.isTq ? " [TQ]" : ""}
            </td>
            <td className="py-1 pr-2">{entry.lapsTimeLabel || "—"}</td>
            <td className="py-1 pr-2">{formatMs(entry.fastLapMs)}</td>
            <td className="py-1 pr-2">{formatMs(entry.avgLapMs)}</td>
            <td className="py-1 pr-2">{entry.seed ?? "—"}</td>
            <td className="py-1 pr-2">{formatGain(positionsGained(entry.seed, entry.position))}</td>
            <td className="py-1">{entry.consistencyPct != null ? `${entry.consistencyPct}%` : "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function QualifyingResultsTable({ race, driverIds, t }) {
  const order = race.qualifyingRankMethod || "laps_time";
  const rankLabel =
    race.qualifyingRankLabel || qualifyingOrderLabel(order, t);
  const showHeat = race.entries.some((entry) => entry.qualHeatLabel);
  const showTop5 =
    order !== "top_5_average" && race.entries.some((entry) => entry.top5AvgMs != null);
  const showTop3 = order === "top_3_consecutive" || race.entries.some((entry) => entry.top3ConMs != null);

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-slate-500">
          <th className="py-1 pr-2">{t("results.pos")}</th>
          <th className="py-1 pr-2">{t("results.driver")}</th>
          {showHeat && <th className="py-1 pr-2">{t("results.heat")}</th>}
          <th className="py-1 pr-2">{rankLabel}</th>
          <th className="py-1 pr-2">{t("results.lapsTime")}</th>
          {showTop5 && <th className="py-1 pr-2">{t("results.top5Average")}</th>}
          {showTop3 && <th className="py-1 pr-2">{t("results.top3Consecutive")}</th>}
          <th className="py-1 pr-2">{t("results.fastLap")}</th>
          <th className="py-1 pr-2">{t("results.avgLap")}</th>
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
              className={entry.driverId && driverIds.has(entry.driverId) ? "bg-slate-50 font-medium" : ""}
            >
              <td className="py-1 pr-2">{entry.position}</td>
              <td className="py-1 pr-2">{entry.driverNameRaw}</td>
              {showHeat && <td className="py-1 pr-2">{entry.qualHeatLabel || "—"}</td>}
              <td className="py-1 pr-2 font-medium">{rankDisplay || "—"}</td>
              <td className="py-1 pr-2">{entry.lapsTimeLabel || "—"}</td>
              {showTop5 && <td className="py-1 pr-2">{formatMs(entry.top5AvgMs)}</td>}
              {showTop3 && <td className="py-1 pr-2">{formatMs(entry.top3ConMs)}</td>}
              <td className="py-1 pr-2">{formatMs(entry.fastLapMs)}</td>
              <td className="py-1 pr-2">{formatMs(entry.avgLapMs)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
