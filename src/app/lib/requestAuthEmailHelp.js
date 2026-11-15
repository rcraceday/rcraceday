import { supabase } from "@/supabaseClient";
import { platformConfirmEmailRedirectUrl } from "@/app/lib/publicAuthRedirect";
import { resolveSupportEmailForClub, PLATFORM_SUPPORT_EMAIL } from "@/app/lib/platformSupportEmail";
import { invokeSupportEmail } from "@/app/lib/invokeSupportEmail";

export async function resendSignupConfirmation(email) {
  const clean = String(email || "").trim().toLowerCase();
  if (!clean) {
    return { error: { message: "missing_email" } };
  }
  return supabase.auth.resend({
    type: "signup",
    email: clean,
    options: {
      emailRedirectTo: platformConfirmEmailRedirectUrl(),
    },
  });
}

async function fetchClientIp() {
  try {
    const ipRes = await fetch("https://api.ipify.org?format=json");
    const ipJson = await ipRes.json();
    return ipJson.ip || "0.0.0.0";
  } catch {
    return "0.0.0.0";
  }
}

/**
 * Notifies platform or club support when signup confirmation mail did not arrive.
 */
export async function requestConfirmationEmailHelp({
  email,
  fullName,
  message,
  club = null,
  clubSlug = "",
  clubLogo = "",
} = {}) {
  const cleanEmail = String(email || "").trim().toLowerCase();
  const name = String(fullName || "").trim();
  if (!cleanEmail) return { error: { message: "missing_email" } };
  if (!name) return { error: { message: "missing_name" } };

  const supportEmail = resolveSupportEmailForClub(club) || PLATFORM_SUPPORT_EMAIL;
  const userNote = String(message || "").trim();
  const composedMessage = [
    "Issue: Signup confirmation email not received.",
    `Signup email: ${cleanEmail}`,
    userNote ? `Member note: ${userNote}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const ip = await fetchClientIp();

  return invokeSupportEmail({
    fullName: name,
    message: composedMessage,
    clubName: club?.name || "RCRaceday",
    clubLogo: clubLogo || "",
    supportEmail,
    ip,
    clubSlug: clubSlug || "",
  });
}