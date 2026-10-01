import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/supabaseClient";
import { useTranslation } from "@/app/i18n/I18nContext";
import { loadChampionshipRounds } from "@/app/lib/results/loadEventResults";
import { computeChampionshipStandings } from "@/app/lib/results/championshipStandings";
import { loadResultMatchContext } from "@/app/lib/results/resultMemberMatch";
import { useClub } from "@/app/providers/ClubProvider";
import CMSCard from "@cms/CMSCard";
import CMSButton from "@cms/CMSButton";
import { cmsStyles } from "@cms/styles";

export default function AdminChampionshipManage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { clubSlug, id } = useParams();
  const { club } = useClub();
  const [championship, setChampionship] = useState(null);
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data: champ } = await supabase.from("championships").select("*").eq("id", id).single();
      setChampionship(champ);
      if (!champ) {
        setLoading(false);
        return;
      }
      const rounds = await loadChampionshipRounds(champ.id);
      const clubId = club?.id || champ.club_id;
      const roster = await loadResultMatchContext(supabase, clubId);
      const { data: memberships = [] } = await supabase
        .from("household_memberships")
        .select(
          "id, status, membership_type, start_date, end_date, duration, period"
        )
        .eq("club_id", clubId);
      setTables(computeChampionshipStandings({
        championship: champ,
        rounds,
        drivers: roster.drivers,
        memberships,
        rosterIndex: roster.rosterIndex,
      }));
      setLoading(false);
    }
    if (id) load();
  }, [id, club?.id]);

  return (
    <div style={cmsStyles.pageContainer}>
      <div style={cmsStyles.pageContent}>
        <div style={cmsStyles.sectionHeaderWithActions}>
          <h1 style={cmsStyles.sectionHeaderTitle}>
            {championship?.name || t("admin.championships.title")}
          </h1>
          <CMSButton onClick={() => navigate(`/${clubSlug}/app/admin/championships`)}>
            {t("results.back")}
          </CMSButton>
        </div>

        {loading && <div>{t("loading.loading")}</div>}

        {tables.map((table) => (
          <CMSCard key={table.className} title={table.className}>
            <table style={{ width: "100%", fontSize: 14 }}>
              <thead>
                <tr style={{ textAlign: "left", color: "#6B7280" }}>
                  <th style={{ padding: "4px 12px 4px 0" }}>{t("results.pos")}</th>
                  <th style={{ padding: "4px 12px 4px 0" }}>{t("results.driver")}</th>
                  <th style={{ padding: "4px 0" }}>{t("results.points")}</th>
                </tr>
              </thead>
              <tbody>
                {table.standings.map((row) => (
                  <tr key={row.key}>
                    <td style={{ padding: "4px 12px 4px 0" }}>{row.rank}</td>
                    <td style={{ padding: "4px 12px 4px 0" }}>{row.driverName}</td>
                    <td style={{ padding: "4px 0" }}>{row.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CMSCard>
        ))}
      </div>
    </div>
  );
}
