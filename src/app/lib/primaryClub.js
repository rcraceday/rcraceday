import { supabase } from "@/supabaseClient";

export const PRIMARY_CLUB_SLUG_STORAGE_KEY = "rcraceday.primaryClubSlug";

/** Directory Phase 2 — club environment facets (Phase 3 adds discipline catalogue). */
export const CLUB_ENVIRONMENT_IDS = ["land", "air", "water"];

function parseCoord(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function parseEnvironments(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry) => String(entry).trim().toLowerCase())
    .filter((entry) => CLUB_ENVIRONMENT_IDS.includes(entry));
}

function parseLocation(raw) {
  const source = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  return {
    suburb: String(source.suburb || "").trim(),
    state: String(source.state || "").trim(),
    postcode: String(source.postcode || "").trim(),
    country: String(source.country || "").trim(),
    lat: parseCoord(source.lat),
    lng: parseCoord(source.lng),
  };
}

export function getPrimaryClubSlugFromStorage() {
  try {
    return String(localStorage.getItem(PRIMARY_CLUB_SLUG_STORAGE_KEY) || "").trim();
  } catch {
    return "";
  }
}

export function setPrimaryClubSlugInStorage(clubSlug) {
  const slug = String(clubSlug || "").trim();
  try {
    if (slug) {
      localStorage.setItem(PRIMARY_CLUB_SLUG_STORAGE_KEY, slug);
    } else {
      localStorage.removeItem(PRIMARY_CLUB_SLUG_STORAGE_KEY);
    }
  } catch {
    /* ignore quota / private mode */
  }
}

/**
 * Resolve slug: profile.primary_club_id wins when logged in; syncs to localStorage.
 */
export async function resolvePrimaryClubSlug({ userId } = {}) {
  if (userId) {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("primary_club_id")
      .eq("id", userId)
      .maybeSingle();

    if (!error && profile?.primary_club_id) {
      const { data: club } = await supabase
        .from("clubs")
        .select("slug")
        .eq("id", profile.primary_club_id)
        .maybeSingle();

      if (club?.slug) {
        setPrimaryClubSlugInStorage(club.slug);
        return club.slug;
      }
    }
  }

  return getPrimaryClubSlugFromStorage();
}

export async function persistPrimaryClub({ userId, clubId, clubSlug }) {
  const slug = String(clubSlug || "").trim();
  if (!slug || !clubId) return { ok: false, error: "missing_club" };

  setPrimaryClubSlugInStorage(slug);

  if (!userId) {
    return { ok: true, error: null };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ primary_club_id: clubId })
    .eq("id", userId);

  if (error) {
    console.warn("[persistPrimaryClub]", error);
    return { ok: false, error: error.message };
  }

  return { ok: true, error: null };
}

export function parseDirectoryProfile(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {
      tagline: "",
      formal_name: "",
      scales_offered: [],
      classes_offered: "",
      environments: [],
      location: parseLocation(null),
      discipline_slugs: [],
      discipline_suggestion: "",
    };
  }
  const scales = raw.scales_offered;
  const disciplineRaw = raw.discipline_slugs;
  return {
    tagline: String(raw.tagline || "").trim(),
    formal_name: String(raw.formal_name || "").trim(),
    scales_offered: Array.isArray(scales)
      ? scales.map((s) => String(s).trim()).filter(Boolean)
      : String(scales || "")
          .split(/[,;]/)
          .map((s) => s.trim())
          .filter(Boolean),
    classes_offered: String(raw.classes_offered || "").trim(),
    environments: parseEnvironments(raw.environments),
    location: parseLocation(raw.location),
    discipline_slugs: Array.isArray(disciplineRaw)
      ? disciplineRaw.map((s) => String(s).trim()).filter(Boolean)
      : [],
    discipline_suggestion: String(raw.discipline_suggestion || "").trim(),
  };
}
