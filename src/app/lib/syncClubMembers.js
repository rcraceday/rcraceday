/**
 * Ensure every driver on a household also has a club_members row.
 * Name-only club_members are linked to a matching driver when possible.
 */
export async function syncDriversIntoClubMembers(supabase, membershipId) {
  if (!membershipId) return { members: [], error: null };

  const [{ data: members, error: membersError }, { data: drivers, error: driversError }] =
    await Promise.all([
      supabase
        .from("club_members")
        .select("*")
        .eq("membership_id", membershipId)
        .order("last_name", { ascending: true })
        .order("first_name", { ascending: true }),
      supabase
        .from("drivers")
        .select("id, first_name, last_name, is_junior, membership_id")
        .eq("membership_id", membershipId)
        .order("last_name", { ascending: true })
        .order("first_name", { ascending: true }),
    ]);

  if (membersError || driversError) {
    return { members: members || [], error: membersError || driversError };
  }

  const current = members || [];
  const linkedDriverIds = new Set(current.map((row) => row.driver_id).filter(Boolean));

  for (const driver of drivers || []) {
    if (linkedDriverIds.has(driver.id)) continue;

    const nameKey = `${driver.first_name || ""}|${driver.last_name || ""}`.toLowerCase();
    const unmatched = current.find(
      (row) =>
        !row.driver_id &&
        `${row.first_name || ""}|${row.last_name || ""}`.toLowerCase() === nameKey
    );

    if (unmatched) {
      const { error } = await supabase
        .from("club_members")
        .update({
          driver_id: driver.id,
          is_junior: !!driver.is_junior,
        })
        .eq("id", unmatched.id);
      if (!error) {
        unmatched.driver_id = driver.id;
        unmatched.is_junior = !!driver.is_junior;
        linkedDriverIds.add(driver.id);
      }
      continue;
    }

    const insert = {
      membership_id: membershipId,
      driver_id: driver.id,
      first_name: driver.first_name || "",
      last_name: driver.last_name || "",
      is_junior: !!driver.is_junior,
      is_life_member: false,
    };

    const { data: created, error } = await supabase
      .from("club_members")
      .insert(insert)
      .select("*")
      .maybeSingle();

    if (!error && created) {
      current.push(created);
      linkedDriverIds.add(driver.id);
    }
  }

  current.sort((a, b) => {
    const last = String(a.last_name || "").localeCompare(String(b.last_name || ""));
    if (last !== 0) return last;
    return String(a.first_name || "").localeCompare(String(b.first_name || ""));
  });

  return { members: current, error: null };
}

export function householdHasLifeMember(members = []) {
  return (members || []).some((row) => row.is_life_member);
}

/** Unlink a driver from any club_members row, then optionally attach them to a household. */
export async function linkDriverHousehold(supabase, { driverId, previousMembershipId, nextMembershipId }) {
  if (!driverId) return { error: null };

  if (previousMembershipId && previousMembershipId !== nextMembershipId) {
    const { error } = await supabase
      .from("club_members")
      .update({ driver_id: null })
      .eq("driver_id", driverId)
      .eq("membership_id", previousMembershipId);
    if (error) return { error };
  }

  if (!nextMembershipId) {
    const { error } = await supabase
      .from("club_members")
      .update({ driver_id: null })
      .eq("driver_id", driverId);
    return { error };
  }

  return syncDriversIntoClubMembers(supabase, nextMembershipId);
}

export async function syncDriverNameToClubMember(supabase, driver) {
  if (!driver?.id) return { error: null };
  return supabase
    .from("club_members")
    .update({
      first_name: driver.first_name || "",
      last_name: driver.last_name || "",
      is_junior: !!driver.is_junior,
    })
    .eq("driver_id", driver.id);
}
