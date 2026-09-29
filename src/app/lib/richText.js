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

export function normalizeRichTextValue(value) {
  if (typeof value === "string") return value;
  if (value?.value) return String(value.value);
  if (value?.text) return String(value.text);
  if (value?.richText) return String(value.richText);
  return "";
}
