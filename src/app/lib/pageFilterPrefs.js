const PREFIX = "rcraceday.pageFilters";

export function pageFilterPrefsKey(clubSlug, pageId) {
  const club = (clubSlug || "_platform").toLowerCase();
  return `${PREFIX}.${club}.${pageId}`;
}

export function readPageFilterPrefs(clubSlug, pageId) {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(pageFilterPrefsKey(clubSlug, pageId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export function writePageFilterPrefs(clubSlug, pageId, values) {
  if (typeof window === "undefined" || !pageId) return;
  try {
    localStorage.setItem(pageFilterPrefsKey(clubSlug, pageId), JSON.stringify(values));
  } catch {
    /* ignore quota */
  }
}

export function filterSummaryFromParts(parts) {
  return (parts || []).filter(Boolean).join(" · ");
}