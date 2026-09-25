export const emptyTiming = {
  gates_open_at: "",
  practice_at: "",
  drivers_brief_at: "",
  race_start_at: "",
  label: "",
};

export const emptyNominationsDefaults = {
  open_days_before: null,
  open_time: "",
  close_days_before: null,
  close_time: "",
  late_fee_activation_days_before: null,
  late_fee_activation_time: "",
  late_entries_close_days_before: null,
  late_entries_close_time: "",
};

export const emptyEventDefaults = {
  pricing: {
    mode: "per_entry",
    global: {
      free: false,
      member: null,
      non_member: null,
      junior: null,
      practice: { member: null, non_member: null, junior: null },
    },
    tiered: {
      member: { first_class: null, additional_class: null, practice: null },
      non_member: { first_class: null, additional_class: null, practice: null },
      junior: { first_class: null, additional_class: null, practice: null },
    },
    class_prices: {},
    charge_preferences: false,
    late_fee: null,
  },
  late_entries_enabled: false,
  class_limit: 3,
  class_limit_per_day: null,
  preference_enabled: true,
  preference_limit: null,
  requires_rcra_club: false,
  is_published: true,
  class_minimum_entries: null,
  class_minimum_livetime_when_unmet: false,
  timing: { ...emptyTiming },
  nominations: { ...emptyNominationsDefaults },
};

function isObject(value) {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function normalizeTime(value) {
  if (value == null) return "";
  const s = String(value).trim();
  return s;
}

export function normalizeTiming(raw) {
  const source = isObject(raw) ? raw : {};
  return {
    gates_open_at: normalizeTime(source.gates_open_at),
    practice_at: normalizeTime(source.practice_at),
    drivers_brief_at: normalizeTime(source.drivers_brief_at),
    race_start_at: normalizeTime(source.race_start_at),
    label: source.label == null ? "" : String(source.label),
  };
}

function normalizeDaysBefore(value) {
  if (value == null || value === "") return null;
  const num = Number(value);
  if (Number.isNaN(num)) return null;
  return Math.max(0, Math.floor(num));
}

export function normalizeNominationsDefaults(raw) {
  const source = isObject(raw) ? raw : {};
  return {
    open_days_before: normalizeDaysBefore(source.open_days_before),
    open_time: normalizeTime(source.open_time),
    close_days_before: normalizeDaysBefore(source.close_days_before),
    close_time: normalizeTime(source.close_time),
    late_fee_activation_days_before: normalizeDaysBefore(
      source.late_fee_activation_days_before
    ),
    late_fee_activation_time: normalizeTime(source.late_fee_activation_time),
    late_entries_close_days_before: normalizeDaysBefore(source.late_entries_close_days_before),
    late_entries_close_time: normalizeTime(source.late_entries_close_time),
  };
}

export function getEventAnchorDate(eventState) {
  if (!eventState) return "";

  if (eventState.is_multi_day) {
    const days = Array.isArray(eventState.days) ? eventState.days : [];
    const dates = days
      .map((d) => (typeof d === "string" ? d : d?.date || ""))
      .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(String(d).slice(0, 10)))
      .sort();
    return dates[0] || "";
  }

  const single = eventState.event_date || eventState.days?.[0]?.date || "";
  return single ? String(single).slice(0, 10) : "";
}

function datetimeLocalFromAnchor(anchorDate, daysBefore, timeValue) {
  if (!anchorDate || daysBefore == null || !timeValue) return "";

  const anchor = parseDateOnly(anchorDate);
  if (!anchor) return "";

  const time = normalizeTime(timeValue);
  const match = time.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return "";

  const result = new Date(anchor.getTime());
  result.setDate(result.getDate() - daysBefore);
  const pad = (n) => String(n).padStart(2, "0");

  return `${result.getFullYear()}-${pad(result.getMonth() + 1)}-${pad(result.getDate())}T${pad(Number(match[1]))}:${pad(Number(match[2]))}`;
}

export function nominationsDatetimeFromDefaults(anchorDate, nominationsRaw) {
  const nominations = normalizeNominationsDefaults(nominationsRaw);
  return {
    open:
      nominations.open_days_before != null
        ? datetimeLocalFromAnchor(
            anchorDate,
            nominations.open_days_before,
            nominations.open_time || "09:00"
          )
        : "",
    close:
      nominations.close_days_before != null
        ? datetimeLocalFromAnchor(
            anchorDate,
            nominations.close_days_before,
            nominations.close_time || "23:59"
          )
        : "",
    late_fee_activation:
      nominations.late_fee_activation_days_before != null
        ? datetimeLocalFromAnchor(
            anchorDate,
            nominations.late_fee_activation_days_before,
            nominations.late_fee_activation_time || "00:00"
          )
        : "",
    late_entries_close:
      nominations.late_entries_close_days_before != null
        ? datetimeLocalFromAnchor(
            anchorDate,
            nominations.late_entries_close_days_before,
            nominations.late_entries_close_time || "23:59"
          )
        : "",
  };
}

export function nominationsNeedAutofill(eventState, isNewEvent) {
  if (isNewEvent) return true;
  return !eventState.nominations_open && !eventState.nominations_close;
}

export function applyNominationsFromTypeDefaults(eventState, eventTypes, options = {}) {
  const { overwrite = false } = options;
  const typeRow = findEventType(eventTypes, eventState.event_type);
  if (!typeRow || !eventState.track) return eventState;

  const anchor = getEventAnchorDate(eventState);
  if (!anchor) return eventState;

  const defaults = getTrackDefaults(typeRow, eventState.track);
  const computed = nominationsDatetimeFromDefaults(anchor, defaults.nominations);

  const hasNomStored = !!(eventState.nominations_open || eventState.nominations_close);
  const hasLateStored = !!(eventState.late_fee_activation || eventState.late_entries_close);

  const next = { ...eventState, late_entries_enabled: defaults.late_entries_enabled };
  let changed = next.late_entries_enabled !== eventState.late_entries_enabled;

  if (overwrite || !hasNomStored) {
    if (computed.open) {
      next.nominations_open = computed.open;
      changed = true;
    }
    if (computed.close) {
      next.nominations_close = computed.close;
      changed = true;
    }
  }

  if (defaults.late_entries_enabled && (overwrite || !hasLateStored)) {
    if (computed.late_fee_activation) {
      next.late_fee_activation = computed.late_fee_activation;
      changed = true;
    }
    if (computed.late_entries_close) {
      next.late_entries_close = computed.late_entries_close;
      changed = true;
    }
  }

  if (!changed) return eventState;
  return next;
}

export function normalizeEventDefaults(raw) {
  const source = isObject(raw) ? raw : {};
  const pricing = isObject(source.pricing) ? source.pricing : {};
  const emptyPricing = emptyEventDefaults.pricing;

  return {
    pricing: {
      mode: pricing.mode || emptyPricing.mode,
      global: { ...emptyPricing.global, ...(isObject(pricing.global) ? pricing.global : {}) },
      tiered: {
        member: {
          ...emptyPricing.tiered.member,
          ...(isObject(pricing.tiered?.member) ? pricing.tiered.member : {}),
        },
        non_member: {
          ...emptyPricing.tiered.non_member,
          ...(isObject(pricing.tiered?.non_member) ? pricing.tiered.non_member : {}),
        },
        junior: {
          ...emptyPricing.tiered.junior,
          ...(isObject(pricing.tiered?.junior) ? pricing.tiered.junior : {}),
        },
      },
      class_prices: isObject(pricing.class_prices) ? pricing.class_prices : {},
      charge_preferences: !!pricing.charge_preferences,
      late_fee: pricing.late_fee ?? null,
    },
    late_entries_enabled: !!source.late_entries_enabled,
    class_limit:
      source.class_limit == null || source.class_limit === ""
        ? emptyEventDefaults.class_limit
        : Number(source.class_limit),
    class_limit_per_day:
      source.class_limit_per_day == null || source.class_limit_per_day === ""
        ? null
        : Number(source.class_limit_per_day),
    preference_enabled:
      typeof source.preference_enabled === "boolean"
        ? source.preference_enabled
        : emptyEventDefaults.preference_enabled,
    preference_limit:
      source.preference_limit == null || source.preference_limit === ""
        ? null
        : Number(source.preference_limit),
    requires_rcra_club: !!source.requires_rcra_club,
    is_published:
      typeof source.is_published === "boolean"
        ? source.is_published
        : emptyEventDefaults.is_published,
    class_minimum_entries:
      source.class_minimum_entries == null || source.class_minimum_entries === ""
        ? null
        : Math.max(0, Number(source.class_minimum_entries)),
    class_minimum_livetime_when_unmet: !!source.class_minimum_livetime_when_unmet,
    timing: normalizeTiming(source.timing),
    nominations: normalizeNominationsDefaults(source.nominations),
  };
}

export function findEventType(eventTypes, value) {
  const v = String(value ?? "");
  if (!v) return null;
  return (
    (eventTypes || []).find(
      (t) =>
        String(t.value) === v ||
        String(t.id) === v ||
        String(t.label) === v ||
        String(t.name) === v
    ) || null
  );
}

function parseJsonObject(value) {
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return {};
    }
  }
  return isObject(value) ? value : {};
}

export function getTrackDefaults(typeRow, trackId) {
  const raw = parseJsonObject(typeRow?.defaults);
  const byTrack = isObject(raw.by_track) ? raw.by_track : {};
  const trackKey = trackId != null ? String(trackId) : "";

  if (trackKey && isObject(byTrack[trackKey])) {
    return normalizeEventDefaults(byTrack[trackKey]);
  }

  const matchedKey = Object.keys(byTrack).find(
    (key) => key.toLowerCase() === trackKey.toLowerCase()
  );
  if (matchedKey && isObject(byTrack[matchedKey])) {
    return normalizeEventDefaults(byTrack[matchedKey]);
  }

  if (raw.pricing || raw.timing || raw.class_limit != null) {
    return normalizeEventDefaults(raw);
  }

  return normalizeEventDefaults({});
}

export function mergeTrackDefaults(existingTypeDefaults, trackId, form) {
  const prev = isObject(existingTypeDefaults) ? existingTypeDefaults : {};
  const prevByTrack = isObject(prev.by_track) ? prev.by_track : {};

  return {
    ...prev,
    by_track: {
      ...prevByTrack,
      [String(trackId)]: normalizeEventDefaults(form),
    },
  };
}

function parseDateOnly(value) {
  if (value == null || value === "") return null;
  const s = String(value).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Whole-day delta from one YYYY-MM-DD date to another. */
export function dayDiffBetweenDates(fromDate, toDate) {
  const from = parseDateOnly(fromDate);
  const to = parseDateOnly(toDate);
  if (!from || !to) return 0;
  return Math.round((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000));
}

/** Shift datetime-local or date-only nomination fields by dayDelta days (keeps time of day). */
export function shiftDatetimeLocalByDays(value, dayDelta) {
  if (value == null || value === "" || !dayDelta) return value ?? "";

  const raw = String(value).trim();
  const hasTime = raw.includes("T");
  const parsed = hasTime ? new Date(raw) : new Date(`${raw.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;

  parsed.setDate(parsed.getDate() + dayDelta);
  const pad = (n) => String(n).padStart(2, "0");

  if (!hasTime) {
    return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}`;
  }

  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}T${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`;
}

export function shiftEventNominationDates(eventState, dayDelta) {
  if (!dayDelta) return eventState;
  return {
    ...eventState,
    nominations_open: shiftDatetimeLocalByDays(eventState.nominations_open, dayDelta),
    nominations_close: shiftDatetimeLocalByDays(eventState.nominations_close, dayDelta),
    late_fee_activation: shiftDatetimeLocalByDays(eventState.late_fee_activation, dayDelta),
    late_entries_close: shiftDatetimeLocalByDays(eventState.late_entries_close, dayDelta),
  };
}

export function normalizeDayRecord(day) {
  if (typeof day === "string") {
    return {
      date: day,
      label: "",
      gates_open_at: "",
      practice_at: "",
      drivers_brief_at: "",
      race_start_at: "",
      is_practice: false,
    };
  }
  const d = day || {};
  return {
    date: d.date || "",
    label: d.label || "",
    gates_open_at: d.gates_open_at || "",
    practice_at: d.practice_at || "",
    drivers_brief_at: d.drivers_brief_at || "",
    race_start_at: d.race_start_at || "",
    is_practice: !!d.is_practice,
  };
}

export function applyTimingToDays(days, timing, eventDate, isMulti) {
  const t = normalizeTiming(timing);
  const existing = Array.isArray(days) ? days : [];

  const stamp = (d) => {
    const base = typeof d === "string" ? { date: d } : d || {};
    return {
      date: base.date || "",
      label: base.label || t.label || "",
      gates_open_at: t.gates_open_at || "",
      practice_at: t.practice_at || "",
      drivers_brief_at: t.drivers_brief_at || "",
      race_start_at: t.race_start_at || "",
      is_practice: !!base.is_practice,
    };
  };

  if (existing.length > 0) return existing.map(stamp);

  if (isMulti) return [];

  return [stamp({ date: eventDate || "", label: t.label || "" })];
}

export function applyEventTypeDefaults(eventState, typeRow, trackId) {
  const defaults = getTrackDefaults(typeRow, trackId ?? eventState.track);
  const typeValue = String(typeRow?.value || eventState.event_type || "").toLowerCase();
  const isTitleEvent = ["state_titles", "national_titles"].includes(typeValue);

  const withCore = {
    ...eventState,
    pricing: defaults.pricing,
    late_entries_enabled: defaults.late_entries_enabled,
    class_limit: defaults.class_limit,
    class_limit_per_day: eventState.is_multi_day
      ? defaults.class_limit_per_day
      : eventState.class_limit_per_day,
    preference_enabled: defaults.preference_enabled,
    preference_limit: defaults.preference_limit,
    requires_rcra_club: isTitleEvent ? true : defaults.requires_rcra_club,
    is_published: defaults.is_published,
    class_minimum_entries: defaults.class_minimum_entries,
    class_minimum_livetime_when_unmet: defaults.class_minimum_livetime_when_unmet,
    days: applyTimingToDays(
      eventState.days,
      defaults.timing,
      eventState.event_date,
      eventState.is_multi_day
    ),
  };

  const anchor = getEventAnchorDate(withCore);
  const computed = nominationsDatetimeFromDefaults(anchor, defaults.nominations);

  return {
    ...withCore,
    ...(computed.open ? { nominations_open: computed.open } : {}),
    ...(computed.close ? { nominations_close: computed.close } : {}),
    ...(defaults.late_entries_enabled && computed.late_fee_activation
      ? { late_fee_activation: computed.late_fee_activation }
      : {}),
    ...(defaults.late_entries_enabled && computed.late_entries_close
      ? { late_entries_close: computed.late_entries_close }
      : {}),
  };
}
