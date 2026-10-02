export function eventLogoSrc(event) {
  if (!event) return null;
  if (event.logo_preview_url) return event.logo_preview_url;
  const raw = event.logourl;
  if (!raw) return null;
  if (raw.startsWith("http")) return raw;
  const base = import.meta.env.VITE_SUPABASE_URL;
  return `${base}/storage/v1/object/public/club-assets/${raw}`;
}
