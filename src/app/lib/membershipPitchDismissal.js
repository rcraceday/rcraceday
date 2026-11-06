const STORAGE_PREFIX = "rcraceday:membership-pitch-dismissed:";

function storageKey(clubId, userId) {
  if (!clubId || !userId) return null;
  return `${STORAGE_PREFIX}${clubId}:${userId}`;
}

export function isMembershipPitchDismissed(clubId, userId) {
  const key = storageKey(clubId, userId);
  if (!key || typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

export function dismissMembershipPitch(clubId, userId) {
  const key = storageKey(clubId, userId);
  if (!key || typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, "1");
  } catch {
    /* ignore quota / private mode */
  }
}

export function isMembershipAppRoute(pathname) {
  return /\/app\/membership(\/|$)/.test(String(pathname || ""));
}
