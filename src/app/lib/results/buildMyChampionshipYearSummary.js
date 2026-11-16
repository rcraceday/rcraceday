import { loadChampionshipRounds } from "@/app/lib/results/loadEventResults";
import { computeChampionshipStandings } from "@/app/lib/results/championshipStandings";
import { loadResultMatchContext } from "@/app/lib/results/resultMemberMatch";
import { normalizeDriverName } from "@/app/lib/results/driverName";

function isHouseholdStanding(row, driverIds, driverNameKeys) {
  if (row.driverId && driverIds.has(row.driverId)) return true;
  return driverNameKeys.has(normalizeDriverName(row.driverName));
}

/** Championship class rows for household drivers in a calendar season. */
export async function buildMyChampionshipYearSummary({
  supabase,
  clubId,
  year,
  championships,
  driverIds,
  driverNameKeys,
}) {
  const seasonChamps = (championships || []).filter(
    (row) => String(row.season) === String(year)
  );
  if (!seasonChamps.length || !clubId) return [];

  const roster = await loadResultMatchContext(supabase, clubId);
  const { data: memberships = [] } = await supabase
    .from("household_memberships")
    .select("id, status, membership_type, start_date, end_date, duration, period")
    .eq("club_id", clubId);

  const snapshots = [];

  for (const championship of seasonChamps) {
    const rounds = await loadChampionshipRounds(championship.id);
    const tables = computeChampionshipStandings({
      championship,
      rounds,
      drivers: roster.drivers,
      memberships,
      rosterIndex: roster.rosterIndex,
    });

    tables.forEach(({ className, standings }) => {
      standings.forEach((row, index) => {
        if (!isHouseholdStanding(row, driverIds, driverNameKeys)) return;
        const above = standings[index - 1];
        const below = standings[index + 1];
        const nearest =
          above && below
            ? above.total - row.total <= row.total - below.total
              ? above
              : below
            : above || below || null;
        snapshots.push({
          championshipId: championship.id,
          championshipName: championship.name,
          className,
          driverName: row.driverName,
          rank: row.rank,
          totalPoints: row.total,
          roundsCounted: row.counted?.length ?? 0,
          nearestRival: nearest
            ? { name: nearest.driverName, rank: nearest.rank, totalPoints: nearest.total }
            : null,
        });
      });
    });
  }

  return snapshots.sort((a, b) =>
    String(a.championshipName).localeCompare(String(b.championshipName))
  );
}