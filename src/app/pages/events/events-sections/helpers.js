import { normalizeEventDefaults } from "@/app/pages/admin/events/eventDefaults";

export const TYPE_LABELS = {
  racing: "Racing",
  practice: "Practice",
  club_meet: "Club Meet",
  championship_round: "Championship Round",
  state_titles: "State Titles",
  national_titles: "National Titles",
};

function parseEventDate(value) {
  if (value == null || value === "") return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** True when drivers may nominate (standard window or late-entry window). */
export function isNominationsOpen(event, now = new Date()) {
  if (!event) return false;

  const open = parseEventDate(event.nominations_open);
  const close = parseEventDate(event.nominations_close);

  if (open && now < open) return false;

  const inRegularWindow =
    (!close || now <= close) && (!open || now >= open);

  if (inRegularWindow) return true;

  if (!close || now <= close) return false;

  if (!event.late_entries_enabled) return false;

  const lateEnd = parseEventDate(event.late_entries_close);
  if (lateEnd && now > lateEnd) return false;

  const lateStart = event.late_fee_activation
    ? parseEventDate(event.late_fee_activation)
    : new Date(close.getTime() + 1);

  if (!lateStart) return true;

  return now >= lateStart;
}

/** After regular close but still accepting late entries. */
export function isLateEntryWindow(event, now = new Date()) {
  if (!isNominationsOpen(event, now)) return false;
  const close = parseEventDate(event.nominations_close);
  return !!(close && now > close && event.late_entries_enabled);
}

// Extract unique years from events
export function extractYearsFromEvents(events) {
  const years = new Set();

  events.forEach((e) => {
    const eventDate = e instanceof Date ? e : e.event_date;
    if (eventDate) {
      const y = new Date(eventDate).getFullYear();
      years.add(y);
    }
  });

  return Array.from(years).sort((a, b) => b - a);
}

// Format date for display
export function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-AU", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function parsePricingJson(value) {
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
  return value != null && typeof value === "object" && !Array.isArray(value)
    ? value
    : null;
}

function coalescePrice(jsonValue, legacyValue) {
  const toNum = (v) => {
    if (v === null || v === undefined || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  const fromJson = toNum(jsonValue);
  const fromLegacy = toNum(legacyValue);
  if (fromJson != null && fromJson > 0) return fromJson;
  if (fromLegacy != null && fromLegacy > 0) return fromLegacy;
  if (fromJson != null) return fromJson;
  return fromLegacy;
}

/** Effective pricing JSON for display and checkout (legacy column fallback). */
export function resolveEventPricing(event) {
  if (!event) return null;

  const raw = parsePricingJson(event.pricing);
  const pricing = normalizeEventDefaults({ pricing: raw || {} }).pricing;

  if (pricing.mode === "per_entry") {
    const global = pricing.global || {};
    pricing.global = {
      ...global,
      member: coalescePrice(global.member, event.member_price),
      non_member: coalescePrice(global.non_member, event.non_member_price),
      junior: coalescePrice(global.junior, event.junior_price),
    };
  }

  return pricing;
}

export function formatEntryFeeAmount(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return `$${n.toFixed(2)}`;
}

export function perEntryFeeDisplayRows(pricing) {
  if (!pricing) return [];
  const global = pricing.global || {};

  if (global.free) {
    return [{ label: "Entry", value: "Free" }];
  }

  const rows = [];
  const addRow = (label, amount, { freeIfZero = false } = {}) => {
    const n = Number(amount);
    if (freeIfZero && (!Number.isFinite(n) || n <= 0)) {
      rows.push({ label, value: "Free" });
      return;
    }
    const value = formatEntryFeeAmount(amount);
    if (value && n > 0) rows.push({ label, value });
  };

  addRow("Member", global.member);
  addRow("Non‑Member", global.non_member);
  addRow("Junior", global.junior, { freeIfZero: true });

  const late = formatEntryFeeAmount(pricing.late_fee);
  if (late && Number(pricing.late_fee) > 0) {
    rows.push({ label: "Late Fee", value: late });
  }

  return rows;
}
