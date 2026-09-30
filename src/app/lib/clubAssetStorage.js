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
