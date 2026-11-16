import { unassignDriverNumber } from "@/app/lib/driverNumberAdmin";
import { resolveDriverNumberRules } from "@/app/lib/driverClubSettings";

function parseEndDate(value) {
  if (!value) return null;
  const s = String(value).trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function addMonths(date, months) {
  const d = new Date(date.getTime());
  const n = Number(months);
  if (!Number.isFinite(n) || n < 0) return d;
  d.setMonth(d.getMonth() + n);
  return d;
}

export function lapsedNumberReleaseMonths(club) {
  const rules = resolveDriverNumberRules(club);
  const raw = rules.lapsed_release_months;
  const n = Number(raw);
  if (Number.isFinite(n) && n >= 0) return n;
  return 12;
}

export function shouldAutoReleaseLapsedNumbers(club) {
  const rules = resolveDriverNumberRules(club);
  return rules.auto_release_lapsed_numbers !== false;
}

/** True when membership has ended and the grace window after end_date has passed. */
export function membershipPastNumberGrace(membership, club, now = new Date()) {
  if (!membership || membership.is_life_member) return false;
  if (membership.membership_type === "non_member") return false;
  const end = parseEndDate(membership.end_date);
  if (!end) return false;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  if (today <= endDay) return false;
  const graceEnd = addMonths(endDay, lapsedNumberReleaseMonths(club));
  return today >= graceEnd;
}

/**
 * Unassign numbers for drivers whose household membership ended and grace period elapsed.
 * Idempotent; safe to call when loading choose-number or admin pool.
 */
export async function releaseLapsedNumbersForClub(supabaseClient, club) {
  if (!supabaseClient || !club?.id) return { released: 0, error: null };
  if (!shouldAutoReleaseLapsedNumbers(club)) {
    return { released: 0, error: null };
  }

  const { data: drivers, error: driversError } = await supabaseClient
    .from("drivers")
    .select("id, membership_id, permanent_number")
    .eq("club_id", club.id)
    .not("permanent_number", "is", null);

  if (driversError) {
    return { released: 0, error: driversError };
  }

  const withNumbers = (drivers || []).filter(
    (d) => d.permanent_number != null && d.permanent_number !== ""
  );
  if (withNumbers.length === 0) return { released: 0, error: null };

  const membershipIds = [
    ...new Set(withNumbers.map((d) => d.membership_id).filter(Boolean)),
  ];
  if (membershipIds.length === 0) return { released: 0, error: null };

  const { data: memberships, error: membershipError } = await supabaseClient
    .from("household_memberships")
    .select("id, end_date, membership_type, is_life_member, status")
    .in("id", membershipIds);

  if (membershipError) {
    return { released: 0, error: membershipError };
  }

  const membershipMap = new Map((memberships || []).map((m) => [m.id, m]));
  let released = 0;

  for (const driver of withNumbers) {
    const membership = membershipMap.get(driver.membership_id);
    if (!membershipPastNumberGrace(membership, club)) continue;
    const { error } = await unassignDriverNumber(club.id, driver.id);
    if (!error) released += 1;
  }

  return { released, error: null };
}