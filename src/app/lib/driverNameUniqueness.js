import { supabase } from "@/supabaseClient";
import { resolveDriverNamingRules } from "@/app/lib/driverClubSettings";

export async function findDuplicateDriverNameInClub({
  clubId,
  firstName,
  lastName,
  excludeDriverId = null,
  club,
}) {
  const naming = resolveDriverNamingRules(club);
  if (naming.unique_name_per_club === false) {
    return { duplicate: false, existing: null };
  }

  if (!clubId || !firstName?.trim() || !lastName?.trim()) {
    return { duplicate: false, existing: null };
  }

  let query = supabase
    .from("drivers")
    .select("id, first_name, last_name")
    .eq("club_id", clubId)
    .ilike("first_name", firstName.trim())
    .ilike("last_name", lastName.trim());

  if (excludeDriverId) {
    query = query.neq("id", excludeDriverId);
  }

  const { data, error } = await query.limit(1);

  if (error) {
    return { duplicate: false, existing: null, error };
  }

  const existing = data?.[0] || null;
  return { duplicate: Boolean(existing), existing, error: null };
}
