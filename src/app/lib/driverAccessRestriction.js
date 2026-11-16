export const DRIVER_ACCESS_RESTRICTIONS = {
  none: "none",
  eventBan: "event_ban",
  noEvents: "no_events",
  noApp: "no_app",
};

/** @deprecated stored value from early builds */
const LEGACY_EVENT_CAP = "event_cap";

export const DRIVER_ACCESS_SITE_SCOPES = {
  driver: "driver",
  household: "household",
};

export function normalizeAccessRestriction(mode) {
  if (mode === LEGACY_EVENT_CAP) return DRIVER_ACCESS_RESTRICTIONS.eventBan;
  return mode || DRIVER_ACCESS_RESTRICTIONS.none;
}

export function isDriverAccessRestrictionActive(driver) {
  if (!driver) return false;
  const mode = normalizeAccessRestriction(driver.access_restriction);
  if (mode === DRIVER_ACCESS_RESTRICTIONS.none) return false;
  const until = driver.access_restriction_until;
  if (!until) return true;
  const end = new Date(until);
  if (Number.isNaN(end.getTime())) return true;
  return end.getTime() > Date.now();
}

export function effectiveDriverAccessRestriction(driver) {
  if (!isDriverAccessRestrictionActive(driver)) {
    return DRIVER_ACCESS_RESTRICTIONS.none;
  }
  return normalizeAccessRestriction(driver.access_restriction);
}

export function isMembershipAppAccessSuspended(membership) {
  if (!membership?.app_access_suspended) return false;
  const until = membership.app_access_suspend_until;
  if (!until) return true;
  const end = new Date(until);
  if (Number.isNaN(end.getTime())) return true;
  return end.getTime() > Date.now();
}

export function driverBlocksMemberAppForDriverScope(driver) {
  if (!isDriverAccessRestrictionActive(driver)) return false;
  if (normalizeAccessRestriction(driver.access_restriction) !== DRIVER_ACCESS_RESTRICTIONS.noApp) {
    return false;
  }
  return (driver.access_site_scope || DRIVER_ACCESS_SITE_SCOPES.driver) === DRIVER_ACCESS_SITE_SCOPES.driver;
}

export function eventBanCount(driver) {
  return Number(driver?.event_entry_limit);
}

export function bannedEventIdsFromUpcoming(upcomingEventIds, banCount) {
  const n = Number(banCount);
  if (!Number.isFinite(n) || n < 1 || !Array.isArray(upcomingEventIds)) return [];
  return upcomingEventIds.slice(0, n);
}

export function isDriverBannedFromEvent(driver, eventId, upcomingEventIds, { hasNominationForEvent = false } = {}) {
  if (!driver || !eventId || !isDriverAccessRestrictionActive(driver)) return false;
  if (hasNominationForEvent) return false;

  const mode = normalizeAccessRestriction(driver.access_restriction);
  if (mode === DRIVER_ACCESS_RESTRICTIONS.noEvents || mode === DRIVER_ACCESS_RESTRICTIONS.noApp) {
    return true;
  }
  if (mode === DRIVER_ACCESS_RESTRICTIONS.eventBan) {
    const banCount = eventBanCount(driver);
    if (!Number.isFinite(banCount) || banCount < 1) return true;
    const banned = bannedEventIdsFromUpcoming(upcomingEventIds, banCount);
    return banned.includes(eventId);
  }
  return false;
}

export async function loadUpcomingClubEventIds(supabase, clubId) {
  if (!supabase || !clubId) return [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = today.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("events")
    .select("id, event_date")
    .eq("club_id", clubId)
    .gte("event_date", todayIso)
    .order("event_date", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    console.warn("[driverAccessRestriction] upcoming events", error.message);
    return [];
  }
  return (data || []).map((row) => row.id);
}

export async function loadDriverNominationEventIds(supabase, clubId, driverIds) {
  if (!supabase || !clubId || !driverIds?.length) return {};
  const { data, error } = await supabase
    .from("nominations")
    .select("driver_id, event_id")
    .eq("club_id", clubId)
    .in("driver_id", driverIds);
  if (error) {
    console.warn("[driverAccessRestriction] nominations", error.message);
    return {};
  }
  const byDriver = {};
  for (const row of data || []) {
    if (!row.driver_id || !row.event_id) continue;
    if (!byDriver[row.driver_id]) byDriver[row.driver_id] = new Set();
    byDriver[row.driver_id].add(row.event_id);
  }
  const out = {};
  for (const [driverId, set] of Object.entries(byDriver)) {
    out[driverId] = [...set];
  }
  return out;
}

export function driverAccessRestrictionBlockReason(driver, context, t) {
  const tr = t || ((key, opts) => key);
  if (!isDriverAccessRestrictionActive(driver)) return null;

  const mode = normalizeAccessRestriction(driver.access_restriction);
  const note = (driver.access_restriction_note || "").trim();
  const name = [driver?.first_name, driver?.last_name].filter(Boolean).join(" ");
  const displayName = name || tr("driverRules.thisDriver");

  if (mode === DRIVER_ACCESS_RESTRICTIONS.noEvents) {
    if (note) {
      return tr("driverRules.accessExcludedFromClubWithNote", { name: displayName, note });
    }
    return tr("driverRules.accessExcludedFromClub", { name: displayName });
  }

  if (mode === DRIVER_ACCESS_RESTRICTIONS.noApp) {
    if (note) {
      return tr("driverRules.accessNoEventsWithNote", { name: displayName, note });
    }
    return tr("driverRules.accessNoEvents", { name: displayName });
  }

  if (mode === DRIVER_ACCESS_RESTRICTIONS.eventBan) {
    const banCount = eventBanCount(driver);
    if (!Number.isFinite(banCount) || banCount < 1) {
      return tr("driverRules.accessEventBanMisconfigured", { name: displayName });
    }

    const eventId = context?.eventId;
    const upcomingEventIds = context?.upcomingEventIds;
    const nominatedEventIds = context?.nominatedEventIds || [];
    const hasNominationForEvent = eventId && nominatedEventIds.includes(eventId);

    if (eventId && Array.isArray(upcomingEventIds)) {
      if (
        !isDriverBannedFromEvent(driver, eventId, upcomingEventIds, {
          hasNominationForEvent,
        })
      ) {
        return null;
      }
      if (note) {
        return tr("driverRules.accessEventBanThisEventWithNote", {
          name: displayName,
          count: banCount,
          note,
        });
      }
      return tr("driverRules.accessEventBanThisEvent", {
        name: displayName,
        count: banCount,
      });
    }

    if (note) {
      return tr("driverRules.accessEventBanGeneralWithNote", {
        name: displayName,
        count: banCount,
        note,
      });
    }
    return tr("driverRules.accessEventBanGeneral", {
      name: displayName,
      count: banCount,
    });
  }

  return null;
}

export async function syncHouseholdAppAccessSuspend(supabase, { membershipId, clubId }) {
  if (!supabase || !membershipId || !clubId) return { error: null };

  const { data: drivers, error: loadError } = await supabase
    .from("drivers")
    .select(
      "access_restriction, access_site_scope, access_restriction_note, access_restriction_until"
    )
    .eq("membership_id", membershipId)
    .eq("club_id", clubId);

  if (loadError) {
    return { error: loadError };
  }

  const blocking = (drivers || []).find(
    (row) =>
      isDriverAccessRestrictionActive(row) &&
      normalizeAccessRestriction(row.access_restriction) === DRIVER_ACCESS_RESTRICTIONS.noApp &&
      (row.access_site_scope || DRIVER_ACCESS_SITE_SCOPES.driver) ===
        DRIVER_ACCESS_SITE_SCOPES.household
  );

  const payload = blocking
    ? {
        app_access_suspended: true,
        app_access_suspend_note: blocking.access_restriction_note || null,
        app_access_suspend_until: blocking.access_restriction_until || null,
      }
    : {
        app_access_suspended: false,
        app_access_suspend_note: null,
        app_access_suspend_until: null,
      };

  const { error: updateError } = await supabase
    .from("household_memberships")
    .update(payload)
    .eq("id", membershipId);

  return { error: updateError || null };
}

export function adminAccessRestrictionLabel(driver, t) {
  if (!isDriverAccessRestrictionActive(driver)) return null;
  const mode = normalizeAccessRestriction(driver.access_restriction);
  if (mode === DRIVER_ACCESS_RESTRICTIONS.eventBan) {
    return t("admin.drivers.accessBadgeEventBan", {
      count: driver.event_entry_limit ?? "—",
    });
  }
  if (mode === DRIVER_ACCESS_RESTRICTIONS.noEvents) {
    return t("admin.drivers.accessBadgeExcluded");
  }
  if (mode === DRIVER_ACCESS_RESTRICTIONS.noApp) {
    const scope =
      (driver.access_site_scope || DRIVER_ACCESS_SITE_SCOPES.driver) ===
      DRIVER_ACCESS_SITE_SCOPES.household
        ? t("admin.drivers.accessBadgeNoAppHousehold")
        : t("admin.drivers.accessBadgeNoAppDriver");
    return scope;
  }
  return null;
}