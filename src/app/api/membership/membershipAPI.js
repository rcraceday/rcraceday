import { supabase } from "@/supabaseClient";

/**
 * Unified membership action API
 *
 * @param {Object} params
 * @param {"join"|"renew"|"upgrade"} params.action
 * @param {string} params.club_slug
 * @param {string} [params.membership_id] - required for renew
 * @param {string} params.membership_product_id - row from memberships table
 */
export async function applyMembership({
  action,
  club_slug,
  membership_id,
  membership_product_id,
}) {
  try {
    const { data, error } = await supabase.rpc("apply_membership", {
      action,
      club_slug,
      membership_id: membership_id ?? null,
      membership_product_id,
    });

    if (error) {
      console.error("apply_membership RPC error:", error);
    }

    return { data, error };
  } catch (err) {
    console.error("applyMembership error:", err);
    return { data: null, error: err };
  }
}

/**
 * Upgrade household membership to family without payment (testing).
 * TODO: Replace with paid checkout + apply_membership(action: "upgrade") when payments are enabled.
 */
export async function upgradeToFamilyMembership({
  membership_id,
  club_id,
  user_id,
}) {
  if (!membership_id || !club_id || !user_id) {
    return {
      data: null,
      error: new Error("Missing membership, club, or user for upgrade."),
    };
  }

  try {
    const { data, error } = await supabase
      .from("household_memberships")
      .update({
        membership_type: "family",
        status: "active",
      })
      .eq("id", membership_id)
      .eq("user_id", user_id)
      .select("id")
      .maybeSingle();

    if (error) {
      console.error("upgradeToFamilyMembership update error:", error);
      return { data: null, error };
    }

    if (!data) {
      return {
        data: null,
        error: new Error("Could not update your membership. Check club access."),
      };
    }

    const { error: linkError } = await supabase
      .from("drivers")
      .update({ membership_id })
      .eq("club_id", club_id)
      .is("membership_id", null)
      .eq("created_by", user_id);

    if (linkError) {
      console.warn("upgradeToFamilyMembership link drivers error:", linkError);
    }

    return { data, error: null };
  } catch (err) {
    console.error("upgradeToFamilyMembership error:", err);
    return { data: null, error: err };
  }
}
