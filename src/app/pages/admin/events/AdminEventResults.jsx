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
import { saveEventResults, unmatchedNames } from "@/app/lib/results/saveEventResults";
import { loadResultMatchContext } from "@/app/lib/results/resultMemberMatch";
import { uniqueClassNames } from "@/app/lib/results/overallOrder";
import {
  DEFAULT_LIVE_RC_QUAL_ORDER,
  LIVE_RC_QUAL_ORDERS,
  qualifyingOrderLabel,
} from "@/app/lib/results/qualifyingRank";
import { richTextToPlainText } from "@/app/lib/richText";

function isMissingSchemaError(error) {
  return /does not exist|schema cache|championship_id|qualifying_rank|top5_avg|qual_heat/i.test(
    error?.message || ""
  );
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
  const [existing, setExisting] = useState(null);
  const [parsed, setParsed] = useState(null);
  const [livercUrl, setLivercUrl] = useState("");
  const [qualifyingOrder, setQualifyingOrder] = useState(DEFAULT_LIVE_RC_QUAL_ORDER);
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

  async function load() {
    setLoading(true);
    setError("");
    const [{ data: eventData, error: eventError }, { data: champs }, resultQuery, roster] =
      await Promise.all([
        supabase.from("events").select("*").eq("id", id).single(),
        supabase.from("championships").select("id, name, season").eq("club_id", club.id).order("created_at", { ascending: false }),
        supabase.from("event_results").select("*").eq("event_id", id).maybeSingle(),
        loadResultMatchContext(supabase, club.id),
      ]);
    if (eventError) setError(eventError.message);
    else if (roster.loadError) setError(roster.loadError.message);
    else if (isMissingSchemaError(resultQuery.error)) setError(t("results.setupRequired"));
    else if (resultQuery.error) setError(resultQuery.error.message);
    const resultRow = resultQuery.data || null;
    setEventRow(eventData || null);
    setChampionships(champs || []);
    setMatchContext(roster);
    setDrivers(roster?.drivers || []);
    setExisting(resultRow);
    setChampionshipId(eventData?.championship_id || "");
    setPublished(resultRow?.published !== false);
    if (resultRow?.source_url) setLivercUrl(resultRow.source_url);
    setLoading(false);
  }

  async function handleFile(file) {
    if (!file) return;
    setBusy(true);
    setBusyAction("file");
    setError("");
    try {
      const next = await parseLiveTimeRoundResultFile(file);
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
      const next = await importLiveRcResults(livercUrl.trim(), { qualifyingOrder });
      setParsed(next);
      setUnmatched(unmatchedNames(next, matchContext?.rosterIndex));
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
      await saveEventResults({
        supabase,
        clubId: club.id,
        eventId: id,
        parsed,
        drivers,
        rosterIndex: matchContext?.rosterIndex,
        userId: user?.id,
        published,
      });
      if (championshipId !== (eventRow?.championship_id || "")) {
        await supabase.from("events").update({ championship_id: championshipId || null }).eq("id", id);
      }
      await load();
      setParsed(null);
    } catch (err) {
      setError(err.message || t("results.saveFailed"));
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
          : "";

  const eventName = richTextToPlainText(eventRow?.name) || t("admin.nominations.eventFallback");
  const classes = parsed ? uniqueClassNames(parsed) : [];

  return (
    <div style={cmsStyles.pageContainer}>
    <div style={cmsStyles.pageContent}>
      <div style={cmsStyles.sectionHeaderWithActions}>
        <h1 style={cmsStyles.sectionHeaderTitle}>
          {t("results.adminTitle")}: {eventName}
        </h1>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {existing && (
            <CMSButton
              onClick={() => navigate(`/${clubSlug}/app/admin/events/${id}/results/preview`)}
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
          <div className="text-sm text-slate-600">
            {t("results.existingImport")}: {existing.source_label || existing.source} ·{" "}
            {new Date(existing.imported_at).toLocaleString()}
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
