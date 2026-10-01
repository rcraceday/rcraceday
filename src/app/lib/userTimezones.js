const PRIORITY_ZONES = [
  "Australia/Sydney",
  "Australia/Melbourne",
  "Australia/Brisbane",
  "Australia/Adelaide",
  "Australia/Perth",
  "Australia/Hobart",
  "Australia/Darwin",
  "Pacific/Auckland",
];

export function listTimezones() {
  const supported =
    typeof Intl !== "undefined" && typeof Intl.supportedValuesOf === "function"
      ? Intl.supportedValuesOf("timeZone")
      : PRIORITY_ZONES;

  const rest = supported.filter((tz) => !PRIORITY_ZONES.includes(tz));
  return [...PRIORITY_ZONES.filter((tz) => supported.includes(tz)), ...rest];
}

export function detectTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "Australia/Sydney";
  } catch {
    return "Australia/Sydney";
  }
}

export function formatTimezoneLabel(tz) {
  if (!tz) return "";
  const city = tz.split("/").slice(1).join(" / ").replace(/_/g, " ") || tz;
  try {
    const offset = new Intl.DateTimeFormat("en-AU", {
      timeZone: tz,
      timeZoneName: "shortOffset",
    })
      .formatToParts(new Date())
      .find((part) => part.type === "timeZoneName")?.value;
    return offset ? `${city} (${offset})` : city;
  } catch {
    return city;
  }
}
