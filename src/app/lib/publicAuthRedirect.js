export function getPublicSiteOrigin() {
  const configuredOrigin = import.meta.env.VITE_SITE_URL?.trim();
  return (configuredOrigin || window.location.origin).replace(/\/$/, "");
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

/** App path (pathname + search + hash) safe to use as returnTo for a club tenant. */
export function isSafeClubAppReturnPath(returnPath, clubSlug) {
  if (!returnPath || typeof returnPath !== "string") return false;
  const path = returnPath.trim();
  if (!path.startsWith("/") || path.startsWith("//")) return false;
  if (path.includes("..") || path.includes("\\")) return false;

  const slug = normalizeClubSlug(clubSlug);
  if (!slug) return false;

  const prefix = `/${slug}/app/`;
  return path.startsWith(prefix) || path === `/${slug}/app`;
}

export function appReturnPathFromLocation(location) {
  if (!location) return "";
  return `${location.pathname || ""}${location.search || ""}${location.hash || ""}`;
}

export function returnToFromSearch(search) {
  const params =
    typeof search === "string"
      ? new URLSearchParams(search.startsWith("?") ? search.slice(1) : search)
      : search;
  if (!params?.get) return "";
  return (params.get("returnTo") || "").trim();
}

export function publicLoginPath(clubSlug, returnTo) {
  const slug = normalizeClubSlug(clubSlug);
  let path = `/${slug}/public/login`;
  if (returnTo && isSafeClubAppReturnPath(returnTo, slug)) {
    path += `?returnTo=${encodeURIComponent(returnTo)}`;
  }
  return path;
}

export function publicLoginRedirectUrl(clubSlug, returnTo) {
  return `${getPublicSiteOrigin()}${publicLoginPath(clubSlug, returnTo)}`;
}

export function publicSignupPath(clubSlug, returnTo) {
  const slug = normalizeClubSlug(clubSlug);
  let path = `/${slug}/public/signup`;
  if (returnTo && isSafeClubAppReturnPath(returnTo, slug)) {
    path += `?returnTo=${encodeURIComponent(returnTo)}`;
  }
  return path;
}

export function publicCheckEmailPath(clubSlug, email, returnTo) {
  const slug = normalizeClubSlug(clubSlug);
  const params = new URLSearchParams();
  if (email) params.set("email", email);
  if (returnTo && isSafeClubAppReturnPath(returnTo, slug)) {
    params.set("returnTo", returnTo);
  }
  const qs = params.toString();
  return `/${slug}/public/check-email${qs ? `?${qs}` : ""}`;
}

export function welcomeDriversPath(clubSlug, returnTo) {
  const slug = normalizeClubSlug(clubSlug);
  let path = `/${slug}/app/profile/drivers/welcome`;
  const safeReturnTo =
    returnTo && isSafeClubAppReturnPath(returnTo, slug) ? returnTo : "";
  if (safeReturnTo) {
    path += `?returnTo=${encodeURIComponent(safeReturnTo)}`;
  }
  return path;
}

export function resolvePostAuthAppPath({ clubSlug, firstLogin, returnTo }) {
  const slug = normalizeClubSlug(clubSlug);
  const safeReturnTo =
    returnTo && isSafeClubAppReturnPath(returnTo, slug) ? returnTo : "";
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
  const normalizedPath = url.pathname.replace(
    /\/public\/reset-password\/+$/i,
    "/public/reset-password"
  );

  if (normalizedPath === url.pathname) return;

  url.pathname = normalizedPath;
  window.history.replaceState({}, document.title, url.toString());
}
