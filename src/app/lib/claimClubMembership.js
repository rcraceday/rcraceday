import { supabase } from "@/supabaseClient";

export async function claimHouseholdMembership({ clubId, membershipEmail }) {
  const email = String(membershipEmail || "").trim().toLowerCase();
  if (!clubId || !email) {
    return { ok: false, membership: null, error: "missing" };
  }

  const { data, error } = await supabase.rpc("claim_household_membership", {
    p_club_id: clubId,
    p_membership_email: email,
  });

  if (error) {
    const message = String(error.message || "").toLowerCase();
    if (message.includes("membership_already_linked")) {
      return { ok: false, membership: null, error: "already_linked" };
    }
    if (message.includes("already_has_membership")) {
      return { ok: false, membership: null, error: "already_has_membership" };
    }
    if (message.includes("not_authenticated")) {
      return { ok: false, membership: null, error: "not_authenticated" };
    }
    if (
      error.code === "PGRST116" ||
      message.includes("not found") ||
      message.includes("0 rows")
    ) {
      return { ok: false, membership: null, error: "not_found" };
    }
    return { ok: false, membership: null, error: "failed" };
  }

  if (!data || !data.id) {
    return { ok: false, membership: null, error: "not_found" };
  }

  return { ok: true, membership: data, error: null };
}
