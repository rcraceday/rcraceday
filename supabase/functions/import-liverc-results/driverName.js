export function stripTqSuffix(name) {
  return String(name || "")
    .replace(/\s*\[TQ\]\s*$/i, "")
    .trim();
}

export function parseDriverName(raw) {
  const original = String(raw || "").replace(/\s+/g, " ").trim();
  const isTq = /\[TQ\]\s*$/i.test(original);
  const driverNameRaw = stripTqSuffix(original);
  return { driverNameRaw, isTq };
}

export function normalizeDriverName(name) {
  return stripTqSuffix(name)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function driverFullName(driver) {
  return [driver?.first_name, driver?.last_name].filter(Boolean).join(" ").trim();
}

export function matchDriverId(rawName, drivers) {
  const needle = normalizeDriverName(rawName);
  if (!needle) return null;
  const exact = drivers.find((driver) => normalizeDriverName(driverFullName(driver)) === needle);
  return exact?.id || null;
}

export function matchParsedNames(items, drivers) {
  return items.map((item) => ({
    ...item,
    driverId: matchDriverId(item.driverNameRaw, drivers),
  }));
}
