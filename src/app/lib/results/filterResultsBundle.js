import { isMemberMembershipType, isRosterMemberName } from "./resultMemberMatch.js";

function rowDisplayName(row) {
  return row.driverNameRaw ?? row.driver_name_raw ?? "";
}

function rowDriverId(row) {
  return row.driverId ?? row.driver_id ?? null;
}

export function isClubMemberResultRow(row, { driverById, membershipById, rosterIndex }) {
  const driverId = rowDriverId(row);
  const driver = driverId ? driverById.get(driverId) : null;
  if (driver?.membership_id) {
    const membership = membershipById.get(driver.membership_id);
    if (membership) {
      if (membership.status && membership.status !== "active") return false;
      return isMemberMembershipType(membership.membership_type);
    }
  }
  return isRosterMemberName(rowDisplayName(row), rosterIndex);
}

export function filterResultsBundleForClubMembers(bundle, context) {
  if (!bundle || !context?.rosterIndex) return bundle;
  const driverById = new Map((context.drivers || []).map((driver) => [driver.id, driver]));
  const membershipById = new Map(
    (context.memberships || context.households || []).map((row) => [row.id, row])
  );
  const opts = { driverById, membershipById, rosterIndex: context.rosterIndex };
  const keep = (row) => isClubMemberResultRow(row, opts);

  return {
    ...bundle,
    overall: (bundle.overall || []).filter(keep),
    races: (bundle.races || []).map((race) => ({
      ...race,
      entries: (race.entries || []).filter(keep),
    })),
  };
}