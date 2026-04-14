import { supabase } from "@/supabaseClient";

/**
 * Unified membership action API
 *
 * @param {Object} params
 * @param {"join"|"renew"} params.action
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
      membership_id,
      membership_product_id,
    });

    return { data, error };
  } catch (err) {
    console.error("applyMembership error:", err);
    return { data: null, error: err };
  }
}
