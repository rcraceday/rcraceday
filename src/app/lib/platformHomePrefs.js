const SKIP_CLUB_SELECTION_KEY = "rcraceday.skipClubSelection";
const SKIP_REDIRECT_PENDING_KEY = "rcraceday.skipClubRedirectPending";

export function markSkipRedirectPending() {
  try {
    sessionStorage.setItem(SKIP_REDIRECT_PENDING_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function consumeSkipRedirectPending() {
  try {
    const pending = sessionStorage.getItem(SKIP_REDIRECT_PENDING_KEY) === "1";
    sessionStorage.removeItem(SKIP_REDIRECT_PENDING_KEY);
    return pending;
  } catch {
    return false;
  }
}

export function peekSkipRedirectPending() {
  try {
    return sessionStorage.getItem(SKIP_REDIRECT_PENDING_KEY) === "1";
  } catch {
    return false;
  }
}

export function clearSkipRedirectPending() {
  try {
    sessionStorage.removeItem(SKIP_REDIRECT_PENDING_KEY);
  } catch {
    /* ignore */
  }
}

export function getSkipClubSelection() {
  try {
    return localStorage.getItem(SKIP_CLUB_SELECTION_KEY) === "1";
  } catch {
    return false;
  }
}

export function setSkipClubSelection(value) {
  try {
    if (value) {
      localStorage.setItem(SKIP_CLUB_SELECTION_KEY, "1");
    } else {
      localStorage.removeItem(SKIP_CLUB_SELECTION_KEY);
    }
  } catch {
    /* ignore */
  }
}

export function clearSkipClubSelection() {
  setSkipClubSelection(false);
}
