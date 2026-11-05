import { supabase } from "@/supabaseClient";

export const FAVORITE_CLUB_SLUGS_STORAGE_KEY = "rcraceday.favoriteClubSlugs";

export function getFavoriteClubSlugsFromStorage() {
  try {
    const raw = localStorage.getItem(FAVORITE_CLUB_SLUGS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((s) => String(s).trim()).filter(Boolean);
  } catch {
    return [];
  }
}

export function setFavoriteClubSlugsInStorage(slugs) {
  const list = [...new Set((slugs || []).map((s) => String(s).trim()).filter(Boolean))];
  try {
    localStorage.setItem(FAVORITE_CLUB_SLUGS_STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

export async function resolveFavoriteClubSlugs({ userId } = {}) {
  const fromStorage = getFavoriteClubSlugsFromStorage();

  if (!userId) {
    return fromStorage;
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("favorite_club_ids")
    .eq("id", userId)
    .maybeSingle();

  if (error || !Array.isArray(profile?.favorite_club_ids) || profile.favorite_club_ids.length === 0) {
    return fromStorage;
  }

  const { data: clubs } = await supabase
    .from("clubs")
    .select("id, slug")
    .in("id", profile.favorite_club_ids);

  const byId = new Map((clubs || []).map((c) => [c.id, c.slug]));
  const slugs = profile.favorite_club_ids
    .map((id) => byId.get(id))
    .filter(Boolean);
  if (slugs.length) {
    setFavoriteClubSlugsInStorage(slugs);
    return slugs;
  }

  return fromStorage;
}

export async function fetchFavoriteClubCards(slugs) {
  const unique = [...new Set((slugs || []).filter(Boolean))];
  if (!unique.length) return [];

  const { data, error } = await supabase
    .from("clubs")
    .select("id, name, slug, logo_url")
    .in("slug", unique);

  if (error) {
    console.warn("[fetchFavoriteClubCards]", error);
    return [];
  }

  const bySlug = new Map((data || []).map((club) => [club.slug, club]));
  return unique.map((slug) => bySlug.get(slug)).filter(Boolean);
}

export async function persistFavoriteClubSlugs({ userId, slugs }) {
  const list = (slugs || []).map((s) => String(s).trim()).filter(Boolean);
  const seen = new Set();
  const ordered = list.filter((slug) => {
    if (seen.has(slug)) return false;
    seen.add(slug);
    return true;
  });
  setFavoriteClubSlugsInStorage(ordered);

  if (!userId) {
    return { ok: true, slugs: ordered, error: null };
  }

  let clubIds = [];
  if (ordered.length) {
    const { data: clubs, error: clubError } = await supabase
      .from("clubs")
      .select("id, slug")
      .in("slug", ordered);

    if (clubError) {
      return { ok: false, slugs: ordered, error: clubError.message };
    }

    const order = new Map(ordered.map((slug, index) => [slug, index]));
    clubIds = (clubs || [])
      .sort((a, b) => (order.get(a.slug) ?? 999) - (order.get(b.slug) ?? 999))
      .map((c) => c.id);
  }

  const { error } = await supabase
    .from("profiles")
    .update({ favorite_club_ids: clubIds })
    .eq("id", userId);

  if (error) {
    console.warn("[persistFavoriteClubSlugs]", error);
    return { ok: false, slugs: ordered, error: error.message };
  }

  return { ok: true, slugs: ordered, error: null };
}

export async function toggleFavoriteClub({ userId, clubSlug, currentSlugs }) {
  const slug = String(clubSlug || "").trim();
  if (!slug) return { ok: false, slugs: currentSlugs || [], added: false };

  const set = new Set(currentSlugs || []);
  const added = !set.has(slug);
  if (added) set.add(slug);
  else set.delete(slug);

  const slugs = [...set];
  const result = await persistFavoriteClubSlugs({ userId, slugs });
  return { ...result, added };
}

export async function ensureClubInFavorites({ userId, clubSlug, currentSlugs }) {
  const slug = String(clubSlug || "").trim();
  if (!slug) return { ok: true, slugs: currentSlugs || [] };
  if ((currentSlugs || []).includes(slug)) {
    return { ok: true, slugs: currentSlugs };
  }
  return persistFavoriteClubSlugs({ userId, slugs: [...(currentSlugs || []), slug] });
}
