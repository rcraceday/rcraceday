/** Match helpers aligned with src/app/lib/results/driverName.js */

export function stripTqSuffix(name) {
  return String(name || "")
    .replace(/\s*\[TQ\]\s*$/i, "")
    .trim();
}

export function normalizeDriverName(name) {
  return stripTqSuffix(name)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function normalizeParts(first, last) {
  return normalizeDriverName([first, last].filter(Boolean).join(" "));
}

export function splitLiveTimeName(raw) {
  const text = String(raw || "").replace(/\s+/g, " ").trim();
  if (!text) return null;
  const parts = text.split(" ");
  if (parts.length === 1) return { first_name: parts[0], last_name: "" };
  return { first_name: parts[0], last_name: parts.slice(1).join(" ") };
}

/**
 * Match a LiveTime driver to one registration person.
 * @param {{ first_name: string, last_name: string }} liveTime
 * @param {Array<{ email, first_name, last_name, is_junior, membership_type }>} registry
 */
export function matchLiveTimeToRegistration(liveTime, registry) {
  const needle = normalizeParts(liveTime.first_name, liveTime.last_name);
  if (!needle) return null;

  const exact = registry.filter(
    (p) => normalizeParts(p.first_name, p.last_name) === needle
  );
  if (exact.length === 1) return exact[0];
  if (exact.length > 1) {
    return exact[0];
  }

  const lastNorm = normalizeDriverName(liveTime.last_name);
  const firstNorm = normalizeDriverName(liveTime.first_name);
  const byLast = registry.filter((p) => normalizeDriverName(p.last_name) === lastNorm);
  if (byLast.length === 1) {
    const p = byLast[0];
    const regFirst = normalizeDriverName(p.first_name);
    if (regFirst.startsWith(firstNorm) || firstNorm.startsWith(regFirst)) return p;
  }

  const byFirst = registry.filter((p) => normalizeDriverName(p.first_name) === firstNorm);
  if (byFirst.length === 1 && !liveTime.last_name) return byFirst[0];

  return null;
}
