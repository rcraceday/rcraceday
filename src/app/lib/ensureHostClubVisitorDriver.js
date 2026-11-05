import { supabase } from "@/supabaseClient";

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

/**
 * Ensures a non-member visitor has at least one driver row at this club (required to nominate).
 * Idempotent: no-op when a driver already exists for this user at the club.
 */
export async function ensureHostClubVisitorDriver({ userId, clubId, membership }) {
  if (!userId || !clubId) return false;

  const { data: existing, error: lookupError } = await supabase
    .from("drivers")
    .select("id")
    .eq("club_id", clubId)
    .eq("created_by", userId)
    .limit(1);

  if (lookupError) {
    console.warn("[ensureHostClubVisitorDriver] lookup", lookupError);
    return false;
  }
  if (existing?.length) return true;

  const { first, last } = await resolveDriverNames({ userId, membership });

  const { error: insertError } = await supabase.from("drivers").insert({
    membership_id: null,
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
  firstName,
  lastName,
  isJunior = false,
}) {
  if (!userId || !clubId) return { ok: false, error: "missing_context" };

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

  const { error } = await supabase.from("drivers").insert({
    membership_id: null,
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

export { resolveDriverNames };
