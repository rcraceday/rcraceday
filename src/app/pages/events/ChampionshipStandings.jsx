import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import ChampionshipRoundPointsTable from "./ChampionshipRoundPointsTable";
import { ChevronDownIcon, TrophyIcon } from "@heroicons/react/24/solid";
import PageTitle from "@/components/ui/PageTitle";
import BackNavButton from "@/components/ui/BackNavButton";
import Card from "@/components/ui/Card";
import FilterDropdown from "@/components/ui/FilterDropdown";
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
import ChampionshipClubChampion from "./ChampionshipClubChampion";
import ResultsTableSection, {
  ResultsDataTable,
  PositionCell,
} from "@/app/pages/events/results/ResultsTableSection";

export default function ChampionshipStandings() {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { club } = useClub();
  const { palette } = useTheme();
  const { t } = useTranslation();
  const { rowClass } = useHouseholdResultHighlight();
  const primaryColor = palette?.primary || "#2563eb";

  const [championship, setChampionship] = useState(null);
  const [rounds, setRounds] = useState([]);
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeClass, setActiveClass] = useState(searchParams.get("class") || "");
  const [mobileGapColumn, setMobileGapColumn] = useState("ahead");
  const showRoundPoints = searchParams.get("view") === "rounds";
  const roundCount = rounds.length;

  const seasonComplete = useMemo(
    () => isChampionshipSeasonComplete(championship, roundCount),
    [championship, roundCount]
  );

  const classTabOptions = useMemo(
    () => tables.map((table) => ({ value: table.className, label: table.className })),
    [tables]
  );

  const resolvedActiveClass = useMemo(() => {
    if (!tables.length) return "";
    if (activeClass && tables.some((row) => row.className === activeClass)) return activeClass;
    return tables[0].className;
  }, [tables, activeClass]);

  const activeTable = useMemo(() => {
    if (!tables.length) return null;
    return tables.find((row) => row.className === resolvedActiveClass) || tables[0];
  }, [tables, resolvedActiveClass]);

  const classStats = useMemo(() => {
    if (!activeTable?.standings?.length) {
      return { leaderName: null, leaderPoints: null, driverCount: 0 };
    }
    const leader = activeTable.standings[0];
    return {
      leaderName: leader.driverName,
      leaderPoints: leader.total,
      driverCount: activeTable.standings.length,
    };
  }, [activeTable]);

  function formatGapLeader(gapLeader) {
    return gapLeader === 0 ? t("results.championshipGapLeaderLead") : `−${gapLeader}`;
  }

  function formatGapAhead(gapAhead) {
    return gapAhead == null || gapAhead === 0
      ? t("results.championshipGapAheadFirst")
      : `−${gapAhead}`;
  }

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data: champ } = await supabase.from("championships").select("*").eq("id", id).single();
      setChampionship(champ);
      if (!champ) {
        setLoading(false);
        return;
      }
      const loadedRounds = await loadChampionshipRounds(champ.id);
      setRounds(loadedRounds);
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
          rounds: loadedRounds,
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
        actions={<BackNavButton />}
      />

      {loading && <p className="text-text-muted">{t("loading.loading")}</p>}

      {!loading && championship && activeTable ? (
        <Card className="p-0 overflow-hidden border-border shadow-sm text-text-base">
          <div
            className="px-4 py-3 border-b border-border"
            style={{ background: `linear-gradient(135deg, ${primaryColor}14 0%, transparent 55%)` }}
          >
            <div className="flex flex-wrap items-center gap-3 min-w-0">
              {championship.logo_url ? (
                <img
                  src={championship.logo_url}
                  alt=""
                  className="h-12 w-12 object-contain shrink-0 rounded-lg border border-border/40 bg-white/80 p-0.5"
                />
              ) : (
                <div
                  className="h-12 w-12 shrink-0 rounded-lg border border-border/40 flex items-center justify-center"
                  style={{ backgroundColor: `${primaryColor}12` }}
                >
                  <TrophyIcon className="h-6 w-6" style={{ color: primaryColor }} aria-hidden />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-bold text-text-base m-0 tracking-tight leading-snug">
                  {championship.name}
                </h2>
                <p className="text-sm text-text-muted m-0 mt-0.5">
                  {t("results.seasonN", { season: championship.season })}
                  {seasonComplete ? (
                    <span
                      className="ml-2 text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded text-white align-middle"
                      style={{ backgroundColor: primaryColor }}
                    >
                      {t("results.championshipSeasonFinal")}
                    </span>
                  ) : null}
                </p>
              </div>
            </div>
          </div>

          {classTabOptions.length > 1 ? (
            <div className="flex justify-center px-4 py-3">
              <div className="w-full max-w-sm">
                <FilterDropdown
                  value={resolvedActiveClass}
                  onChange={(value) => {
                    setActiveClass(value);
                    const next = new URLSearchParams(searchParams);
                    next.set("class", value);
                    setSearchParams(next, { replace: true });
                  }}
                  ariaLabel={t("results.filterClass")}
                  options={classTabOptions}
                  hideSelectedOption={false}
                  preserveOptionOrder
                  variant="premium"
                />
              </div>
            </div>
          ) : null}

          <div
            className="px-4 py-3 border-b border-border text-center"
            style={{ background: `linear-gradient(135deg, ${primaryColor}12 0%, transparent 70%)` }}
          >
            <h3 className="m-0 text-sm sm:text-base font-bold text-text-base tracking-tight uppercase">
              {activeTable.className}
            </h3>
            <p className="text-[11px] text-text-muted m-0 mt-1 leading-snug">
              {t("results.championshipClassMeta", {
                drivers: classStats.driverCount,
                rounds: roundCount,
              })}
            </p>
          </div>

          <div className="p-4 space-y-3">
            {seasonComplete && classStats.leaderName ? (
              <ChampionshipClubChampion
                season={championship.season}
                clubName={club?.name || championship.name}
                driverName={classStats.leaderName}
                className={activeTable.className}
                primaryColor={primaryColor}
                t={t}
              />
            ) : (
            <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-center text-xs sm:grid-cols-3 sm:text-sm">
              <div className="col-span-2 min-w-0 sm:col-span-1">
                <div className="text-[10px] uppercase tracking-wide text-text-muted">
                  {t("results.championshipStatLeader")}
                </div>
                <div className="font-semibold text-text-base leading-snug break-words">
                  {classStats.leaderName ?? "—"}
                </div>
              </div>
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-wide text-text-muted">
                  {t("results.championshipStatTopPoints")}
                </div>
                <div
                  className="font-semibold text-text-base tabular-nums"
                  style={{ color: primaryColor }}
                >
                  {classStats.leaderPoints ?? "—"}
                </div>
              </div>
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-wide text-text-muted">
                  {t("results.championshipStatDrivers")}
                </div>
                <div className="font-semibold text-text-base tabular-nums">
                  {classStats.driverCount}
                </div>
              </div>
            </div>
            )}

            {showRoundPoints ? (
              <ChampionshipRoundPointsTable
                standings={activeTable.standings}
                rounds={rounds}
                dropRounds={Number(championship?.drop_rounds) || 0}
                t={t}
                rowClass={rowClass}
                action={
                  <Link
                    to={`?class=${encodeURIComponent(resolvedActiveClass)}`}
                    className="m-0 text-[11px] font-semibold uppercase tracking-wider no-underline whitespace-nowrap"
                    style={{ color: primaryColor }}
                  >
                    {t("results.championshipBackToStandings")}
                  </Link>
                }
              />
            ) : (
            <ResultsTableSection
              title={t("results.championshipClassStandings")}
              action={
                <Link
                  to={`?view=rounds&class=${encodeURIComponent(resolvedActiveClass)}`}
                  className="m-0 text-[11px] font-semibold uppercase tracking-wider no-underline whitespace-nowrap"
                  style={{ color: primaryColor }}
                >
                  {t("results.championshipViewRoundPoints")}
                </Link>
              }
            >
              <ResultsDataTable className="text-xs sm:text-sm">
                <thead>
                  <tr>
                    <th className="my-results-th">{t("results.pos")}</th>
                    <th className="my-results-th">{t("results.driver")}</th>
                    <th className="my-results-th text-right">{t("results.points")}</th>
                    <th className="my-results-th text-right sm:hidden">
                      <label className="sr-only">{t("results.championshipMobileGapColumn")}</label>
                      <span className="relative inline-flex items-center justify-end gap-0.5 max-w-full">
                        <select
                          className="appearance-none bg-transparent border-0 p-0 m-0 max-w-[5.5rem] cursor-pointer text-[10px] font-semibold uppercase tracking-wide text-text-muted text-right leading-none pr-3.5"
                          value={mobileGapColumn}
                          onChange={(e) => setMobileGapColumn(e.target.value)}
                        >
                          <option value="ahead">{t("results.championshipColGapAhead")}</option>
                          <option value="leader">{t("results.championshipColGapLeader")}</option>
                          <option value="rounds">{t("results.championshipColRounds")}</option>
                        </select>
                        <ChevronDownIcon
                          className="pointer-events-none absolute right-0 top-1/2 h-3 w-3 -translate-y-1/2 text-text-muted"
                          aria-hidden
                        />
                      </span>
                    </th>
                    <th className="my-results-th text-right hidden sm:table-cell">
                      {t("results.championshipColGapLeader")}
                    </th>
                    <th className="my-results-th text-right hidden sm:table-cell">
                      {t("results.championshipColGapAhead")}
                    </th>
                    <th className="my-results-th text-right hidden sm:table-cell">
                      {t("results.championshipColRounds")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {activeTable.standings.map((row, index, rows) => {
                    const leaderTotal = rows[0]?.total ?? 0;
                    const prevTotal = index > 0 ? rows[index - 1].total : null;
                    const gapLeader = leaderTotal - row.total;
                    const gapAhead = prevTotal != null ? prevTotal - row.total : null;
                    const roundsPlayed = row.counted?.length ?? 0;
                    return (
                      <tr key={row.key} className={rowClass(row)}>
                        <PositionCell value={row.rank} />
                        <td className="py-2 pr-2 font-medium max-w-[9rem] sm:max-w-none">
                          <span className="inline-flex items-center gap-1.5 flex-wrap">
                          {row.driverName}
                          {seasonComplete ? <ChampionshipPlaceTrophy rank={row.rank} /> : null}
                          </span>
                        </td>
                        <td className="py-2 pl-2 tabular-nums font-semibold text-right whitespace-nowrap">
                          {row.total}
                        </td>
                        <td className="py-2 pl-1 tabular-nums text-right text-text-muted sm:hidden whitespace-nowrap">
                          {mobileGapColumn === "leader"
                            ? formatGapLeader(gapLeader)
                            : mobileGapColumn === "rounds"
                              ? roundsPlayed
                              : formatGapAhead(gapAhead)}
                        </td>
                        <td className="py-2 pl-2 tabular-nums text-right text-text-muted hidden sm:table-cell whitespace-nowrap">
                          {formatGapLeader(gapLeader)}
                        </td>
                        <td className="py-2 pl-2 tabular-nums text-right text-text-muted hidden sm:table-cell whitespace-nowrap">
                          {formatGapAhead(gapAhead)}
                        </td>
                        <td className="py-2 pl-2 tabular-nums text-right hidden sm:table-cell whitespace-nowrap">
                          {roundsPlayed}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </ResultsDataTable>
            </ResultsTableSection>
            )}
          </div>
        </Card>
      ) : null}

      {!loading && !championship && (
        <p className="text-text-muted text-center">{t("results.noChampionships")}</p>
      )}
    </div>
  );
}