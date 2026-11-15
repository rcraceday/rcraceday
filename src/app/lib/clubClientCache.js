import {
  getPrimaryClubSlugFromStorage,
  setPrimaryClubSlugInStorage,
} from "@/app/lib/primaryClub";
import {
  getFavoriteClubSlugsFromStorage,
  setFavoriteClubSlugsInStorage,
} from "@/app/lib/favoriteClubs";
import { clearMembershipPitchDismissed } from "@/app/lib/membershipPitchDismissal";

const NOMINATE_DRAFT_PREFIX = "rcraceday:nominate-draft:";

function clearNominateDraftsInSessionStorage() {
  if (typeof window === "undefined") return;
  try {
    const keys = [];
    for (let i = 0; i < window.sessionStorage.length; i += 1) {
      const key = window.sessionStorage.key(i);
      if (key && key.startsWith(NOMINATE_DRAFT_PREFIX)) {
        keys.push(key);
      }
    }
    keys.forEach((key) => window.sessionStorage.removeItem(key));
  } catch {
    /* ignore */
  }
}

/**
 * Drop club-specific keys on this device after server-side removal or lost membership.
 * Does not sign the user out; clears launch shortcuts and drafts that can resurrect stale UI.
 */
export function clearClubScopedClientState({ clubId, clubSlug, userId } = {}) {
  const slug = String(clubSlug || "").trim();

  if (slug) {
    if (getPrimaryClubSlugFromStorage() === slug) {
      setPrimaryClubSlugInStorage("");
    }
    const favorites = getFavoriteClubSlugsFromStorage().filter((s) => s !== slug);
    setFavoriteClubSlugsInStorage(favorites);
  }

  if (clubId && userId) {
    clearMembershipPitchDismissed(clubId, userId);
  }

  clearNominateDraftsInSessionStorage();
}