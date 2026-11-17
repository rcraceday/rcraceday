import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/supabaseClient";
import { useAuth } from "@/app/providers/AuthProvider";
import { useClub } from "@/app/providers/ClubProvider";
import { useTranslation } from "@/app/i18n/I18nContext";
import CMSCard from "@cms/CMSCard";
import CMSButton from "@cms/CMSButton";
import CMSInput from "@cms/CMSInput";
import CMSSelect from "@cms/CMSSelect";
import CMSToggle from "@cms/CMSToggle";
import { cmsStyles } from "@cms/styles";
import { parseLiveTimeRoundResultFile } from "@/app/lib/results/parseLiveTimeRoundResult";
import { importLiveRcResults } from "@/app/lib/results/importLiveRcResults";
import {
  DEFAULT_LIVE_RC_RACE_FORMAT,
  LIVE_RC_RACE_FORMATS,
  reprocessLiveRcImport,
} from "@/app/lib/results/liveRcImport";
import { raceFormatLabel } from "@/app/lib/results/raceFormatLabel";
import { DeleteButton } from "@cms/CMSButtonSet";
import { deleteEventResults, saveEventResults, unmatchedNames } from "@/app/lib/results/saveEventResults";
import { loadResultMatchContext } from "@/app/lib/results/resultMemberMatch";
import { uniqueClassNames } from "@/app/lib/results/overallOrder";
import {
  DEFAULT_LIVE_RC_QUAL_ORDER,
  LIVE_RC_QUAL_ORDERS,
  qualifyingOrderLabel,
} from "@/app/lib/results/qualifyingRank";
import { richTextToPlainText } from "@/app/lib/richText";
import {
  eventDaySelectLabel,
  getEventDayRecords,
  resultDayIndexFromEvent,
} from "@/app/lib/results/eventResultDays";
import { listEventResultImports } from "@/app/lib/results/loadEventResults";

function isMissingSchemaError(error) {
  return /does not exist|schema cache|championship_id|qualifying_rank|top5_avg|qual_heat|result_day/i.test(
    error?.message || ""
  );
}

function formatDayDate(date) {
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

export default function AdminEventResults() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { clubSlug, id } = useParams();
  const { club } = useClub();
  const { user } = useAuth();

  const [eventRow, setEventRow] = useState(null);
  const [championships, setChampionships] = useState([]);
  const [matchContext, setMatchContext] = useState(null);
  const [drivers, setDrivers] = useState([]);
  const [resultImports, setResultImports] = useState([]);
  const [importDayIndex, setImportDayIndex] = useState(0);
  const [parsed, setParsed] = useState(null);
  const [livercUrl, setLivercUrl] = useState("");
  const [qualifyingOrder, setQualifyingOrder] = useState(DEFAULT_LIVE_RC_QUAL_ORDER);
  const [raceFormat, setRaceFormat] = useState(DEFAULT_LIVE_RC_RACE_FORMAT);
  const [liveRcPayload, setLiveRcPayload] = useState(null);
  const [championshipId, setChampionshipId] = useState("");
  const [published, setPublished] = useState(true);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [busyAction, setBusyAction] = useState(null);
  const [error, setError] = useState("");
  const [unmatched, setUnmatched] = useState([]);

  useEffect(() => {
    if (!club?.id || !id) return;
    load();
  }, [club?.id, id]);

  useEffect(() => {
    if (!liveRcPayload) return;
    try {
      const next = reprocessLiveRcImport(liveRcPayload, {
        qualifyingOrder,
        raceFormat,
      });
      setParsed(next);
      setUnmatched(unmatchedNames(next, matchContext?.rosterIndex));
    } catch (err) {
      setError(err.message || t("results.importFailed"));
    }
  }, [qualifyingOrder, raceFormat, liveRcPayload, matchContext?.rosterIndex, t]);

  async function load() {
    setLoading(true);
    setError("");
    const [{ data: eventData, error: eventError }, { data: champs }, roster] = await Promise.all([
      supabase.from("events").select("*").eq("id", id).single(),
      supabase.from("championships").select("id, name, season").eq("club_id", club.id).order("created_at", { ascending: false }),
      loadResultMatchContext(supabase, club.id),
    ]);
    let imports = [];
    try {
      imports = await listEventResultImports(id, { includeUnpublished: true });
    } catch (importError) {
      if (isMissingSchemaError(importError)) setError(t("results.setupRequired"));
      else setError(importError.message);
    }
    if (eventError) setError(eventError.message);
    else if (roster.loadError) setError(roster.loadError.message);
    setEventRow(eventData || null);
    setChampionships(champs || []);
    setMatchContext(roster);
    setDrivers(roster?.drivers || []);
    setResultImports(imports);
    setChampionshipId(eventData?.championship_id || "");
    const dayIdx = eventData?.is_multi_day ? importDayIndex : 0;
    const existingForDay =
      eventData?.is_multi_day
        ? imports.find((row) => row.result_day_index === dayIdx)
        : imports.find((row) => row.result_day_index == null);
    setPublished(existingForDay?.published !== false);
    if (existingForDay?.source_url) setLivercUrl(existingForDay.source_url);
    setLoading(false);
  }

  async function handleFile(file) {
    if (!file) return;
    setBusy(true);
    setBusyAction("file");
    setError("");
    try {
      const next = await parseLiveTimeRoundResultFile(file);
      setLiveRcPayload(null);
      setParsed(next);
      setUnmatched(unmatchedNames(next, matchContext?.rosterIndex));
    } catch (err) {
      setError(err.message || t("results.importFailed"));
    } finally {
      setBusy(false);
      setBusyAction(null);
    }
  }

  async function handleLiveRc() {
    setBusy(true);
    setBusyAction("liverc");
    setError("");
    try {
      const { payload } = await importLiveRcResults(livercUrl.trim(), {
        qualifyingOrder,
        raceFormat,
      });
      setLiveRcPayload(payload);
    } catch (err) {
      setError(err.message || t("results.importFailed"));
    } finally {
      setBusy(false);
      setBusyAction(null);
    }
  }

  async function handleSave() {
    if (!parsed) return;
    setBusy(true);
    setBusyAction("save");
    setError("");
    try {
      const { resultDayIndex, resultDayDate } = resultDayIndexFromEvent(eventRow, importDayIndex);
      await saveEventResults({
        supabase,
        clubId: club.id,
        eventId: id,
        parsed,
        drivers,
        rosterIndex: matchContext?.rosterIndex,
        userId: user?.id,
        published,
        resultDayIndex,
        resultDayDate,
      });
      if (championshipId !== (eventRow?.championship_id || "")) {
        await supabase.from("events").update({ championship_id: championshipId || null }).eq("id", id);
      }
      await load();
      setParsed(null);
      setLiveRcPayload(null);
    } catch (err) {
      setError(err.message || t("results.saveFailed"));
    } finally {
      setBusy(false);
      setBusyAction(null);
    }
  }

  async function handleRemove() {
    if (!window.confirm(t("results.removeResultsConfirm"))) return;
    setBusy(true);
    setBusyAction("remove");
    setError("");
    try {
      const { resultDayIndex } = resultDayIndexFromEvent(eventRow, importDayIndex);
      await deleteEventResults({
        supabase,
        eventId: id,
        resultDayIndex,
      });
      await load();
      setParsed(null);
      setLiveRcPayload(null);
    } catch (err) {
      setError(err.message || t("results.removeResultsFailed"));
    } finally {
      setBusy(false);
      setBusyAction(null);
    }
  }

  const busyMessage =
    busyAction === "liverc"
      ? t("results.importingLiveRc")
      : busyAction === "file"
        ? t("results.importingFile")
        : busyAction === "save"
          ? t("results.savingResults")
          : busyAction === "remove"
            ? t("results.removingResults")
            : "";

  const eventName = richTextToPlainText(eventRow?.name) || t("admin.nominations.eventFallback");
  const classes = parsed ? uniqueClassNames(parsed) : [];
  const eventDays = getEventDayRecords(eventRow);
  const existing =
    eventRow?.is_multi_day
      ? resultImports.find((row) => row.result_day_index === importDayIndex)
      : resultImports.find((row) => row.result_day_index == null);
  const dayOptions =
    eventRow?.is_multi_day && eventDays.length > 0
      ? eventDays.map((day, index) => ({
          value: String(index),
          label: eventDaySelectLabel(day, index, formatDayDate),
        }))
      : [];

  return (
    <div style={cmsStyles.pageContainer}>
    <div style={cmsStyles.pageContent}>
      <div style={cmsStyles.sectionHeaderWithActions}>
        <h1 style={cmsStyles.sectionHeaderTitle}>
          {t("results.adminTitle")}: {eventName}
        </h1>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {resultImports.length > 0 && (
            <CMSButton
              onClick={() =>
                navigate(
                  `/${clubSlug}/app/admin/events/${id}/results/preview${
                    eventRow?.is_multi_day ? `?day=${importDayIndex}` : ""
                  }`
                )
              }
            >
              {t("results.viewResults")}
            </CMSButton>
          )}
          <CMSButton onClick={() => navigate(`/${clubSlug}/app/admin/events`)}>
            {t("results.back")}
          </CMSButton>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded bg-red-50 text-red-700 border border-red-200">{error}</div>
      )}
      {loading && <div>{t("loading.loading")}</div>}

      <CMSCard title={t("results.importCard")}>
        <p className="text-sm text-slate-600">{t("results.importHelp")}</p>
        {dayOptions.length > 0 && (
          <CMSSelect
            label={t("results.resultDay")}
            value={String(importDayIndex)}
            onChange={(value) => {
              const next = Number(value) || 0;
              setImportDayIndex(next);
              const row = resultImports.find((item) => item.result_day_index === next);
              setPublished(row?.published !== false);
              if (row?.source_url) setLivercUrl(row.source_url);
            }}
            options={dayOptions}
            sortOptions={false}
          />
        )}
        {dayOptions.length > 0 && (
          <p className="text-sm text-slate-500">{t("results.resultDayHelp")}</p>
        )}
        {busyMessage && (
          <div
            className="p-3 rounded bg-sky-50 text-sky-900 border border-sky-200 text-sm"
            role="status"
            aria-live="polite"
          >
            {busyMessage}
          </div>
        )}
        <label className="text-sm font-medium text-slate-700">
          {t("results.uploadXls")}
          <input
            type="file"
            accept=".xls,.csv"
            className="mt-2 block"
            disabled={busy}
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </label>
        <CMSInput
          label={t("results.liveRcUrl")}
          value={livercUrl}
          onChange={setLivercUrl}
          placeholder="https://chargersrc.liverc.com/results/"
        />
        <CMSSelect
          label={t("results.qualifyingRanking")}
          value={qualifyingOrder}
          onChange={setQualifyingOrder}
          options={LIVE_RC_QUAL_ORDERS.map((value) => ({
            value,
            label: qualifyingOrderLabel(value, t),
          }))}
          sortOptions={false}
        />
        <p className="text-sm text-slate-500">{t("results.qualifyingRankingHelp")}</p>
        <CMSSelect
          label={t("results.raceFormat")}
          value={raceFormat}
          onChange={setRaceFormat}
          options={LIVE_RC_RACE_FORMATS.map((value) => ({
            value,
            label: raceFormatLabel(value, t),
          }))}
          sortOptions={false}
        />
        <p className="text-sm text-slate-500">{t("results.raceFormatHelp")}</p>
        <CMSButton onClick={handleLiveRc} disabled={busy || !livercUrl.trim()}>
          {busyAction === "liverc" ? t("loading.loading") : t("results.importUrl")}
        </CMSButton>
        <CMSSelect
          label={t("results.championship")}
          value={championshipId || "none"}
          onChange={(value) => setChampionshipId(value === "none" ? "" : value)}
          placeholder={t("results.noChampionship")}
          options={[
            { value: "none", label: t("results.noChampionship") },
            ...championships.map((champ) => ({
              value: champ.id,
              label: `${champ.name} (${champ.season})`,
            })),
          ]}
          sortOptions={false}
        />
        <CMSToggle label={t("results.published")} checked={published} onChange={setPublished} />
        {existing && (
          <div className="flex flex-wrap items-center gap-3">
            <div className="text-sm text-slate-600">
              {t("results.existingImport")}: {existing.source_label || existing.source} ·{" "}
              {new Date(existing.imported_at).toLocaleString()}
            </div>
            <DeleteButton onClick={handleRemove} disabled={busy}>
              {busyAction === "remove" ? t("results.removingResults") : t("results.removeResults")}
            </DeleteButton>
          </div>
        )}
        {eventRow?.is_multi_day && resultImports.length > 0 && (
          <div className="text-sm text-slate-500">
            {t("results.importedDaysCount", {
              count: resultImports.filter((row) => row.result_day_index != null).length,
              total: eventDays.length,
            })}
          </div>
        )}
      </CMSCard>

      {parsed && (
        <CMSCard title={t("results.preview")}>
          <div className="text-sm text-slate-700">
            {t("results.previewSummary", {
              races: parsed.races?.length || 0,
              overall: parsed.overall?.length || 0,
              classes: classes.length,
            })}
          </div>
          {parsed.qualifyingOrder && (
            <div className="text-sm text-slate-600">
              {t("results.qualifyingRanking")}: {qualifyingOrderLabel(parsed.qualifyingOrder, t)}
              {parsed.raceFormat ? ` · ${raceFormatLabel(parsed.raceFormat, t)}` : ""}
            </div>
          )}
          <div className="text-sm text-slate-600">{classes.join(", ")}</div>
          {matchContext?.rosterIndex?.memberNameKeys && (
            <p className="text-sm text-slate-500">
              {t("results.rosterCount", {
                count: matchContext.rosterIndex.memberNameKeys.size,
              })}
            </p>
          )}
          {unmatched.length > 0 && (
            <div>
              <div className="font-medium text-sm mb-1">{t("results.unmatchedDrivers")}</div>
              <p className="text-sm text-slate-500 mb-2">{t("results.unmatchedDriversHelp")}</p>
              <ul className="text-sm text-slate-600 list-disc pl-5">
                {unmatched.map((name) => (
                  <li key={name}>{name}</li>
                ))}
              </ul>
            </div>
          )}
          <CMSButton onClick={handleSave} disabled={busy}>
            {busyAction === "save" ? t("results.savingResults") : t("results.saveResults")}
          </CMSButton>
        </CMSCard>
      )}
    </div>
    </div>
  );
}
