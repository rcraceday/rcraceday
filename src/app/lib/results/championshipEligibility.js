import { normalizeDriverName } from "./driverName.js";

/** Rounds between first championship race and membership start before driver is excluded entirely. */
export const CHAMPIONSHIP_LATE_JOIN_ROUND_GAP = 2;

function parseCalendarDate(value) {
  if (!value) return null;
  const text = String(value).trim();
  if (!text) return null;
  const iso = text.length === 10 ? `${text}T12:00:00` : text;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

function calendarDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function normalizeMembershipDuration(duration) {
  const key = String(duration || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_");
  if (!key || key === "full" || key === "full_year" || key === "12_months") return "full";
  if (key === "half" || key.includes("half") || key === "6_months" || key === "6months") {
    return "half";
  }
  return key;
}

export function inferHalfPeriodFromDate(date) {
  if (!date) return "H2";
  const month = date.getMonth() + 1;
  return month <= 6 ? "H1" : "H2";
}

export function resolveHalfPeriod(membership) {
  const raw = String(membership?.period || "").trim();
  if (raw === "H1" || /jan/i.test(raw)) return "H1";
  if (raw === "H2" || /jul/i.test(raw)) return "H2";
  return inferHalfPeriodFromDate(parseCalendarDate(membership?.start_date));
}

/**
 * Half-year memberships only count as "current" in their paid half (Jan–Jun or Jul–Dec).
 * Full-year uses start_date / end_date when set.
 */
export function isMembershipCurrentForEvent(membership, eventDateIso) {
  if (!membership) return false;
  const status = String(membership.status || "active").toLowerCase();
  if (status === "expired") return false;

  const eventDay = calendarDay(parseCalendarDate(eventDateIso) || new Date());
  const start = parseCalendarDate(membership.start_date);
  const end = parseCalendarDate(membership.end_date);
  if (start && eventDay < calendarDay(start)) return false;
  if (end && eventDay > calendarDay(end)) return false;

  const duration = normalizeMembershipDuration(membership.duration);
  if (duration !== "half") return true;

  const period = resolveHalfPeriod(membership);
  const month = eventDay.getMonth() + 1;
  if (period === "H1") return month >= 1 && month <= 6;
  return month >= 7 && month <= 12;
}

function driverStandingKey(row, driver) {
  if (row.driverId) return row.driverId;
  return `name:${normalizeDriverName(row.driverNameRaw)}`;
}

function membershipForResultRow(row, driver, membershipById, rosterIndex, resolveResultMatch) {
  if (driver?.membership_id) {
    return membershipById.get(driver.membership_id) || null;
  }
  const hit = resolveResultMatch(row.driverNameRaw, rosterIndex);
  if (hit?.membershipId) return membershipById.get(hit.membershipId) || null;
  return null;
}

/**
 * Drivers who first raced the championship then joined membership ≥2 rounds later
 * are excluded from all championship points.
 */
export function buildLateJoinExcludedKeys({
  rounds = [],
  drivers = [],
  memberships = [],
  rosterIndex = null,
  resolveResultMatch,
  gap = CHAMPIONSHIP_LATE_JOIN_ROUND_GAP,
}) {
  const membershipById = new Map((memberships || []).map((row) => [row.id, row]));
  const driverById = new Map((drivers || []).map((driver) => [driver.id, driver]));
  const firstRaceRound = new Map();
  const firstMemberRound = new Map();

  rounds.forEach((round, roundIndex) => {
    const eventDate = round.eventDate;
    (round.overall || []).forEach((row) => {
      const driver = row.driverId ? driverById.get(row.driverId) : null;
      const key = driverStandingKey(row, driver);
      if (!firstRaceRound.has(key)) firstRaceRound.set(key, roundIndex);

      const membership = membershipForResultRow(
        row,
        driver,
        membershipById,
        rosterIndex,
        resolveResultMatch
      );
      if (!membership?.start_date) return;
      if (!isMembershipCurrentForEvent(membership, eventDate)) return;
      if (!firstMemberRound.has(key)) firstMemberRound.set(key, roundIndex);
    });
  });

  const excluded = new Set();
  firstRaceRound.forEach((raceIdx, key) => {
    const memberIdx = firstMemberRound.get(key);
    if (memberIdx == null) return;
    if (memberIdx - raceIdx >= gap) excluded.add(key);
  });
  return excluded;
}

export function isRoundEligibleForChampionship({
  row,
  driver,
  round,
  membership,
  lateJoinExcludedKeys,
  resolveResultMatch,
  rosterIndex,
}) {
  const key = driverStandingKey(row, driver);
  if (lateJoinExcludedKeys?.has(key)) return false;
  if (!membership) return true;
  return isMembershipCurrentForEvent(membership, round.eventDate);
}
