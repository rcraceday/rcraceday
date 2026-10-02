import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/supabaseClient";
import { useTranslation } from "@/app/i18n/I18nContext";
import { loadChampionshipRounds } from "@/app/lib/results/loadEventResults";
import { computeChampionshipStandings } from "@/app/lib/results/championshipStandings";
import {
  DEFAULT_CHAMPIONSHIP_POINTS,
  pointsTableFromChampionship,
  spreadFromChampionship,
} from "@/app/lib/results/championshipPointsTable";
import ChampionshipPointsTableEditor from "./ChampionshipPointsTableEditor";
import { loadResultMatchContext } from "@/app/lib/results/resultMemberMatch";
import {
  downloadChampionshipCsv,
  printChampionshipStandings,
} from "@/app/lib/results/championshipExport";
import {
  getDriverDelta,
  normalizePointAdjustments,
  setDriverDelta,
} from "@/app/lib/results/championshipAdjustments";
import ChampionshipDriverRoundsPanel from "./ChampionshipDriverRoundsPanel";
import { useClub } from "@/app/providers/ClubProvider";
import CMSCard from "@cms/CMSCard";
import CMSButton from "@cms/CMSButton";
import CMSInput from "@cms/CMSInput";
import CMSToggle from "@cms/CMSToggle";
import { cmsStyles } from "@cms/styles";
import { loadChampionshipClassOptions } from "./loadChampionshipClassOptions";
import CMSImageUpload from "@cms/CMSImageUpload";
import { uploadChampionshipLogo } from "@/app/lib/championshipLogo";

export default function AdminChampionshipManage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { clubSlug, id } = useParams();
  const { club } = useClub();

  const [championship, setChampionship] = useState(null);
  const [rounds, setRounds] = useState([]);
  const [roster, setRoster] = useState(null);
  const [memberships, setMemberships] = useState([]);
  const [classOptions, setClassOptions] = useState([]);

  const [name, setName] = useState("");
  const [season, setSeason] = useState("");
  const [membersOnly, setMembersOnly] = useState(true);
  const [totalRounds, setTotalRounds] = useState(0);
  const [dropRounds, setDropRounds] = useState(0);
  const [selectedClasses, setSelectedClasses] = useState([]);
  const [pointsTable, setPointsTable] = useState(DEFAULT_CHAMPIONSHIP_POINTS);
  const [pointsSpread, setPointsSpread] = useState(null);
  const [pointAdjustments, setPointAdjustments] = useState(normalizePointAdjustments());
  const [logoUrl, setLogoUrl] = useState("");
  const [logoFile, setLogoFile] = useState(null);

  const [showSettings, setShowSettings] = useState(false);
  const [expandedKey, setExpandedKey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const championshipForCompute = useMemo(() => {
    if (!championship) return null;
    return {
      ...championship,
      name,
      season,
      members_only: membersOnly,
      total_rounds: totalRounds,
      drop_rounds: dropRounds,
      classes: selectedClasses,
      points_table: pointsTable,
      point_adjustments: pointAdjustments,
    };
  }, [
    championship,
    name,
    season,
    membersOnly,
    totalRounds,
    dropRounds,
    selectedClasses,
    pointsTable,
    pointAdjustments,
  ]);

  const tables = useMemo(() => {
    if (!championshipForCompute || !roster) return [];
    return computeChampionshipStandings({
      championship: championshipForCompute,
      rounds,
      drivers: roster.drivers,
      memberships,
      rosterIndex: roster.rosterIndex,
    });
  }, [championshipForCompute, rounds, roster, memberships]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError("");
    const { data: champ, error: champError } = await supabase
      .from("championships")
      .select("*")
      .eq("id", id)
      .single();
    if (champError) {
      setError(champError.message);
      setLoading(false);
      return;
    }
    setChampionship(champ);
    setName(champ.name || "");
    setSeason(champ.season || "");
    setMembersOnly(champ.members_only !== false);
    setTotalRounds(Number(champ.total_rounds) || 0);
    setDropRounds(Number(champ.drop_rounds) || 0);
    setSelectedClasses(Array.isArray(champ.classes) ? [...champ.classes] : []);
    setPointsTable(pointsTableFromChampionship(champ));
    setPointsSpread(spreadFromChampionship(champ));
    setPointAdjustments(normalizePointAdjustments(champ.point_adjustments));
    setLogoUrl(champ.logo_url || "");
    setLogoFile(null);

    const clubId = club?.id || champ.club_id;
    const [roundRows, rosterCtx, classCtx, membershipRows] = await Promise.all([
      loadChampionshipRounds(champ.id),
      loadResultMatchContext(supabase, clubId),
      loadChampionshipClassOptions(supabase, clubId),
      supabase
        .from("household_memberships")
        .select("id, status, membership_type, start_date, end_date, duration, period")
        .eq("club_id", clubId),
    ]);
    setRounds(roundRows);
    setRoster(rosterCtx);
    setClassOptions(classCtx.classOptions);
    setMemberships(membershipRows.data || []);
    setLoading(false);
  }, [id, club?.id]);

  useEffect(() => {
    if (id) loadAll();
  }, [id, loadAll]);

  function toggleClass(className) {
    setSelectedClasses((prev) =>
      prev.includes(className) ? prev.filter((c) => c !== className) : [...prev, className]
    );
  }

  async function handleSave() {
    if (!championship) return;
    setSaving(true);
    setError("");
    setMessage("");
    let nextLogoUrl = logoUrl;
    if (logoFile) {
      const { publicUrl, error: logoError } = await uploadChampionshipLogo(supabase, {
        clubSlug,
        championshipId: championship.id,
        file: logoFile,
        previousUrlOrPath: logoUrl,
      });
      if (logoError) {
        setSaving(false);
        setError(logoError.message || "Could not upload logo.");
        return;
      }
      if (publicUrl) nextLogoUrl = publicUrl;
    }

    const { error: updateError } = await supabase
      .from("championships")
      .update({
        name: name.trim(),
        season: season.trim(),
        members_only: membersOnly,
        total_rounds: Number(totalRounds) || 0,
        drop_rounds: Number(dropRounds) || 0,
        classes: selectedClasses,
        points_table: pointsTable,
        points_spread: pointsSpread,
        point_adjustments: pointAdjustments,
        logo_url: nextLogoUrl || null,
      })
      .eq("id", championship.id);
    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setMessage(t("admin.championships.saved"));
    await loadAll();
  }

  function updateDriverDelta(className, driverKey, value) {
    setPointAdjustments((prev) => setDriverDelta(prev, className, driverKey, value));
  }

  return (
    <div style={cmsStyles.pageContainer}>
      <style>
        {`
          @media print {
            .no-print { display: none !important; }
            .admin-root nav, .admin-root header { display: none !important; }
            .championship-print-area { padding: 0; }
          }
        `}
      </style>
      <div style={cmsStyles.pageContent} className="championship-print-area">
        <div style={cmsStyles.sectionHeaderWithActions} className="no-print">
          <h1 style={cmsStyles.sectionHeaderTitle}>
            {championship?.name || t("admin.championships.title")}
          </h1>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <CMSButton
              variant="secondary"
              onClick={() => printChampionshipStandings()}
              disabled={!tables.length}
            >
              {t("admin.championships.print")}
            </CMSButton>
            <CMSButton
              variant="secondary"
              onClick={() =>
                downloadChampionshipCsv(championshipForCompute || championship, tables)
              }
              disabled={!tables.length}
            >
              {t("admin.championships.exportCsv")}
            </CMSButton>
            <CMSButton onClick={() => navigate(`/${clubSlug}/app/admin/championships`)}>
              {t("results.back")}
            </CMSButton>
          </div>
        </div>

        {championship && (
          <p style={{ ...cmsStyles.sectionHeaderSubtitle, marginTop: 0 }}>
            {t("results.seasonN", { season: championship.season })}
          </p>
        )}

        {error && (
          <div className="no-print p-3 rounded bg-red-50 text-red-700 border border-red-200">
            {error}
          </div>
        )}
        {message && (
          <div className="no-print p-3 rounded bg-green-50 text-green-800 border border-green-200">
            {message}
          </div>
        )}

        {loading && <div>{t("loading.loading")}</div>}

        {!loading && championship && (
          <>
            <CMSCard title={t("admin.championships.settings")} className="no-print">
              <CMSButton variant="secondary" onClick={() => setShowSettings((v) => !v)}>
                {showSettings
                  ? t("admin.championships.hideSettings")
                  : t("admin.championships.editSettings")}
              </CMSButton>
              {showSettings && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 16 }}>
                  <CMSInput label={t("admin.championships.name")} value={name} onChange={setName} />
                  <CMSInput
                    label={t("admin.championships.seasonLabel")}
                    value={season}
                    onChange={setSeason}
                  />
                  <CMSImageUpload
                    label={t("admin.championships.logo")}
                    value={logoUrl}
                    filePreview={logoFile}
                    onChange={(file) => {
                      if (file) {
                        setLogoFile(file);
                      } else {
                        setLogoFile(null);
                        setLogoUrl("");
                      }
                    }}
                  />
                  <CMSToggle
                    label={t("admin.championships.membersOnly")}
                    checked={membersOnly}
                    onChange={setMembersOnly}
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <CMSInput
                      label={t("admin.championships.totalRounds")}
                      type="number"
                      value={String(totalRounds)}
                      onChange={(value) => setTotalRounds(Number(value))}
                    />
                    <CMSInput
                      label={t("admin.championships.dropRounds")}
                      type="number"
                      value={String(dropRounds)}
                      onChange={(value) => setDropRounds(Number(value))}
                    />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                      {t("admin.championships.classes")}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {classOptions.map((cls) => (
                        <label key={cls} className="flex items-center gap-2 text-sm text-slate-700">
                          <input
                            type="checkbox"
                            checked={selectedClasses.includes(cls)}
                            onChange={() => toggleClass(cls)}
                          />
                          {cls}
                        </label>
                      ))}
                    </div>
                  </div>
                  <ChampionshipPointsTableEditor
                    clubId={club?.id || championship?.club_id}
                    pointsTable={pointsTable}
                    onChange={setPointsTable}
                    spreadConfig={pointsSpread}
                    onSpreadConfigChange={setPointsSpread}
                  />
                  <CMSButton onClick={handleSave} disabled={saving}>
                    {saving ? t("loading.loading") : t("admin.championships.save")}
                  </CMSButton>
                </div>
              )}
            </CMSCard>

            {tables.map((table) => (
              <CMSCard key={table.className} title={table.className}>
                <table style={{ width: "100%", fontSize: 14, borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ textAlign: "left", color: "#6B7280" }}>
                      <th style={{ padding: "4px 12px 4px 0" }}>{t("results.pos")}</th>
                      <th style={{ padding: "4px 12px 4px 0" }}>{t("results.driver")}</th>
                      <th style={{ padding: "4px 12px 4px 0" }} className="no-print">
                        {t("admin.championships.adjustment")}
                      </th>
                      <th style={{ padding: "4px 0" }}>{t("results.points")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {table.standings.map((row) => {
                      const adj = getDriverDelta(pointAdjustments, table.className, row.key);
                      const isOpen = expandedKey === `${table.className}::${row.key}`;
                      return (
                        <Fragment key={row.key}>
                          <tr>
                            <td style={{ padding: "4px 12px 4px 0" }}>{row.rank}</td>
                            <td style={{ padding: "4px 12px 4px 0" }}>
                              {row.driverName}
                              <button
                                type="button"
                                className="no-print"
                                style={{
                                  marginLeft: 8,
                                  background: "none",
                                  border: "none",
                                  padding: 0,
                                  cursor: "pointer",
                                  color: "#2563EB",
                                  fontSize: 12,
                                }}
                                onClick={() =>
                                  setExpandedKey(isOpen ? null : `${table.className}::${row.key}`)
                                }
                              >
                                {t("admin.championships.editRounds")}
                              </button>
                            </td>
                            <td style={{ padding: "4px 12px 4px 0" }} className="no-print">
                              <input
                                type="number"
                                className="border rounded px-2 py-1 w-20 text-sm"
                                value={adj === 0 ? "" : String(adj)}
                                placeholder="0"
                                onChange={(e) =>
                                  updateDriverDelta(
                                    table.className,
                                    row.key,
                                    e.target.value === "" ? 0 : e.target.value
                                  )
                                }
                              />
                            </td>
                            <td style={{ padding: "4px 0" }}>{row.total}</td>
                          </tr>
                          {isOpen && (
                            <tr key={`${row.key}-detail`} className="no-print">
                              <td colSpan={4} style={{ padding: "8px 0 16px" }}>
                                <ChampionshipDriverRoundsPanel
                                  className={table.className}
                                  row={row}
                                  rounds={rounds}
                                  pointsTable={pointsTable}
                                  pointAdjustments={pointAdjustments}
                                  setPointAdjustments={setPointAdjustments}
                                />
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </CMSCard>
            ))}

            <div className="no-print" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <CMSButton onClick={handleSave} disabled={saving}>
                {saving ? t("loading.loading") : t("admin.championships.savePoints")}
              </CMSButton>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
