import { getPublicSiteOrigin } from "@/app/lib/publicAuthRedirect";

function normalizeClubSlug(clubSlug) {
  return String(clubSlug || "").replace(/^\/+|\/+$/g, "");
}

export function eventNominationPath(clubSlug, eventId) {
  const slug = normalizeClubSlug(clubSlug);
  const id = String(eventId || "").trim();
  if (!slug || !id) return "";
  return `/${slug}/app/events/${id}/nominate`;
}

export function eventNominationUrl(clubSlug, eventId) {
  const path = eventNominationPath(clubSlug, eventId);
  if (!path) return "";
  return `${getPublicSiteOrigin()}${path}`;
}
