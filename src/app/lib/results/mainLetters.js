/** LiveRC / LiveTime main group letter (A–Z). */
export const MAIN_LETTER_RE = /([A-Z])/i;

export function normalizeMainLetter(value, fallback = "A") {
  const text = String(value || "").trim().toUpperCase();
  if (!text) return fallback;
  const match = text.match(/^([A-Z])/);
  return match ? match[1] : fallback;
}