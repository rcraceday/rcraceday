import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { TrophyIcon } from "@heroicons/react/24/solid";
import PageTitle from "@/components/ui/PageTitle";
import BackNavButton from "@/components/ui/BackNavButton";
import Card from "@/components/ui/Card";
import useTheme from "@/app/providers/useTheme";
import { useClub } from "@/app/providers/ClubProvider";
import { useTranslation } from "@/app/i18n/I18nContext";
import { supabase } from "@/supabaseClient";
import { loadChampionshipRounds } from "@/app/lib/results/loadEventResults";
import { computeChampionshipStandings } from "@/app/lib/results/championshipStandings";
import { loadResultMatchContext } from "@/app/lib/results/resultMemberMatch";
import { isChampionshipSeasonComplete } from "@/app/lib/results/championshipSeason";
import { useHouseholdResultHighlight } from "@/app/hooks/useHouseholdResultHighlight";
import ChampionshipPlaceTrophy from "./ChampionshipPlaceTrophy";
import { ResultsDataTable, PositionCell } from "@/app/pages/events/results/ResultsTableSection";

export default function ChampionshipStandings() {
  const { id } = useParams();
  const { club } = useClub();
  const { palette } = useTheme();
  const { t } = useTranslation();
  const { isMyRow, rowClass } = useHouseholdResultHighlight();
  const primaryColor = palette?.primary || "#2563eb";

  const [championship, setChampionship] = useState(null);
  const [roundCount, setRoundCount] = useState(0);
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);

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
        <Card
          className="p-0 overflow-hidden shadow-sm text-text-base"
          style={{
            border: "1px solid var(--border, #e5e7eb)",
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
            borderRadius: "16px",
          }}
        >
          <div
            className="px-4 py-3 border-b border-border flex flex-wrap items-center gap-3"
            style={{ background: `linear-gradient(135deg, ${primaryColor}14 0%, transparent 55%)` }}
          >
            <BackNavButton variant="secondary" className="shrink-0" />
            {championship.logo_url ? (
              <img
                src={championship.logo_url}
                alt=""
                className="h-12 w-12 object-contain shrink-0"
              />
            ) : null}
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-text-base m-0 tracking-tight">
                {championship.name}
              </h2>
              <p className="text-sm text-text-muted m-0">
                {t("results.seasonN", { season: championship.season })}
              </p>
            </div>
          </div>
        </Card>
      )}

      {loading && <p className="text-text-muted">{t("loading.loading")}</p>}

      {tables.map((table) => (
        <Card
          key={table.className}
          className="p-0 overflow-hidden shadow-sm text-text-base"
          style={{
            border: "1px solid var(--border, #e5e7eb)",
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
            borderRadius: "16px",
          }}
        >
          <div
            className="px-4 py-2.5 border-b border-border"
            style={{ background: `linear-gradient(135deg, ${primaryColor}10 0%, transparent 60%)` }}
          >
            <span
              className="inline-block text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md text-white"
              style={{ backgroundColor: primaryColor }}
            >
              {table.className}
            </span>
          </div>
          <div className="p-3 overflow-x-auto">
            <ResultsDataTable>
              <thead>
                <tr>
                  <th className="my-results-th">{t("results.pos")}</th>
                  <th className="my-results-th">{t("results.driver")}</th>
                  <th className="my-results-th">{t("results.points")}</th>
                </tr>
              </thead>
              <tbody>
                {table.standings.map((row) => (
                  <tr key={row.key} className={rowClass(row)}>
                    <PositionCell value={row.rank} />
                    <td className="py-2 pr-2 font-medium">
                      <span className="inline-flex items-center gap-1.5 flex-wrap">
                        {row.driverName}
                        {isMyRow(row) ? (
                          <span
                            className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded text-white"
                            style={{ backgroundColor: primaryColor }}
                          >
                            {t("results.youBadge")}
                          </span>
                        ) : null}
                        {seasonComplete ? <ChampionshipPlaceTrophy rank={row.rank} /> : null}
                      </span>
                    </td>
                    <td className="py-2 tabular-nums font-semibold">{row.total}</td>
                  </tr>
                ))}
              </tbody>
            </ResultsDataTable>
          </div>
        </Card>
      ))}
    </div>
  );
}