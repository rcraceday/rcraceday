import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { TrophyIcon } from "@heroicons/react/24/solid";
import PageTitle from "@/components/ui/PageTitle";
import Card from "@/components/ui/Card";
import useTheme from "@/app/providers/useTheme";
import { useClub } from "@/app/providers/ClubProvider";
import { useDrivers } from "@/app/providers/DriverProvider";
import { useTranslation } from "@/app/i18n/I18nContext";
import { supabase } from "@/supabaseClient";
import { loadChampionshipRounds } from "@/app/lib/results/loadEventResults";
import { computeChampionshipStandings } from "@/app/lib/results/championshipStandings";
import { loadResultMatchContext } from "@/app/lib/results/resultMemberMatch";

export default function ChampionshipStandings() {
  const { clubSlug, id } = useParams();
  const { club } = useClub();
  const { drivers } = useDrivers();
  const { palette } = useTheme();
  const { t } = useTranslation();
  const [championship, setChampionship] = useState(null);
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);

  const driverIds = new Set((drivers || []).map((driver) => driver.id));

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
      setTables(
        computeChampionshipStandings({
          championship: champ,
          rounds,
          drivers: roster.drivers,
          memberships,
          rosterIndex: roster.rosterIndex,
        })
      );
      setLoading(false);
    }
    if (id) load();
  }, [id, club?.id]);

  return (
    <div className="space-y-4 pb-8">
      <PageTitle
        icon={TrophyIcon}
        title={championship?.name || t("results.championships")}
        style={{ color: palette.primary }}
      >
        {championship ? t("results.seasonN", { season: championship.season }) : ""}
      </PageTitle>

      <Link to={`/${clubSlug}/app/championships`} className="text-sm" style={{ color: palette.primary }}>
        {t("results.allChampionships")}
      </Link>

      {loading && <p className="text-text-muted">{t("loading.loading")}</p>}

      {tables.map((table) => (
        <Card key={table.className} className="p-4 overflow-x-auto">
          <div className="font-semibold mb-3">{table.className}</div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="py-1 pr-2">{t("results.pos")}</th>
                <th className="py-1 pr-2">{t("results.driver")}</th>
                <th className="py-1">{t("results.points")}</th>
              </tr>
            </thead>
            <tbody>
              {table.standings.map((row) => (
                <tr
                  key={row.key}
                  className={row.driverId && driverIds.has(row.driverId) ? "bg-slate-50 font-medium" : ""}
                >
                  <td className="py-1 pr-2">{row.rank}</td>
                  <td className="py-1 pr-2">{row.driverName}</td>
                  <td className="py-1">{row.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ))}
    </div>
  );
}
