import {
  clubStorageFolder,
} from "@/app/lib/storageLayout";

export { PLATFORM_STORAGE_ROOT, clubStorageFolder, platformStoragePath } from "@/app/lib/storageLayout";

export const CLUB_ASSETS_BUCKET = "club-assets";

const ALLOWED_IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "gif", "webp", "svg"]);

export function getExtensionFromFile(file, fallback = "jpg") {
  if (!file) return fallback;

  const fromName = file.name?.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (fromName && ALLOWED_IMAGE_EXTENSIONS.has(fromName)) {
    return fromName === "jpeg" ? "jpg" : fromName;
  }

  const type = file.type?.toLowerCase() || "";
  if (type.includes("svg")) return "svg";
  if (type.includes("png")) return "png";
  if (type.includes("gif")) return "gif";
  if (type.includes("webp")) return "webp";
  return fallback;
}

/** Storage path from a public URL or a path already stored in the DB. */
export function getClubAssetPathFromUrl(urlOrPath) {
  if (!urlOrPath || typeof urlOrPath !== "string") return null;
  if (!urlOrPath.includes("/") && !urlOrPath.startsWith("http")) {
    return urlOrPath.split("?")[0];
  }

  const marker = `/${CLUB_ASSETS_BUCKET}/`;
  const markerIndex = urlOrPath.indexOf(marker);
  if (markerIndex === -1) return null;

  return decodeURIComponent(
    urlOrPath.slice(markerIndex + marker.length).split("?")[0]
  );
}

export function getClubAssetPublicUrl(supabase, path) {
  if (!path) return null;
  const { data } = supabase.storage.from(CLUB_ASSETS_BUCKET).getPublicUrl(path);
  return data?.publicUrl ?? null;
}

/** Resolve a stored path or public URL to the current Supabase public URL (drops stale query params). */
export function normalizeClubAssetUrl(supabase, urlOrPath) {
  if (!urlOrPath || typeof urlOrPath !== "string") return null;
  const trimmed = urlOrPath.trim();
  if (!trimmed) return null;

  const objectPath = getClubAssetPathFromUrl(trimmed) || (!trimmed.startsWith("http") ? trimmed.split("?")[0] : null);
  if (objectPath) {
    return getClubAssetPublicUrl(supabase, objectPath) || trimmed.split("?")[0];
  }

  return trimmed.split("?")[0];
}

function legacyMemberBadgeFileName(clubSlug) {
  if (!clubSlug) return null;
  const base = String(clubSlug)
    .replace(/-rc$/i, "")
    .replace(/-club$/i, "");
  return `${base}-member-badge-01.png`;
}

/** Ordered public URLs to try when showing the membership page badge (DB value, then known storage layouts). */
export function memberBadgeImageCandidates(supabase, club) {
  const slug = club?.slug;
  if (!slug) return [];

  const seen = new Set();
  const candidates = [];

  const push = (value) => {
    const url = normalizeClubAssetUrl(supabase, value);
    if (!url || seen.has(url)) return;
    seen.add(url);
    candidates.push(url);
  };

  push(club?.member_badge_url);

  const root = clubStorageFolder(slug);
  for (const name of [
    "member-badge.png",
    "member-badge.jpg",
    "member-badge.webp",
    "member-badge-01.png",
  ]) {
    push(getClubAssetPublicUrl(supabase, `${root}/member-badges/${name}`));
  }

  const legacyName = legacyMemberBadgeFileName(slug);
  if (legacyName) {
    push(getClubAssetPublicUrl(supabase, clubMemberBadgePath(slug, legacyName)));
  }

  push(club?.logo_url);

  return candidates;
}

export async function removeClubAssetPath(supabase, urlOrPath) {
  const path = getClubAssetPathFromUrl(urlOrPath);
  if (!path) return { error: null };

  const { error } = await supabase.storage.from(CLUB_ASSETS_BUCKET).remove([path]);
  if (error) {
    console.warn("[clubAssetStorage] remove failed:", path, error);
  }
  return { error: null };
}

/**
 * Upload to club-assets. Uses stable objectPath; removes previous object when path differs.
 * Returns full public URL (with optional cache-bust query).
 */
export async function uploadClubAsset(
  supabase,
  { objectPath, file, previousUrlOrPath, cacheBust = true }
) {
  if (!objectPath || !file) {
    return { publicUrl: null, path: null, error: new Error("Missing path or file") };
  }

  const previousPath = getClubAssetPathFromUrl(previousUrlOrPath);
  const ext = getExtensionFromFile(file);
  const contentType =
    file.type && (file.type.startsWith("image/") || file.type === "image/svg+xml")
      ? file.type
      : ext === "svg"
        ? "image/svg+xml"
        : `image/${ext === "png" ? "png" : "jpeg"}`;

  const { error: uploadError } = await supabase.storage
    .from(CLUB_ASSETS_BUCKET)
    .upload(objectPath, file, {
      upsert: true,
      cacheControl: "3600",
      contentType,
    });

  if (uploadError) {
    return { publicUrl: null, path: null, error: uploadError };
  }

  if (previousPath && previousPath !== objectPath) {
    await supabase.storage.from(CLUB_ASSETS_BUCKET).remove([previousPath]);
  }

  const baseUrl = getClubAssetPublicUrl(supabase, objectPath);
  if (!baseUrl) {
    return {
      publicUrl: null,
      path: objectPath,
      error: new Error("Public URL missing after upload"),
    };
  }

  return {
    publicUrl: cacheBust ? `${baseUrl}?v=${Date.now()}` : baseUrl,
    path: objectPath,
    error: null,
  };
}

export function brandingLogoPath(clubOrSlug, fieldName, file) {
  const root = clubStorageFolder(clubOrSlug);
  const ext = getExtensionFromFile(file);
  if (fieldName === "admin_logo_url") {
    return `${root}/branding/admin-logo.${ext}`;
  }
  if (fieldName === "news_background_url") {
    return `${root}/branding/news-background.${ext}`;
  }
  return `${root}/branding/logo.${ext}`;
}

export function eventLogoPath(clubOrSlug, eventId, file) {
  const root = clubStorageFolder(clubOrSlug);
  const ext = getExtensionFromFile(file);
  return `${root}/event-logos/${eventId}.${ext}`;
}

export function merchandisePhotoPath(clubOrSlug, itemId, slot, file) {
  const root = clubStorageFolder(clubOrSlug);
  const ext = getExtensionFromFile(file);
  const safeSlot = String(slot || "main").replace(/[^a-zA-Z0-9_-]/g, "_");
  return `${root}/merchandise/${itemId}/${safeSlot}.${ext}`;
}

export function classAddonPhotoPath(clubOrSlug, itemId, slot, file) {
  const root = clubStorageFolder(clubOrSlug);
  const ext = getExtensionFromFile(file);
  const safeSlot = String(slot || "main").replace(/[^a-zA-Z0-9_-]/g, "_");
  return `${root}/class-addons/${itemId}/${safeSlot}.${ext}`;
}

export function clubMemberBadgePath(clubOrSlug, fileName = "member-badge-01.png") {
  const root = clubStorageFolder(clubOrSlug);
  const safeName = String(fileName).replace(/[^a-zA-Z0-9_.-]/g, "_");
  return `${root}/member-badges/${safeName}`;
}

/** Stable path for the club member badge shown on the membership page. */
export function membershipBadgePath(clubOrSlug, file) {
  const root = clubStorageFolder(clubOrSlug);
  const ext = getExtensionFromFile(file);
  return `${root}/member-badges/member-badge.${ext}`;
}

export function clubNewsImagePath(clubOrSlug, newsId, file) {
  const root = clubStorageFolder(clubOrSlug);
  const ext = getExtensionFromFile(file);
  return `${root}/news/${newsId}.${ext}`;
}

export function driverAvatarPath(clubOrSlug, driverId, file) {
  const root = clubStorageFolder(clubOrSlug);
  const ext = getExtensionFromFile(file);
  return `${root}/drivers/${driverId}.${ext}`;
}
