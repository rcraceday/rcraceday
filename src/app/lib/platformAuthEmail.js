import { supabase } from "@/supabaseClient";

/** True if an auth user exists for this email; false if not. null if lookup unavailable. */
export async function platformAuthEmailRegistered(email) {
  const clean = String(email || "").trim().toLowerCase();
  if (!clean) return null;

  const { data, error } = await supabase.rpc("platform_auth_email_registered", {
    p_email: clean,
  });

  if (error) {
    console.warn("platform_auth_email_registered:", error.message);
    return null;
  }

  return data === true;
}
