import { PLATFORM_SUPPORT_EMAIL } from "@/app/lib/platformSupportEmail";
import { rcracedayEmailLogoUrl } from "@/app/lib/publicAuthRedirect";
import { invokeSupportEmail } from "@/app/lib/invokeSupportEmail";

async function fetchClientIp() {
  try {
    const ipRes = await fetch("https://api.ipify.org?format=json");
    const ipJson = await ipRes.json();
    return ipJson.ip || "0.0.0.0";
  } catch {
    return "0.0.0.0";
  }
}

const TOPIC_LABELS = {
  account: "Account or login",
  membership: "Membership or club access",
  privacy: "Privacy or data request",
  club: "Club or partnership enquiry",
  other: "Other",
};

/**
 * Sends a platform contact form message to RCRaceday support (same pipeline as forgot-email help).
 */
export async function submitPlatformContact({ fullName, email, topic, message } = {}) {
  const name = String(fullName || "").trim();
  const cleanEmail = String(email || "").trim().toLowerCase();
  const topicKey = String(topic || "other").trim().toLowerCase();
  const body = String(message || "").trim();

  if (!name) return { error: { message: "missing_name" } };
  if (!cleanEmail) return { error: { message: "missing_email" } };
  if (!body) return { error: { message: "missing_message" } };

  const topicLabel = TOPIC_LABELS[topicKey] || TOPIC_LABELS.other;
  const composedMessage = [
    `Source: Platform contact form`,
    `Topic: ${topicLabel}`,
    `Reply-to: ${cleanEmail}`,
    "",
    body,
  ].join("\n");

  const ip = await fetchClientIp();

  return invokeSupportEmail({
    fullName: name,
    message: composedMessage,
    clubName: "RCRaceday",
    clubLogo: rcracedayEmailLogoUrl(),
    supportEmail: PLATFORM_SUPPORT_EMAIL,
    ip,
    clubSlug: "",
  });
}