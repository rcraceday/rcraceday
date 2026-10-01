import { driverFullName, normalizeDriverName } from "./driverName.js";
import {
  buildLateJoinExcludedKeys,
  isRoundEligibleForChampionship,
} from "./championshipEligibility.js";
import { isRosterMemberName, resolveResultMatch } from "./resultMemberMatch.js";
export const DEFAULT_CHAMPIONSHIP_POINTS = {
  1: 36,
  2: 29,
  3: 24,
  4: 20,
  5: 17,
  6: 15,
  7: 14,
  8: 13,
  9: 12,
  10: 11,
  11: 10,
  12: 9,
  13: 8,
  14: 7,
  15: 6,
  16: 5,
  17: 4,
  18: 3,
  19: 2,
  20: 1,
};

export function pointsForPosition(pointsTable, position) {
  const pos = Number(position);
  if (!Number.isFinite(pos) || pos < 1) return 0;
  const table =
    pointsTable && Object.keys(pointsTable).length
      ? pointsTable
      : DEFAULT_CHAMPIONSHIP_POINTS;
  const direct = table[pos] ?? table[String(pos)];
  if (direct != null && direct !== "") return Number(direct) || 0;
  const keys = Object.keys(table).map(Number).filter(Number.isFinite);
  if (!keys.length) return 0;
  const last = Math.max(...keys);
  if (pos > last) return Number(table[last] ?? table[String(last)]) || 1;
  return 0;
}

function isMemberDriver(driver, membershipById) {
  if (!driver?.membership_id) return false;
  const membership = membershipById.get(driver.membership_id);
  if (!membership) return !!driver.membership_id;
  if (membership.status && membership.status !== "active") return false;
  return membership.membership_type !== "non_member";
}

export function computeChampionshipStandings({
  championship,
  rounds,
  drivers,
  memberships = [],
  rosterIndex = null,
}) {  const membershipById = new Map((memberships || []).map((row) => [row.id, row]));
  const driverById = new Map((drivers || []).map((driver) => [driver.id, driver]));
  const classes = Array.isArray(championship?.classes) ? championship.classes : [];
  const dropRounds = Number(championship?.drop_rounds) || 0;
  const membersOnly = championship?.members_only !== false;
  const pointsTable = championship?.points_table || {};
  const lateJoinExcludedKeys = buildLateJoinExcludedKeys({
    rounds,
    drivers,
    memberships,
    rosterIndex,
    resolveResultMatch,
  });

  return classes.map((className) => {
    const byDriver = new Map();

    rounds.forEach((round) => {
      const rows = (round.overall || []).filter((row) => row.className === className);
      rows.forEach((row) => {
        const driver = row.driverId ? driverById.get(row.driverId) : null;
        const member =
          isMemberDriver(driver, membershipById) ||
          isRosterMemberName(row.driverNameRaw, rosterIndex);
        if (membersOnly && !member) return;

        let membership = driver?.membership_id
          ? membershipById.get(driver.membership_id)
          : null;
        if (!membership) {
          const hit = resolveResultMatch(row.driverNameRaw, rosterIndex);
          if (hit?.membershipId) membership = membershipById.get(hit.membershipId) || null;
        }
        if (
          !isRoundEligibleForChampionship({
            row,
            driver,
            round,
            membership,
            lateJoinExcludedKeys,
            resolveResultMatch,
            rosterIndex,
          })
        ) {
          return;
        }

        const key = row.driverId || `name:${normalizeDriverName(row.driverNameRaw)}`;
        if (!byDriver.has(key)) {
          byDriver.set(key, {
            key,
            driverId: row.driverId || null,
            driverName: driver ? driverFullName(driver) : row.driverNameRaw,
            isMember: member,
            rounds: [],
          });
        }
        byDriver.get(key).rounds.push({
          eventId: round.eventId,
          eventName: round.eventName,
          position: row.overallPosition || row.position,
          points: pointsForPosition(pointsTable, row.overallPosition || row.position),
        });
      });
    });

    const standings = [...byDriver.values()].map((row) => {
      const sorted = [...row.rounds].sort((a, b) => b.points - a.points);
      const counted = dropRounds > 0 && sorted.length > dropRounds
        ? sorted.slice(0, sorted.length - dropRounds)
        : sorted;
      const dropped = sorted.slice(counted.length);
      const total = counted.reduce((sum, item) => sum + item.points, 0);
      return { ...row, counted, dropped, total };
    }).sort((a, b) => {
      if (b.total !== a.total) return b.total - a.total;
      return a.driverName.localeCompare(b.driverName);
    }).map((row, index) => ({ ...row, rank: index + 1 }));

    return { className, standings };
  });
}
