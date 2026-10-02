import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { TrophyIcon } from "@heroicons/react/24/solid";
import PageTitle from "@/components/ui/PageTitle";
import BackNavButton from "@/components/ui/BackNavButton";
import Card from "@/components/ui/Card";
import useTheme from "@/app/providers/useTheme";
import { useClub } from "@/app/providers/ClubProvider";
import { useDrivers } from "@/app/providers/DriverProvider";
import { useTranslation } from "@/app/i18n/I18nContext";
import { supabase } from "@/supabaseClient";
import { loadChampionshipRounds } from "@/app/lib/results/loadEventResults";
import { computeChampionshipStandings } from "@/app/lib/results/championshipStandings";
import { loadResultMatchContext } from "@/app/lib/results/resultMemberMatch";
import { isChampionshipSeasonComplete } from "@/app/lib/results/championshipSeason";
import ChampionshipPlaceTrophy from "./ChampionshipPlaceTrophy";

export default function ChampionshipStandings() {
  const { id } = useParams();
  const { club } = useClub();
  const { drivers } = useDrivers();
  const { palette } = useTheme();
  const { t } = useTranslation();
  const [championship, setChampionship] = useState(null);
  const [roundCount, setRoundCount] = useState(0);
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);

  const driverIds = new Set((drivers || []).map((driver) => driver.id));

  const seasonComplete = useMemo(
    () => isChampionshipSeasonComplete(championship, roundCount),
    [championship, roundCount]
  );

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
      setRoundCount(rounds.length);
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
        title={t("results.championshipPoints")}
        style={{ color: palette.primary }}
      />

      {championship && (
        <div className="flex flex-wrap items-center gap-4">
          <BackNavButton variant="secondary" className="shrink-0" />
          {championship.logo_url ? (
            <img
              src={championship.logo_url}
              alt=""
              className="h-16 w-16 object-contain shrink-0"
            />
          ) : null}
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-slate-900 m-0">{championship.name}</h2>
            <p className="text-sm text-slate-500 m-0">
              {t("results.seasonN", { season: championship.season })}
            </p>
          </div>
        </div>
      )}

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
                  <td className="py-1 pr-2">
                    <span className="inline-flex items-center gap-1.5">
                      {row.driverName}
                      {seasonComplete ? (
                        <ChampionshipPlaceTrophy rank={row.rank} />
                      ) : null}
                    </span>
                  </td>
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
