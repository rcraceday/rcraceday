/** Columns in LiveTime CSV (see `buildLiveTimeCsv` / public Driver Profile Export.csv). */
export const LIVETIME_CSV_HEADERS = [
  "FirstName",
  "LastName",
  "NickName",
  "PhoneticName",
  "ClassName",
  "IsPaid",
  "PermanentNumber",
  "PrimaryColor",
  "SecondaryColor",
  "Manufacturer",
  "ChassisManufacturer",
  "TransponderNumber",
  "SponsorName",
  "Gender",
  "Country",
  "ClubName",
  "LocalMembershipType",
  "LocalMembershipCode",
  "LocalMembershipExpirationDate",
];

/** `drivers` fields edited on Driver profile → LiveTime export (per club). */
export const LIVETIME_DRIVER_PROFILE_COPY_FIELDS = [
  "nickname",
  "primary_color",
  "secondary_color",
  "gender",
  "country",
  "sponsors",
  "transponder_number",
];

export function buildDriverClassTransponderMap(driverClassRows) {
  const map = new Map();
  (driverClassRows || []).forEach((row) => {
    if (!row?.driver_id || !row?.class_id) return;
    map.set(`${row.driver_id}:${row.class_id}`, row.transponder_number || "");
  });
  return map;
}

export function buildDriverClassChassisMap(driverClassRows) {
  const map = new Map();
  (driverClassRows || []).forEach((row) => {
    if (!row?.driver_id || !row?.class_id) return;
    map.set(`${row.driver_id}:${row.class_id}`, row.chassis_manufacturer || "");
  });
  return map;
}

export function chassisFromNominationSnapshot(nomination, classId) {
  if (!nomination?.merchandise || typeof nomination.merchandise !== "object") return "";
  const snap = nomination.merchandise.selection_snapshot;
  if (!snap || typeof snap !== "object") return "";
  const fromSnap = snap.chassisManufacturers?.[classId];
  return String(fromSnap ?? "").trim();
}

export function pickLiveTimeProfileFields(source) {
  if (!source || typeof source !== "object") return {};
  return LIVETIME_DRIVER_PROFILE_COPY_FIELDS.reduce((acc, key) => {
    if (source[key] !== undefined && source[key] !== null) {
      acc[key] = source[key];
    }
    return acc;
  }, {});
}