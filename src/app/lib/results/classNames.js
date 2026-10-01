/** Clean LiveRC / DB class labels (strip leaked HTML, event titles). */

function decodeEntities(text) {
  return String(text || "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"');
}

function stripTags(text) {
  return decodeEntities(String(text || "").replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeResultClassName(name) {
  let text = stripTags(name);
  text = text.replace(/<\/?title\b/gi, " ").replace(/[<>]/g, " ").replace(/\s+/g, " ").trim();
  if (!text) return "";
  if (/googletag|function\s*\(|LiveRC\s*$/i.test(text)) return "";

  const parts = text.split("::").map((part) => part.trim()).filter(Boolean);
  const short = parts.length > 1 ? parts[parts.length - 1] : text;
  const cleaned = short.replace(/\s*LiveRC\s*$/i, "").trim();
  if (!cleaned || cleaned.length > 56) return "";
  if (/^(pos|driver|brand|country)$/i.test(cleaned)) return "";
  return cleaned;
}

export function isDisplayableClassName(name) {
  const normalized = normalizeResultClassName(name);
  return normalized.length >= 2 && normalized.length <= 56;
}
