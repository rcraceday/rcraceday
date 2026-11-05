import { supabase } from "@/supabaseClient";

function isNonMemberHousehold(membership) {
  return String(membership?.membership_type || "")
    .trim()
    .toLowerCase() === "non_member";
}

async function resolveDriverNames({ userId, membership }) {
  let first = String(membership?.primary_first_name || "").trim();
  let last = String(membership?.primary_last_name || "").trim();

  if (!first || !last) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("first_name, last_name, full_name")
      .eq("id", userId)
      .maybeSingle();

    if (profile) {
      if (!first) first = String(profile.first_name || "").trim();
      if (!last) last = String(profile.last_name || "").trim();
      if (!first && profile.full_name) {
        const parts = String(profile.full_name).trim().split(/\s+/);
        first = parts[0] || "";
        last = parts.length > 1 ? parts.slice(1).join(" ") : first;
      }
    }
  }

  if (!first || !last) {
    const { data: otherClubDrivers } = await supabase
      .from("drivers")
      .select("first_name, last_name, is_junior")
      .eq("created_by", userId)
      .order("created_at", { ascending: true })
      .limit(1);

    const donor = otherClubDrivers?.[0];
    if (donor) {
      if (!first) first = String(donor.first_name || "").trim();
      if (!last) last = String(donor.last_name || "").trim();
    }
  }

  if (!first) first = "Driver";
  if (!last) last = first;

  return { first, last };
}

/** Same visibility rules as DriverProvider for this membership at the host club. */
async function listHostClubDriversForMembership({ userId, clubId, membership }) {
  if (!userId || !clubId || !membership?.id) {
    return { drivers: [], error: null };
  }

  if (isNonMemberHousehold(membership)) {
    const { data, error } = await supabase
      .from("drivers")
      .select("id, membership_id, first_name, last_name, is_junior")
      .eq("club_id", clubId)
      .eq("created_by", userId)
      .order("created_at", { ascending: true });
    return { drivers: data || [], error };
  }

  const membershipId = membership.id;
  const [{ data: byMembership, error: membershipError }, { data: memberRows }] =
    await Promise.all([
      supabase
        .from("drivers")
        .select("id, membership_id, first_name, last_name, is_junior")
        .eq("membership_id", membershipId)
        .order("created_at", { ascending: true }),
      supabase
        .from("club_members")
        .select("driver_id")
        .eq("membership_id", membershipId)
        .not("driver_id", "is", null),
    ]);

  if (membershipError) {
    return { drivers: [], error: membershipError };
  }

  const merged = new Map();
  (byMembership || []).forEach((row) => merged.set(row.id, row));

  const missingIds = [
    ...new Set(
      (memberRows || [])
        .map((row) => row.driver_id)
        .filter((id) => id && !merged.has(id))
    ),
  ];

  if (missingIds.length) {
    const { data: linkedDrivers } = await supabase
      .from("drivers")
      .select("id, membership_id, first_name, last_name, is_junior")
      .in("id", missingIds);
    (linkedDrivers || []).forEach((row) => merged.set(row.id, row));
  }

  const { data: orphans, error: orphanError } = await supabase
    .from("drivers")
    .select("id, membership_id, first_name, last_name, is_junior")
    .eq("club_id", clubId)
    .is("membership_id", null)
    .eq("created_by", userId);

  if (orphanError) {
    return { drivers: Array.from(merged.values()), error: orphanError };
  }

  if (orphans?.length) {
    const orphanIds = orphans.map((row) => row.id);
    const { error: linkError } = await supabase
      .from("drivers")
      .update({ membership_id: membershipId })
      .in("id", orphanIds);

    if (!linkError) {
      orphans.forEach((row) =>
        merged.set(row.id, { ...row, membership_id: membershipId })
      );
    }
  }

  return {
    drivers: Array.from(merged.values()).sort((a, b) =>
      String(a.first_name || "").localeCompare(String(b.first_name || ""))
    ),
    error: null,
  };
}

async function normalizeNonMemberDriverRows({ userId, clubId, membership }) {
  if (!isNonMemberHousehold(membership)) return;

  const { data: staleRows } = await supabase
    .from("drivers")
    .select("id")
    .eq("club_id", clubId)
    .eq("created_by", userId)
    .not("membership_id", "is", null);

  if (!staleRows?.length) return;

  await supabase
    .from("drivers")
    .update({ membership_id: null })
    .in(
      "id",
      staleRows.map((row) => row.id)
    );
}

/**
 * Ensures the user has at least one driver row at this club (required to nominate).
 * Idempotent: no-op when a loadable driver already exists.
 */
export async function ensureHostClubVisitorDriver({ userId, clubId, membership }) {
  if (!userId || !clubId || !membership?.id) return false;

  await normalizeNonMemberDriverRows({ userId, clubId, membership });

  const { drivers: existing, error: lookupError } =
    await listHostClubDriversForMembership({ userId, clubId, membership });

  if (lookupError) {
    console.warn("[ensureHostClubVisitorDriver] lookup", lookupError);
    return false;
  }
  if (existing?.length) return true;

  const { first, last } = await resolveDriverNames({ userId, membership });
  const membershipIdOnInsert = isNonMemberHousehold(membership) ? null : membership.id;

  const { error: insertError } = await supabase.from("drivers").insert({
    membership_id: membershipIdOnInsert,
    club_id: clubId,
    first_name: first,
    last_name: last,
    is_junior: false,
    created_by: userId,
  });

  if (insertError) {
    console.warn("[ensureHostClubVisitorDriver] insert", insertError);
    return false;
  }

  return true;
}

export async function createHostClubVisitorDriver({
  userId,
  clubId,
  membership,
  firstName,
  lastName,
  isJunior = false,
}) {
  if (!userId || !clubId || !membership?.id) {
    return { ok: false, error: "missing_context" };
  }

  const trimmedFirst = String(firstName || "").trim();
  const trimmedLast = String(lastName || "").trim();
  if (!trimmedFirst || !trimmedLast) {
    return { ok: false, error: "name_required" };
  }

  const { data: existingDrivers } = await supabase
    .from("drivers")
    .select("id")
    .eq("first_name", trimmedFirst)
    .eq("last_name", trimmedLast)
    .eq("club_id", clubId);

  if (existingDrivers?.length > 0) {
    return { ok: false, error: "duplicate_name" };
  }

  const membershipIdOnInsert = isNonMemberHousehold(membership) ? null : membership.id;

  const { error } = await supabase.from("drivers").insert({
    membership_id: membershipIdOnInsert,
    club_id: clubId,
    first_name: trimmedFirst,
    last_name: trimmedLast,
    is_junior: !!isJunior,
    created_by: userId,
  });

  if (error) {
    console.warn("[createHostClubVisitorDriver]", error);
    return { ok: false, error: error.message };
  }

  return { ok: true, error: null };
}

export { resolveDriverNames, listHostClubDriversForMembership };
