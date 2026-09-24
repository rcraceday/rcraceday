export const LIVETIME_HEADERS = ["FirstName", "LastName", "NickName", "PhoneticName", "ClassName", "IsPaid", "PermanentNumber", "PrimaryColor", "SecondaryColor", "Manufacturer", "ChassisManufacturer", "TransponderNumber", "SponsorName", "Gender", "Country", "ClubName", "LocalMembershipType", "LocalMembershipCode", "LocalMembershipExpirationDate"];

function csvValue(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function isPracticeLiveTimeEntry(nomination, entry) {
  if (entry?.is_practice) return true;
  const merch = nomination?.merchandise;
  if (!merch || typeof merch !== "object") return false;
  const practiceIds = merch.practice_class_ids || merch.practiceClassIds;
  return Array.isArray(practiceIds) && practiceIds.includes(entry.class_id);
}

export function buildLiveTimeRows({ nominations, entries, drivers, classes, memberships, clubName }) {
  const driverMap = new Map(drivers.map((driver) => [driver.id, driver]));
  const classMap = new Map(classes.map((item) => [item.id, item.name || item.class_name || ""]));
  const membershipMap = new Map(memberships.map((item) => [item.id, item]));
  const rows = [];

  nominations.forEach((nomination) => {
    const driver = driverMap.get(nomination.driver_id);
    if (!driver) return;
    const membership = membershipMap.get(driver.membership_id) || {};
    entries.filter((entry) => entry.nomination_id === nomination.id && !entry.is_preference && !isPracticeLiveTimeEntry(nomination, entry)).sort((a, b) => (a.order_index || 0) - (b.order_index || 0)).forEach((entry) => rows.push({
      FirstName: driver.first_name,
      LastName: driver.last_name,
      NickName: driver.nickname,
      PhoneticName: driver.phonetic_name,
      ClassName: classMap.get(entry.class_id),
      IsPaid: nomination.paid === true ? "TRUE" : "FALSE",
      PermanentNumber: driver.permanent_number,
      PrimaryColor: driver.primary_color,
      SecondaryColor: driver.secondary_color,
      Manufacturer: driver.manufacturer,
      ChassisManufacturer: "",
      TransponderNumber: driver.transponder_number || driver.transponders?.[0],
      SponsorName: Array.isArray(driver.sponsors) ? driver.sponsors.join(", ") : driver.sponsors,
      Gender: driver.gender,
      Country: driver.country,
      ClubName: clubName,
      LocalMembershipType: membership.membership_type,
      LocalMembershipCode: membership.membership_code || membership.local_membership_code,
      LocalMembershipExpirationDate: membership.membership_expiration_date || membership.expiration_date,
    }));
  });

  return rows.sort((a, b) => `${a.LastName || ""}${a.FirstName || ""}${a.ClassName || ""}`.localeCompare(`${b.LastName || ""}${b.FirstName || ""}${b.ClassName || ""}`));
}

export function buildLiveTimeCsv(rows) {
  return [LIVETIME_HEADERS.join(","), ...rows.map((row) => LIVETIME_HEADERS.map((header) => csvValue(row[header])).join(","))].join("\r\n");
}