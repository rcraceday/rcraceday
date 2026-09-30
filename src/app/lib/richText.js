import DOMPurify from "dompurify";

const SANITIZE_OPTIONS = { ADD_ATTR: ["target", "rel"] };

/** Undo TipTap/linkify turning `/path` into `https:///path`. */
export function fixRichTextLinkHtml(html) {
  if (!html) return html;
  return html.replace(/href="https:\/\/\//gi, 'href="/');
}

/** Safe HTML for read-only rich text (names, descriptions). */
export function sanitizeRichTextHtml(html) {
  return fixRichTextLinkHtml(DOMPurify.sanitize(html || "", SANITIZE_OPTIONS));
}

/** Strip HTML to plain text for labels, alt text, and validation. */
export function richTextToPlainText(html) {
  if (html == null || html === "") return "";
  const str = String(html);
  return str
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>\s*<p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .trim();
}

export function isRichTextEmpty(html) {
  return !richTextToPlainText(html);
}

/** Fix bad editor URLs like `https:///club/app/...` → `/club/app/...` */
function defaultOrigin() {
  return typeof window !== "undefined" ? window.location.origin : "";
}

export function resolveRichTextLinkHref(href, origin = defaultOrigin()) {
  if (!href || typeof href !== "string") return null;
  const trimmed = href.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("https:///") || trimmed.startsWith("http:///")) {
    return trimmed.replace(/^https?:\/\//i, "");
  }
  if (trimmed.startsWith("/") || trimmed.startsWith("#")) return trimmed;
  if (/^(mailto:|tel:)/i.test(trimmed)) return trimmed;
  try {
    const url = new URL(trimmed, origin);
    if (url.origin === origin) {
      return `${url.pathname}${url.search}${url.hash}`;
    }
    return url.href;
  } catch {
    return trimmed;
  }
}

export function isExternalRichTextLink(href, origin = defaultOrigin()) {
  const resolved = resolveRichTextLinkHref(href, origin);
  if (!resolved) return false;
  if (resolved.startsWith("/") || resolved.startsWith("#")) return false;
  if (/^(mailto:|tel:)/i.test(resolved)) return true;
  try {
    return new URL(resolved).origin !== origin;
  } catch {
    return true;
  }
}

export function normalizeRichTextValue(value) {
  if (typeof value === "string") return value;
  if (value?.value) return String(value.value);
  if (value?.text) return String(value.text);
  if (value?.richText) return String(value.richText);
  return "";
}
