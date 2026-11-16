import { normalizeDriverName } from "@/app/lib/results/driverName";

export function buildHouseholdDriverNameKeys(drivers) {
  const keys = new Set();
  (drivers || []).forEach((driver) => {
    const parts = [driver.first_name, driver.last_name, driver.display_name, driver.name]
      .filter(Boolean)
      .join(" ");
    if (parts) keys.add(normalizeDriverName(parts));
  });
  return keys;
}

export function buildHouseholdResultNameKeys(drivers, { membership, profile } = {}) {
  const keys = buildHouseholdDriverNameKeys(drivers);
  const addName = (first, last) => {
    const parts = [first, last].filter(Boolean).join(" ");
    if (parts) keys.add(normalizeDriverName(parts));
  };
  addName(profile?.first_name, profile?.last_name);
  addName(membership?.primary_first_name, membership?.primary_last_name);
  return keys;
}

export function isHouseholdResultRow(row, driverIds, driverNameKeys) {
  if (row?.driverId && driverIds.has(row.driverId)) return true;
  const name = row?.driverNameRaw ?? row?.driverName;
  if (!name) return false;
  return driverNameKeys.has(normalizeDriverName(name));
}

export function isCompareDriver(row, compareDriver) {
  if (!compareDriver) return false;
  const name = row?.driverNameRaw ?? row?.driverName;
  if (!name) return false;
  return normalizeDriverName(compareDriver) === normalizeDriverName(name);
}

export function resultsTableRowClass({ isMe, isCompare }) {
  if (isMe) return "my-results-row-you font-semibold";
  if (isCompare) return "my-results-row-compare font-medium";
  return "";
}