export function getPublicSiteOrigin() {
  const configuredOrigin = import.meta.env.VITE_SITE_URL?.trim();
  return (configuredOrigin || window.location.origin).replace(/\/$/, "");
}

/** Where new-account confirmation links should land (platform home). */
export function platformConfirmEmailRedirectUrl() {
  return `${getPublicSiteOrigin()}/`;
}

/** Public URL for logo in Supabase email HTML (file must exist in /public). */
export const RCRACEDAY_EMAIL_LOGO_PATH = "/rcraceday_logo.png";

export function rcracedayEmailLogoUrl(origin) {
  const base = (origin || getPublicSiteOrigin()).replace(/\/$/, "");
  return `${base}${RCRACEDAY_EMAIL_LOGO_PATH}`;
}

function normalizeClubSlug(clubSlug) {
  return String(clubSlug || "").replace(/^\/+|\/+$/g, "");
}

/**
 * Canonical redirect URL for Supabase auth emails (confirm, recovery).
 * Must match an entry in Supabase Dashboard → Auth → URL configuration → Redirect URLs.
 */
export function publicAuthRedirectUrl(clubSlug, publicPage) {
  const origin = getPublicSiteOrigin();
  const slug = normalizeClubSlug(clubSlug);
  const page = String(publicPage || "")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");

  return `${origin}/${slug}/public/${page}`;
}

export function passwordResetRedirectUrl(clubSlug) {
  const slug = normalizeClubSlug(clubSlug);
  if (!slug) {
    return `${getPublicSiteOrigin()}/recover-password`;
  }
  return publicAuthRedirectUrl(slug, "reset-password");
}

/** Supabase auth redirects sometimes return ?error= / #error= instead of tokens. */
export function getAuthCallbackErrorFromLocation(loc = window.location) {
  const searchParams = new URLSearchParams(loc.search || "");
  const hashParams = new URLSearchParams(
    (loc.hash || "").replace(/^#/, "?")
  );
  const error = searchParams.get("error") || hashParams.get("error");
  const errorCode = searchParams.get("error_code") || hashParams.get("error_code");
  const rawDesc =
    searchParams.get("error_description") || hashParams.get("error_description");
  if (!error && !errorCode && !rawDesc) return null;
  return {
    error: error || "access_denied",
    errorCode: errorCode || "",
    description: rawDesc ? rawDesc.replace(/\+/g, " ") : "",
  };
}

export function clearAuthCallbackErrorsFromUrl() {
  const url = new URL(window.location.href);
  ["error", "error_code", "error_description"].forEach((key) => {
    url.searchParams.delete(key);
  });
  const hashParams = new URLSearchParams(url.hash.replace(/^#/, "?"));
  ["error", "error_code", "error_description", "sb"].forEach((key) => {
    hashParams.delete(key);
  });
  const hashRest = hashParams.toString();
  url.hash = hashRest ? `#${hashRest}` : "";
  window.history.replaceState(
    {},
    document.title,
    `${url.pathname}${url.search}${url.hash}`
  );
}

function welcomeDriversPathname(clubSlug) {
  return `/${normalizeClubSlug(clubSlug)}/app/profile/drivers/welcome`;
}

/**
 * Unwrap nested returnTo values and keep only a club /app path.
 * Welcome is not a useful returnTo (it caused login ↔ welcome loops).
 */
export function sanitizeClubAppReturnPath(returnPath, clubSlug) {
  const slug = normalizeClubSlug(clubSlug);
  if (!slug || !returnPath || typeof returnPath !== "string") return "";

  let current = returnPath.trim();
  const seen = new Set();
  const appRoot = `/${slug}/app`;
  const welcomePath = welcomeDriversPathname(slug);

  for (let depth = 0; depth < 12 && current; depth += 1) {
    if (seen.has(current)) break;
    seen.add(current);

    if (!current.startsWith("/") || current.startsWith("//")) return "";
    if (current.includes("..") || current.includes("\\")) return "";

    let parsed;
    try {
      parsed = new URL(current, "https://rcraceday.invalid");
    } catch {
      return "";
    }

    const pathname = parsed.pathname.replace(/\/+$/, "") || parsed.pathname;
    if (pathname !== appRoot && !pathname.startsWith(`${appRoot}/`)) return "";

    const nested = (parsed.searchParams.get("returnTo") || "").trim();
    if (nested) {
      current = nested;
      continue;
    }

    if (pathname === welcomePath) return "";

    parsed.searchParams.delete("returnTo");
    const search = parsed.searchParams.toString();
    return `${pathname}${search ? `?${search}` : ""}${parsed.hash || ""}`;
  }

  return "";
}

/** App path (pathname + search + hash) safe to use as returnTo for a club tenant. */
export function isSafeClubAppReturnPath(returnPath, clubSlug) {
  return Boolean(sanitizeClubAppReturnPath(returnPath, clubSlug));
}

/** Member driver manager / profile routes (visitors get membership pitch if redirected here). */
export function isDriverProfileMemberAppPath(pathname) {
  const path = String(pathname || "").replace(/\/+$/, "");
  if (!/\/app\/profile\/drivers(\/|$)/.test(path)) return false;
  if (/\/app\/profile\/drivers\/(welcome|setup|add)(\/|$)/.test(path)) return false;
  return true;
}

export function appReturnPathFromLocation(location, clubSlug) {
  if (!location) return "";
  const params = new URLSearchParams(
    typeof location.search === "string" && location.search.startsWith("?")
      ? location.search.slice(1)
      : location.search || ""
  );
  const nested = (params.get("returnTo") || "").trim();
  params.delete("returnTo");
  const search = params.toString();
  const path = `${location.pathname || ""}${search ? `?${search}` : ""}${location.hash || ""}`;
  return (
    sanitizeClubAppReturnPath(nested, clubSlug) ||
    sanitizeClubAppReturnPath(path, clubSlug)
  );
}

export function returnToFromSearch(search) {
  const params =
    typeof search === "string"
      ? new URLSearchParams(search.startsWith("?") ? search.slice(1) : search)
      : search;
  if (!params?.get) return "";
  return (params.get("returnTo") || "").trim();
}

/** Supabase email links may land on a club /public/login URL with tokens in hash or query. */
export function hasAuthCallbackInUrl() {
  if (typeof window === "undefined") return false;
  const { hash, search } = window.location;
  return (
    hash.includes("access_token") ||
    hash.includes("type=signup") ||
    search.includes("code=") ||
    search.includes("token_hash=")
  );
}

export function platformSignInPath(returnTo) {
  const safe = sanitizePlatformReturnPath(returnTo);
  if (!safe) return "/";
  return `/?returnTo=${encodeURIComponent(safe)}`;
}

export function platformSignupPathForClub(clubSlug, appReturnTo) {
  const slug = normalizeClubSlug(clubSlug);
  if (!slug) return "/?signup=1";
  const safeApp = sanitizeClubAppReturnPath(appReturnTo, slug);
  const afterSignup = publicClaimMembershipPath(slug, safeApp);
  const safeReturn = sanitizePlatformReturnPath(afterSignup);
  if (!safeReturn) return "/?signup=1";
  return `/?signup=1&returnTo=${encodeURIComponent(safeReturn)}`;
}

export function publicLoginPath(clubSlug, returnTo) {
  const slug = normalizeClubSlug(clubSlug);
  if (!slug) return "/";
  let path = `/${slug}/public/login`;
  const safeReturnTo = sanitizeClubAppReturnPath(returnTo, slug);
  if (safeReturnTo) {
    path += `?returnTo=${encodeURIComponent(safeReturnTo)}`;
  }
  return path;
}

export function publicLoginRedirectUrl(clubSlug, returnTo) {
  return `${getPublicSiteOrigin()}${publicLoginPath(clubSlug, returnTo)}`;
}

export function publicClaimMembershipPath(clubSlug, returnTo) {
  const slug = normalizeClubSlug(clubSlug);
  let path = `/${slug}/public/claim-membership`;
  const safeReturnTo = sanitizeClubAppReturnPath(returnTo, slug);
  if (safeReturnTo) {
    path += `?returnTo=${encodeURIComponent(safeReturnTo)}`;
  }
  return path;
}

/** After platform login, safe destinations: club app or club access (membership link). */
export function sanitizePlatformReturnPath(returnPath) {
  if (!returnPath || typeof returnPath !== "string") return "";

  let current = returnPath.trim();
  const seen = new Set();
  const allowedPublicPages = new Set([
    "claim-membership",
    "access",
    "check-email",
  ]);

  for (let depth = 0; depth < 12 && current; depth += 1) {
    if (seen.has(current)) break;
    seen.add(current);

    if (!current.startsWith("/") || current.startsWith("//")) return "";
    if (current.includes("..") || current.includes("\\")) return "";

    let parsed;
    try {
      parsed = new URL(current, "https://rcraceday.invalid");
    } catch {
      return "";
    }

    const pathname = parsed.pathname.replace(/\/+$/, "") || parsed.pathname;
    const segments = pathname.split("/").filter(Boolean);
    if (segments.length < 2) return "";

    const slug = segments[0];
    const appRoot = `/${slug}/app`;
    let allowed = pathname === appRoot || pathname.startsWith(`${appRoot}/`);

    if (
      !allowed &&
      segments[1] === "public" &&
      allowedPublicPages.has(segments[2])
    ) {
      allowed = true;
    }

    if (!allowed) return "";

    const nested = (parsed.searchParams.get("returnTo") || "").trim();
    if (nested) {
      current = nested;
      continue;
    }

    parsed.searchParams.delete("returnTo");
    const search = parsed.searchParams.toString();
    return `${pathname}${search ? `?${search}` : ""}${parsed.hash || ""}`;
  }

  return "";
}

export function platformHomePath(returnTo) {
  const safe = sanitizePlatformReturnPath(returnTo);
  if (!safe) return "/";
  return `/?returnTo=${encodeURIComponent(safe)}`;
}

/** Log in at RCRaceday home, then open club access (not a per-club login). */
export function platformLoginPathForClub(clubSlug, appReturnTo) {
  const slug = normalizeClubSlug(clubSlug);
  if (!slug) return "/";
  const safeApp = sanitizeClubAppReturnPath(appReturnTo, slug);
  return platformHomePath(publicClaimMembershipPath(slug, safeApp));
}

export function publicClubAccessPath(clubSlug, returnTo) {
  return publicClaimMembershipPath(clubSlug, returnTo);
}

export function publicSignupPath(clubSlug, returnTo) {
  const slug = normalizeClubSlug(clubSlug);
  let path = `/${slug}/public/signup`;
  const safeReturnTo = sanitizeClubAppReturnPath(returnTo, slug);
  if (safeReturnTo) {
    path += `?returnTo=${encodeURIComponent(safeReturnTo)}`;
  }
  return path;
}

export function publicCheckEmailPath(clubSlug, email, returnTo) {
  const slug = normalizeClubSlug(clubSlug);
  const params = new URLSearchParams();
  if (email) params.set("email", email);
  const safeReturnTo = sanitizeClubAppReturnPath(returnTo, slug);
  if (safeReturnTo) params.set("returnTo", safeReturnTo);
  const qs = params.toString();
  return `/${slug}/public/check-email${qs ? `?${qs}` : ""}`;
}

export function welcomeDriversPath(clubSlug, returnTo) {
  const slug = normalizeClubSlug(clubSlug);
  const path = welcomeDriversPathname(slug);
  const safeReturnTo = sanitizeClubAppReturnPath(returnTo, slug);
  if (safeReturnTo) {
    return `${path}?returnTo=${encodeURIComponent(safeReturnTo)}`;
  }
  return path;
}

export function clubDriverSetupPath(clubSlug, returnTo) {
  const slug = normalizeClubSlug(clubSlug);
  const path = `/${slug}/app/profile/drivers/setup`;
  const safeReturnTo = sanitizeClubAppReturnPath(returnTo, slug);
  if (safeReturnTo) {
    return `${path}?returnTo=${encodeURIComponent(safeReturnTo)}`;
  }
  return path;
}

export function resolvePostAuthAppPath({ clubSlug, firstLogin, returnTo }) {
  const slug = normalizeClubSlug(clubSlug);
  const safeReturnTo = sanitizeClubAppReturnPath(returnTo, slug);
  if (firstLogin) {
    return welcomeDriversPath(slug, safeReturnTo);
  }
  if (safeReturnTo) {
    return safeReturnTo;
  }
  return `/${slug}/app`;
}

/** Strip trailing slashes from /public/reset-password so routes and tokens are not lost. */
export function normalizeResetPasswordLocation() {
  const url = new URL(window.location.href);
  const normalizedPath = url.pathname
    .replace(/\/public\/reset-password\/+$/i, "/public/reset-password")
    .replace(/\/recover-password\/+$/i, "/recover-password")
    .replace(/\/reset-password\/+$/i, "/recover-password");

  if (normalizedPath === url.pathname) return;

  url.pathname = normalizedPath;
  window.history.replaceState({}, document.title, url.toString());
}
