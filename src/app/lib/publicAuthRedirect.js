/**
 * Canonical redirect URL for Supabase auth emails (confirm, recovery).
 * Must match an entry in Supabase Dashboard → Auth → URL configuration → Redirect URLs.
 */
export function publicAuthRedirectUrl(clubSlug, publicPage) {
  const configuredOrigin = import.meta.env.VITE_SITE_URL?.trim();
  const origin = (configuredOrigin || window.location.origin).replace(/\/$/, "");
  const slug = String(clubSlug || "").replace(/^\/+|\/+$/g, "");
  const page = String(publicPage || "")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");

  return `${origin}/${slug}/public/${page}`;
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
