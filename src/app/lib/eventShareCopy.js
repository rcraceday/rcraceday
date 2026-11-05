import { eventNominationUrl } from "@/app/lib/nominationLinks";

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function normalizeEventDisplayName(event) {
  if (!event) return "";
  if (typeof event.name === "string") return event.name.trim();
  return String(
    event.name?.value || event.name?.text || event.name?.richText || ""
  ).trim();
}

export function buildEventNominationShareContent({
  clubSlug,
  eventId,
  eventName,
  clubName,
  url: urlOverride,
}) {
  const url =
    urlOverride ||
    (clubSlug && eventId ? eventNominationUrl(clubSlug, eventId) : "");
  const name = String(eventName || "").trim() || "this event";
  const club = String(clubName || "").trim();
  const headline = club ? `Nominate for ${name} — ${club}` : `Nominate for ${name}`;
  const plain = `${headline}\n\n${url}\n\nEnter online with your RCRaceday login (visitors welcome).`;
  const html = `<p><strong>${escapeHtml(headline)}</strong></p><p><a href="${escapeHtml(
    url
  )}">${escapeHtml(url)}</a></p><p>Enter online with your RCRaceday login (visitors welcome).</p>`;

  return { url, headline, plain, html };
}

export async function copyTextToClipboard(text) {
  await navigator.clipboard.writeText(text);
}

export async function copyRichShareToClipboard({ plain, html }) {
  if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/plain": new Blob([plain], { type: "text/plain" }),
          "text/html": new Blob([html], { type: "text/html" }),
        }),
      ]);
      return;
    } catch {
      // fall through
    }
  }
  await copyTextToClipboard(plain);
}
