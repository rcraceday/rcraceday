import { parseStoredTimestamp } from "@/app/lib/eventDatetime";

/** @returns {'draft'|'scheduled'|'live'|'expired'} */
export function getClubNewsDisplayStatus(news, now = new Date()) {
  if (!news?.is_published) return "draft";
  const from = parseStoredTimestamp(news.display_from);
  const until = parseStoredTimestamp(news.display_until);
  if (from && from > now) return "scheduled";
  if (until && until <= now) return "expired";
  return "live";
}

export function isClubNewsVisible(news, now = new Date()) {
  if (!news?.is_published) return false;
  const from = parseStoredTimestamp(news.display_from);
  const until = parseStoredTimestamp(news.display_until);
  if (from && from > now) return false;
  if (until && until <= now) return false;
  return true;
}

export function validateClubNewsDisplayDates(displayFromIso, displayUntilIso) {
  const from = parseStoredTimestamp(displayFromIso);
  const until = parseStoredTimestamp(displayUntilIso);
  if (from && until && until <= from) {
    return "Display end must be after display start.";
  }
  return null;
}

export function isClubNewsNotifyDue(news, now = new Date()) {
  if (!news?.notify_members || !news?.is_published) return false;
  if (news.notify_mode === "scheduled") {
    const at = parseStoredTimestamp(news.notify_at);
    return !!(at && at <= now);
  }
  return true;
}
