import {
  displayNameFromMembershipRow,
  displayNameFromProfile,
  formatPersonName,
} from "@/app/lib/membershipDisplayName";
import { normalizeDriverName } from "./driverName.js";

export function isMemberMembershipType(type) {
  const key = String(type || "")
    .toLowerCase()
    .trim()
    .replace(/-/g, "_");
  if (!key) return false;
  return key !== "non_member" && key !== "nonmember";
}

function rosterEntry({ normalized, displayName, driverId, membershipId, clubMemberId }) {
  if (!normalized) return null;
  return {
    normalized,
    displayName: displayName || normalized,
    driverId: driverId || null,
    membershipId: membershipId || null,
    clubMemberId: clubMemberId || null,
  };
}

function addRosterEntry(byNormalized, memberNameKeys, entry) {
  if (!entry) return;
  memberNameKeys.add(entry.normalized);
  const prev = byNormalized.get(entry.normalized);
  if (!prev || (!prev.driverId && entry.driverId)) {
    byNormalized.set(entry.normalized, entry);
  }
}

function registerNormalizedName(byNormalized, memberNameKeys, rawName, meta = {}) {
  const text = String(rawName || "").replace(/\s+/g, " ").trim();
  if (!text || text.includes("@")) return;
  const normalized = normalizeDriverName(text);
  addRosterEntry(
    byNormalized,
    memberNameKeys,
    rosterEntry({
      normalized,
      displayName: text,
      ...meta,
    })
  );
}

function registerFirstLast(byNormalized, memberNameKeys, firstName, lastName, meta = {}) {
  const first = String(firstName || "").trim();
  const last = String(lastName || "").trim();

  const combined = formatPersonName(first, last);
  registerNormalizedName(byNormalized, memberNameKeys, combined, meta);

  if (first && !last && first.includes(" ")) {
    const parts = first.split(/\s+/);
    registerFirstLast(byNormalized, memberNameKeys, parts[0], parts.slice(1).join(" "), meta);
  }
}

/** Build lookup from imported result names to roster (membership + club_members, not non_member). */
export function buildResultRosterIndex({
  households = [],
  clubMembers = [],
  drivers = [],
  profileByUserId = {},
}) {
  const byNormalized = new Map();
  const memberNameKeys = new Set();

  const eligibleHouseholdIds = new Set();
  (households || []).forEach((household) => {
    if (!isMemberMembershipType(household.membership_type)) return;
    const status = String(household.status || "active").toLowerCase();
    if (status === "expired") return;
    eligibleHouseholdIds.add(household.id);

    const display = displayNameFromMembershipRow(household, profileByUserId);
    registerNormalizedName(byNormalized, memberNameKeys, display, {
      membershipId: household.id,
    });

    registerFirstLast(
      byNormalized,
      memberNameKeys,
      household.primary_first_name,
      household.primary_last_name,
      { membershipId: household.id }
    );

    const profile = household.user_id ? profileByUserId[household.user_id] : null;
    if (profile) {
      registerNormalizedName(byNormalized, memberNameKeys, displayNameFromProfile(profile), {
        membershipId: household.id,
      });
      registerFirstLast(byNormalized, memberNameKeys, profile.first_name, profile.last_name, {
        membershipId: household.id,
      });
    }
  });

  (clubMembers || []).forEach((member) => {
    if (!eligibleHouseholdIds.has(member.membership_id)) return;
    registerFirstLast(byNormalized, memberNameKeys, member.first_name, member.last_name, {
      driverId: member.driver_id,
      membershipId: member.membership_id,
      clubMemberId: member.id,
    });
  });

  (drivers || []).forEach((driver) => {
    if (driver.membership_id && !eligibleHouseholdIds.has(driver.membership_id)) return;
    registerFirstLast(byNormalized, memberNameKeys, driver.first_name, driver.last_name, {
      driverId: driver.id,
      membershipId: driver.membership_id,
    });
  });

  return { byNormalized, memberNameKeys };
}

export function resolveResultMatch(rawName, rosterIndex) {
  const normalized = normalizeDriverName(rawName);
  if (!normalized) return { matched: false, driverId: null };
  const hit = rosterIndex?.byNormalized?.get(normalized);
  if (!hit) return { matched: false, driverId: null };
  return { matched: true, driverId: hit.driverId || null, membershipId: hit.membershipId || null };
}

export function matchDriverIdFromRoster(rawName, rosterIndex) {
  return resolveResultMatch(rawName, rosterIndex).driverId;
}

export function isRosterMemberName(rawName, rosterIndex) {
  return resolveResultMatch(rawName, rosterIndex).matched;
}

export function unmatchedResultNames(parsed, rosterIndex) {
  const names = new Set();
  const rows = [
    ...(parsed?.races || []).flatMap((race) => race.entries || []),
    ...(parsed?.overall || []),
  ];
  rows.forEach((row) => {
    if (!isRosterMemberName(row.driverNameRaw, rosterIndex)) {
      names.add(row.driverNameRaw);
    }
  });
  return [...names].sort((a, b) => a.localeCompare(b));
}

function chunkIds(ids, size = 100) {
  const out = [];
  for (let i = 0; i < ids.length; i += size) out.push(ids.slice(i, i + size));
  return out;
}

async function fetchInChunks(supabase, table, select, column, ids) {
  const rows = [];
  for (const group of chunkIds(ids)) {
    const { data, error } = await supabase.from(table).select(select).in(column, group);
    if (error) return { data: rows, error };
    rows.push(...(data || []));
  }
  return { data: rows, error: null };
}

export async function loadResultMatchContext(supabase, clubId) {
  const [{ data: households = [], error: householdError }, { data: drivers = [], error: driverError }] =
    await Promise.all([
      supabase
        .from("household_memberships")
        .select(
          "id, user_id, email, membership_type, status, primary_first_name, primary_last_name"
        )
        .eq("club_id", clubId),
      supabase
        .from("drivers")
        .select("id, first_name, last_name, membership_id")
        .eq("club_id", clubId),
    ]);

  const eligibleIds = (households || [])
    .filter((row) => isMemberMembershipType(row.membership_type))
    .filter((row) => String(row.status || "active").toLowerCase() !== "expired")
    .map((row) => row.id);

  const userIds = Array.from(new Set((households || []).map((row) => row.user_id).filter(Boolean)));
  let profileByUserId = {};
  let profileLoadError = null;
  if (userIds.length) {
    const { data: profiles, error: profileError } = await fetchInChunks(
      supabase,
      "profiles",
      "id, first_name, last_name, email",
      "id",
      userIds
    );
    if (profileError) {
      profileLoadError = profileError;
    } else {
      (profiles || []).forEach((profile) => {
        profileByUserId[profile.id] = profile;
      });
    }
  }

  let clubMembers = [];
  let clubMemberError = null;
  if (eligibleIds.length) {
    const response = await fetchInChunks(
      supabase,
      "club_members",
      "id, membership_id, first_name, last_name, driver_id",
      "membership_id",
      eligibleIds
    );
    clubMembers = response.data || [];
    clubMemberError = response.error;
  }

  const rosterIndex = buildResultRosterIndex({
    households,
    clubMembers,
    drivers,
    profileByUserId,
  });

  return {
    rosterIndex,
    drivers: drivers || [],
    households: households || [],
    clubMembers,
    loadError: householdError || driverError || clubMemberError || profileLoadError,
  };
}

export function rosterDisplayNames(rosterIndex) {
  return [...(rosterIndex?.byNormalized?.values() || [])]
    .map((entry) => entry.displayName)
    .sort((a, b) => a.localeCompare(b));
}
