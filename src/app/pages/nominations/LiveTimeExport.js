import {
  countEntriesByClass,
  shouldIncludeClassInLiveTime,
} from "@app/pages/nominations/classMinimumEntries";
import {
  buildDriverClassChassisMap,
  buildDriverClassTransponderMap,
  chassisFromNominationSnapshot,
  LIVETIME_CSV_HEADERS,
} from "@/app/lib/livetimeDriverProfileFields";
import { entryMatchesExportDay } from "@/app/lib/nominations/multiDayNominationDays";

export const LIVETIME_HEADERS = LIVETIME_CSV_HEADERS;
export { buildDriverClassChassisMap, buildDriverClassTransponderMap };

function csvValue(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function membershipRowIsPaying(membership) {
  const type = membership?.membership_type;
  return Boolean(type && type !== "non_member");
}

function isPracticeLiveTimeEntry(nomination, entry) {
  if (entry?.is_practice) return true;
  const merch = nomination?.merchandise;
  if (!merch || typeof merch !== "object") return false;
  const practiceIds = merch.practice_class_ids || merch.practiceClassIds;
  return Array.isArray(practiceIds) && practiceIds.includes(entry.class_id);
}

function transponderForClassEntry(driver, classId, driverClassTransponders) {
  if (!driver?.id || !classId) {
    return driver?.transponder_number || "";
  }
  const fromClass = driverClassTransponders?.get(`${driver.id}:${classId}`);
  const trimmed = String(fromClass ?? "").trim();
  if (trimmed) return trimmed;
  return driver.transponder_number || "";
}

function chassisForClassEntry(driver, classId, nomination, driverClassChassis) {
  const fromSnapshot = chassisFromNominationSnapshot(nomination, classId);
  if (fromSnapshot) return fromSnapshot;
  if (!driver?.id || !classId) return "";
  const fromClass = driverClassChassis?.get(`${driver.id}:${classId}`);
  return String(fromClass ?? "").trim();
}

export function buildLiveTimeRows({
  nominations,
  entries,
  drivers,
  classes,
  memberships,
  clubName,
  event = null,
  driverClassTransponders = null,
  driverClassChassis = null,
  exportDayIndex = "all",
}) {
  const driverMap = new Map(drivers.map((driver) => [driver.id, driver]));
  const classMap = new Map(classes.map((item) => [item.id, item.name || item.class_name || ""]));
  const membershipMap = new Map(memberships.map((item) => [item.id, item]));
  const racingEntries = (entries || []).filter((entry) => !entry.is_preference);
  const entryCountByClass = countEntriesByClass(racingEntries);
  const rows = [];

  nominations.forEach((nomination) => {
    const driver = driverMap.get(nomination.driver_id);
    if (!driver) return;
    const membership = membershipMap.get(driver.membership_id) || {};
    entries
      .filter(
        (entry) =>
          entry.nomination_id === nomination.id &&
          !entry.is_preference &&
          !isPracticeLiveTimeEntry(nomination, entry) &&
          entryMatchesExportDay(event, nomination, entry, exportDayIndex)
      )
      .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
      .forEach((entry) => {
        if (event && !shouldIncludeClassInLiveTime(event, entry.class_id, entryCountByClass)) {
          return;
        }
        rows.push({
          FirstName: driver.first_name,
          LastName: driver.last_name,
          NickName: driver.nickname || "",
          PhoneticName: "",
          ClassName: classMap.get(entry.class_id),
          IsPaid: nomination.paid === true ? "TRUE" : "FALSE",
          PermanentNumber: membershipRowIsPaying(membership)
            ? driver.permanent_number
            : "",
          PrimaryColor: driver.primary_color,
          SecondaryColor: driver.secondary_color,
          Manufacturer: "",
          ChassisManufacturer: chassisForClassEntry(
            driver,
            entry.class_id,
            nomination,
            driverClassChassis
          ),
          TransponderNumber: transponderForClassEntry(
            driver,
            entry.class_id,
            driverClassTransponders
          ),
          SponsorName: Array.isArray(driver.sponsors) ? driver.sponsors.join(", ") : driver.sponsors,
          Gender: driver.gender,
          Country: driver.country,
          ClubName: clubName,
          LocalMembershipType: membership.membership_type,
          LocalMembershipCode: membership.membership_code || membership.local_membership_code,
          LocalMembershipExpirationDate:
            membership.membership_expiration_date || membership.expiration_date,
        });
      });
  });

  return rows.sort((a, b) =>
    `${a.LastName || ""}${a.FirstName || ""}${a.ClassName || ""}`.localeCompare(
      `${b.LastName || ""}${b.FirstName || ""}${b.ClassName || ""}`
    )
  );
}

export function buildLiveTimeCsv(rows) {
  return [
    LIVETIME_HEADERS.join(","),
    ...rows.map((row) => LIVETIME_HEADERS.map((header) => csvValue(row[header])).join(",")),
  ].join("\r\n");
}
