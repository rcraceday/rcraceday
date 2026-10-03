export const ADMIN_PERMISSION_KEYS = [
  "events",
  "nominations",
  "messages",
  "news",
  "membership",
  "drivers",
  "championships",
  "settings",
  "archives",
];

export const ADMIN_PERMISSION_PRESETS = {
  full: {
    id: "full",
    events: true,
    nominations: true,
    messages: true,
    news: true,
    membership: true,
    drivers: true,
    championships: true,
    settings: true,
    archives: true,
  },
  content: {
    id: "content",
    events: false,
    nominations: false,
    messages: true,
    news: true,
    membership: false,
    drivers: false,
    championships: false,
    settings: false,
    archives: false,
  },
  events: {
    id: "events",
    events: true,
    nominations: true,
    messages: false,
    news: false,
    membership: false,
    drivers: false,
    championships: true,
    settings: false,
    archives: false,
  },
};

export function emptyAdminPermissions() {
  return ADMIN_PERMISSION_KEYS.reduce((acc, key) => {
    acc[key] = false;
    return acc;
  }, {});
}

export function normalizeAdminPermissions(raw) {
  const base = emptyAdminPermissions();
  if (!raw || typeof raw !== "object") return base;
  ADMIN_PERMISSION_KEYS.forEach((key) => {
    if (raw[key] === true) base[key] = true;
  });
  return base;
}

export function isFullProfileAdmin(profile) {
  return (profile?.role || "").toLowerCase() === "admin";
}

export function permissionsFromPreset(presetId) {
  const preset = ADMIN_PERMISSION_PRESETS[presetId];
  if (!preset) return emptyAdminPermissions();
  return normalizeAdminPermissions(preset);
}

export function detectPresetId(permissions) {
  const normalized = normalizeAdminPermissions(permissions);
  for (const [id, preset] of Object.entries(ADMIN_PERMISSION_PRESETS)) {
    const match = ADMIN_PERMISSION_KEYS.every(
      (key) => normalized[key] === Boolean(preset[key])
    );
    if (match) return id;
  }
  return "custom";
}

export function hasAnyPermission(permissions) {
  const normalized = normalizeAdminPermissions(permissions);
  return ADMIN_PERMISSION_KEYS.some((key) => normalized[key]);
}

export function hasAdminPermission(profile, permissions, key) {
  if (isFullProfileAdmin(profile)) return true;
  const normalized = normalizeAdminPermissions(permissions);
  return normalized[key] === true;
}

export function hasAnyAdminAccess(profile, permissions) {
  if (isFullProfileAdmin(profile)) return true;
  return hasAnyPermission(permissions);
}

export function canManageAdminUsers(profile, permissions) {
  return hasAdminPermission(profile, permissions, "settings");
}

export function adminMenuPermissionForPath(pathSegment) {
  const map = {
    events: "events",
    nominations: "nominations",
    messages: "messages",
    news: "news",
    membership: "membership",
    drivers: "drivers",
    championships: "championships",
    settings: "settings",
    archives: "archives",
  };
  return map[pathSegment] || null;
}

export function filterAdminMenuItems(items, profile, permissions) {
  if (isFullProfileAdmin(profile)) return items;
  const normalized = normalizeAdminPermissions(permissions);
  return items.filter((item) => {
    const path = item.to || "";
    if (item.usePrimaryColor) return true;
    if (path.endsWith("/app/admin") && !path.includes("/app/admin/")) {
      return hasAnyPermission(normalized);
    }
    if (path.includes("/app/admin/settings")) return normalized.settings;
    if (path.includes("/app/admin/archives")) return normalized.archives;
    if (path.includes("/app/admin/nominations")) return normalized.nominations;
    if (path.includes("/app/admin/events")) return normalized.events;
    if (path.includes("/app/admin/messages")) return normalized.messages;
    if (path.includes("/app/admin/news")) return normalized.news;
    if (path.includes("/app/admin/membership")) return normalized.membership;
    if (path.includes("/app/admin/drivers")) return normalized.drivers;
    if (path.includes("/app/admin/championships")) return normalized.championships;
    return true;
  });
}

export async function fetchClubAdminGrant(supabase, clubId, userId) {
  if (!clubId || !userId) return null;
  const { data, error } = await supabase
    .from("club_admin_grants")
    .select("id, club_id, user_id, permissions")
    .eq("club_id", clubId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    if (/club_admin_grants|schema cache|does not exist/i.test(error.message || "")) {
      return null;
    }
    throw error;
  }
  return data;
}

export async function fetchClubAdminGrantsForClub(supabase, clubId) {
  if (!clubId) return [];
  const { data, error } = await supabase
    .from("club_admin_grants")
    .select("id, club_id, user_id, permissions, created_at, updated_at")
    .eq("club_id", clubId)
    .order("created_at", { ascending: true });
  if (error) {
    if (/club_admin_grants|schema cache|does not exist/i.test(error.message || "")) {
      return { rows: [], missingTable: true };
    }
    throw error;
  }
  return { rows: data || [], missingTable: false };
}
