export function mapClubAdminGrantError(message) {
  const raw = String(message || "").toLowerCase();
  if (raw.includes("cannot_remove_self")) return "cannotRemoveSelf";
  if (raw.includes("last_settings_admin")) return "lastSettingsAdmin";
  if (raw.includes("cannot_modify_protected_admin")) return "cannotModifyProtected";
  if (raw.includes("cannot_grant_settings")) return "cannotGrantSettings";
  if (raw.includes("permission_denied")) return "permissionDenied";
  if (raw.includes("not_authenticated")) return "notAuthenticated";
  return null;
}