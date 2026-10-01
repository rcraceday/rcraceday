import { normalizeLocale } from "./translate";

const STORAGE_KEY = "rcraceday_locale";

const listeners = new Set();

function readInitialLocale() {
  if (typeof window === "undefined") return "en";
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) return normalizeLocale(stored);
  } catch {
    /* ignore */
  }
  try {
    const browser = navigator.language || navigator.userLanguage;
    if (browser) return normalizeLocale(browser);
  } catch {
    /* ignore */
  }
  return "en";
}

let currentLocale = readInitialLocale();

export function getAppLocale() {
  return currentLocale;
}

export function setAppLocale(code) {
  const next = normalizeLocale(code);
  if (next === currentLocale) {
    if (typeof document !== "undefined") {
      document.documentElement.lang = next;
    }
    return;
  }
  currentLocale = next;
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, next);
    }
  } catch {
    /* ignore */
  }
  if (typeof document !== "undefined") {
    document.documentElement.lang = next;
  }
  listeners.forEach((fn) => fn(next));
}

export function subscribeLocale(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
