export const PWA_INSTALL_SNOOZE_KEY = "pwa-install-snooze-until";
export const PWA_INSTALL_DISMISSED_KEY = "pwa-install-dismissed-permanent";
export const PWA_INSTALL_SNOOZE_MS = 14 * 24 * 60 * 60 * 1000;

export function isStandalone() {
  return (
    typeof window !== "undefined" &&
    (window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true)
  );
}

export function isIos() {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent || "";
  const iPhone = /iphone|ipod/i.test(ua);
  const iPad =
    /ipad/i.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  return iPhone || iPad;
}

export function isAndroid() {
  return /android/i.test(window.navigator.userAgent || "");
}

export function isInstallPromptDismissedPermanently() {
  try {
    return localStorage.getItem(PWA_INSTALL_DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

export function dismissInstallPromptPermanently() {
  try {
    localStorage.setItem(PWA_INSTALL_DISMISSED_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function isInstallSnoozed() {
  if (isInstallPromptDismissedPermanently()) return true;
  const until = Number(localStorage.getItem(PWA_INSTALL_SNOOZE_KEY) || 0);
  return Date.now() < until;
}

export function snoozeInstallPrompt(ms = PWA_INSTALL_SNOOZE_MS) {
  localStorage.setItem(PWA_INSTALL_SNOOZE_KEY, String(Date.now() + ms));
}

export function detectInstallPlatform() {
  if (isIos()) return "ios";
  if (isAndroid()) return "android";
  return "other";
}