/**
 * Club event datetimes: datetime-local inputs are wall-clock in the browser's
 * timezone; Supabase timestamptz is stored as UTC. Bare ISO strings from Postgres
 * (no offset) must be parsed as UTC, not local.
 */

export function parseStoredTimestamp(value) {
  if (value == null || value === "") return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  let s = String(value).trim();
  if (!s) return null;

  if (s.includes(" ") && !s.includes("T")) {
    s = s.replace(" ", "T");
  }

  const hasTimezone = /[zZ]$/.test(s) || /[+-]\d{2}:\d{2}$/.test(s) || /[+-]\d{4}$/.test(s);

  if (!hasTimezone) {
    const m = s.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})(:\d{2}(\.\d+)?)?$/);
    if (m) {
      s = `${m[1]}${m[2] || ":00"}Z`;
    }
  }

  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** datetime-local value (YYYY-MM-DDTHH:mm) → ISO string for timestamptz columns */
export function datetimeLocalToIso(value) {
  if (value == null || value === "") return null;
  const s = String(value).trim();
  if (s === "") return null;

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s)) {
    const [datePart, timePart] = s.split("T");
    const [y, m, day] = datePart.split("-").map(Number);
    const [hh, mm] = timePart.split(":").map(Number);
    const local = new Date(y, m - 1, day, hh, mm, 0, 0);
    if (Number.isNaN(local.getTime())) return null;
    return local.toISOString();
  }

  const parsed = parseStoredTimestamp(s);
  return parsed ? parsed.toISOString() : s;
}

/** timestamptz / ISO from API → datetime-local string */
export function isoToDatetimeLocal(value) {
  const d = parseStoredTimestamp(value);
  if (!d) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const NOMINATION_DATETIME_FIELDS = [
  "nominations_open",
  "nominations_close",
  "late_fee_activation",
  "late_entries_close",
  "nominations_reminder_at",
];

/** Read live datetime-local input values at save time (avoids stale React state). */
export function mergeNominationFieldsFromDom(snapshot) {
  const next = { ...snapshot };

  for (const field of NOMINATION_DATETIME_FIELDS) {
    const el = document.querySelector(`input[type="datetime-local"][name="${field}"]`);
    if (!el || el.value == null) continue;
    const v = String(el.value).trim();
    if (v === "") continue;
    next[field] = v;
    next.nominations_customized = true;
  }

  return next;
}
