/** Top-level folders inside the club-assets bucket (rc-raceday + per-club slug trees). */
export const PLATFORM_STORAGE_ROOT = "rc-raceday";

export function sanitizeStorageFolderSegment(value) {
  if (!value) return "unknown-club";
  const cleaned = String(value)
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  return cleaned || "unknown-club";
}

/** Club root folder (slug), e.g. chargers */
export function clubStorageFolder(clubOrSlug) {
  if (typeof clubOrSlug === "string") {
    return sanitizeStorageFolderSegment(clubOrSlug);
  }
  return sanitizeStorageFolderSegment(clubOrSlug?.slug || clubOrSlug?.club_slug);
}

/** App-wide assets, e.g. rc-raceday/shared/... */
export function platformStoragePath(...segments) {
  const tail = segments.filter(Boolean).join("/");
  return tail ? `${PLATFORM_STORAGE_ROOT}/${tail}` : PLATFORM_STORAGE_ROOT;
}
