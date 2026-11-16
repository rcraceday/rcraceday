export const DRIVER_ACCESS_RESTRICTIONS = {
  none: "none",
  eventCap: "event_cap",
  noEvents: "no_events",
  noApp: "no_app",
};

export const DRIVER_ACCESS_SITE_SCOPES = {
  driver: "driver",
  household: "household",
};

export function isDriverAccessRestrictionActive(driver) {
  if (!driver) return false;
  const mode = driver.access_restriction || DRIVER_ACCESS_RESTRICTIONS.none;
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
  return driver.access_restriction || DRIVER_ACCESS_RESTRICTIONS.none;
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
  if (driver.access_restriction !== DRIVER_ACCESS_RESTRICTIONS.noApp) return false;
  return (driver.access_site_scope || DRIVER_ACCESS_SITE_SCOPES.driver) === DRIVER_ACCESS_SITE_SCOPES.driver;
}

export function buildDriverNominationStats(rows) {
  const byDriver = {};
  for (const row of rows || []) {
    const driverId = row.driver_id;
    const eventId = row.event_id;
    if (!driverId || !eventId) continue;
    if (!byDriver[driverId]) {
      byDriver[driverId] = { eventIds: new Set(), count: 0 };
    }
    byDriver[driverId].eventIds.add(eventId);
    byDriver[driverId].count = byDriver[driverId].eventIds.size;
  }
  const normalized = {};
  for (const [driverId, { eventIds, count }] of Object.entries(byDriver)) {
    normalized[driverId] = {
      count,
      eventIds: [...eventIds],
    };
  }
  return normalized;
}

export async function loadDriverNominationStatsForClub(supabase, clubId, driverIds) {
  if (!supabase || !clubId || !driverIds?.length) {
    return {};
  }
  const { data, error } = await supabase
    .from("nominations")
    .select("driver_id, event_id")
    .eq("club_id", clubId)
    .in("driver_id", driverIds);
  if (error) {
    console.warn("[driverAccessRestriction] load nomination stats", error.message);
    return {};
  }
  return buildDriverNominationStats(data);
}

export function driverAccessRestrictionBlockReason(driver, context, t) {
  const tr = t || ((key, opts) => key);
  if (!isDriverAccessRestrictionActive(driver)) return null;

  const mode = driver.access_restriction;
  const note = (driver.access_restriction_note || "").trim();
  const name = [driver?.first_name, driver?.last_name].filter(Boolean).join(" ");
  const displayName = name || tr("driverRules.thisDriver");

  if (mode === DRIVER_ACCESS_RESTRICTIONS.noEvents || mode === DRIVER_ACCESS_RESTRICTIONS.noApp) {
    if (note) {
      return tr("driverRules.accessNoEventsWithNote", { name: displayName, note });
    }
    return tr("driverRules.accessNoEvents", { name: displayName });
  }

  if (mode === DRIVER_ACCESS_RESTRICTIONS.eventCap) {
    const limit = Number(driver.event_entry_limit);
    if (!Number.isFinite(limit) || limit < 1) {
      return tr("driverRules.accessEventCapMisconfigured", { name: displayName });
    }
    const eventId = context?.eventId;
    const stats = context?.nominationStats;
    const eventIds = stats?.eventIds || [];
    const count = stats?.count ?? 0;
    if (eventId && eventIds.includes(eventId)) {
      return null;
    }
    if (count >= limit) {
      const noteSuffix = note ? ` ${note}` : "";
      return tr("driverRules.accessEventCapReached", {
        name: displayName,
        limit,
        note: noteSuffix,
      });
    }
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
      row.access_restriction === DRIVER_ACCESS_RESTRICTIONS.noApp &&
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
  const mode = driver.access_restriction;
  if (mode === DRIVER_ACCESS_RESTRICTIONS.eventCap) {
    return t("admin.drivers.accessBadgeEventCap", {
      limit: driver.event_entry_limit ?? "—",
    });
  }
  if (mode === DRIVER_ACCESS_RESTRICTIONS.noEvents) {
    return t("admin.drivers.accessBadgeNoEvents");
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