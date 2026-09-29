export const DRIVER_AVATARS_BUCKET = "driver-avatars";

const ALLOWED_EXTENSIONS = new Set(["jpg", "jpeg", "png", "gif", "webp"]);

export function getDriverAvatarStoragePathFromUrl(url) {
  if (!url || typeof url !== "string") return null;
  if (url.startsWith("blob:")) return null;

  const marker = `/${DRIVER_AVATARS_BUCKET}/`;
  const markerIndex = url.indexOf(marker);
  if (markerIndex === -1) return null;

  return decodeURIComponent(
    url.slice(markerIndex + marker.length).split("?")[0]
  );
}

export function getDriverAvatarExtension(file) {
  if (!file) return "jpg";

  const fromName = file.name?.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (fromName && ALLOWED_EXTENSIONS.has(fromName)) {
    return fromName === "jpeg" ? "jpg" : fromName;
  }

  const type = file.type?.toLowerCase() || "";
  if (type.includes("png")) return "png";
  if (type.includes("gif")) return "gif";
  if (type.includes("webp")) return "webp";
  return "jpg";
}

export function getDriverAvatarObjectPath(driverId, file) {
  const ext = getDriverAvatarExtension(file);
  return `${driverId}.${ext}`;
}

export async function removeDriverAvatarFromStorage(supabase, avatarUrl) {
  const path = getDriverAvatarStoragePathFromUrl(avatarUrl);
  if (!path) return { error: null };

  const { error } = await supabase.storage
    .from(DRIVER_AVATARS_BUCKET)
    .remove([path]);

  if (error) {
    console.warn("[driverAvatarStorage] remove failed (non-blocking):", path, error);
  }

  return { error: null };
}

export async function uploadDriverAvatar(supabase, { driverId, file, previousAvatarUrl }) {
  if (!driverId || !file) {
    return { publicUrl: null, error: new Error("Missing driver or file") };
  }

  const filePath = getDriverAvatarObjectPath(driverId, file);
  const previousPath = getDriverAvatarStoragePathFromUrl(previousAvatarUrl);

  const { error: uploadError } = await supabase.storage
    .from(DRIVER_AVATARS_BUCKET)
    .upload(filePath, file, { upsert: true, cacheControl: "3600" });

  if (uploadError) {
    return { publicUrl: null, error: uploadError };
  }

  if (previousPath && previousPath !== filePath) {
    await supabase.storage.from(DRIVER_AVATARS_BUCKET).remove([previousPath]);
  }

  const { data: publicUrlData } = supabase.storage
    .from(DRIVER_AVATARS_BUCKET)
    .getPublicUrl(filePath);

  const baseUrl = publicUrlData?.publicUrl;
  if (!baseUrl) {
    return { publicUrl: null, error: new Error("Public URL missing after upload") };
  }

  return {
    publicUrl: `${baseUrl}?v=${Date.now()}`,
    error: null,
  };
}
