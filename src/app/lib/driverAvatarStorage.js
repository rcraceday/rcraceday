import {
  CLUB_ASSETS_BUCKET,
  driverAvatarPath,
  getClubAssetPathFromUrl,
  removeClubAssetPath,
  uploadClubAsset,
} from "@/app/lib/clubAssetStorage";

/** @deprecated Legacy bucket; new uploads use club-assets/{slug}/drivers/ */
export const LEGACY_DRIVER_AVATARS_BUCKET = "driver-avatars";

export const DRIVER_AVATARS_BUCKET = CLUB_ASSETS_BUCKET;

export function getLegacyDriverAvatarPathFromUrl(url) {
  if (!url || typeof url !== "string") return null;
  if (url.startsWith("blob:")) return null;

  const marker = `/${LEGACY_DRIVER_AVATARS_BUCKET}/`;
  const markerIndex = url.indexOf(marker);
  if (markerIndex === -1) return null;

  return decodeURIComponent(
    url.slice(markerIndex + marker.length).split("?")[0]
  );
}

export function getDriverAvatarStoragePathFromUrl(url) {
  return getClubAssetPathFromUrl(url) || getLegacyDriverAvatarPathFromUrl(url);
}

export function getDriverAvatarObjectPath(driverId, file, clubOrSlug) {
  return driverAvatarPath(clubOrSlug, driverId, file);
}

export async function removeDriverAvatarFromStorage(supabase, avatarUrl) {
  const clubPath = getClubAssetPathFromUrl(avatarUrl);
  if (clubPath) {
    return removeClubAssetPath(supabase, avatarUrl);
  }

  const legacyPath = getLegacyDriverAvatarPathFromUrl(avatarUrl);
  if (!legacyPath) return { error: null };

  const { error } = await supabase.storage
    .from(LEGACY_DRIVER_AVATARS_BUCKET)
    .remove([legacyPath]);

  if (error) {
    console.warn("[driverAvatarStorage] legacy remove failed (non-blocking):", legacyPath, error);
  }

  return { error: null };
}

export async function uploadDriverAvatar(
  supabase,
  { driverId, file, previousAvatarUrl, clubOrSlug }
) {
  if (!driverId || !file) {
    return { publicUrl: null, error: new Error("Missing driver or file") };
  }

  const objectPath = getDriverAvatarObjectPath(driverId, file, clubOrSlug);

  const { publicUrl, error: uploadError } = await uploadClubAsset(supabase, {
    objectPath,
    file,
    previousUrlOrPath: previousAvatarUrl,
    cacheBust: true,
  });

  if (uploadError) {
    return { publicUrl: null, error: uploadError };
  }

  const { error: verifyError } = await supabase.storage
    .from(CLUB_ASSETS_BUCKET)
    .download(objectPath);

  if (verifyError) {
    console.error(
      "[driverAvatarStorage] upload reported success but object missing:",
      objectPath,
      verifyError
    );
    return {
      publicUrl: null,
      error: new Error(
        verifyError.message ||
          "Photo upload did not appear in storage. Check club-assets policies for driver photos."
      ),
    };
  }

  return { publicUrl, error: null };
}
