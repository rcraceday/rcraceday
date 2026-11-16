import { useEffect, useRef } from "react";
import { readPageFilterPrefs, writePageFilterPrefs } from "@/app/lib/pageFilterPrefs";

/** Persist a plain object of filter fields whenever values change (per club + page). */
export function usePageFilterPrefs(clubSlug, pageId, values) {
  const seededRef = useRef(false);

  useEffect(() => {
    if (!pageId) return;
    if (!seededRef.current) {
      seededRef.current = true;
      return;
    }
    writePageFilterPrefs(clubSlug, pageId, values);
  }, [clubSlug, pageId, values]);
}

export { readPageFilterPrefs };