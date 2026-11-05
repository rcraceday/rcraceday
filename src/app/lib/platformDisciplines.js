import { parseDirectoryProfile } from "@/app/lib/primaryClub";

export const DISCIPLINE_TAG_GROUPS = ["scale", "surface", "power", "discipline"];

/** Offline fallback if platform_discipline_tags is not migrated yet. */
export const FALLBACK_DISCIPLINE_TAGS = [
  { slug: "scale-1-5", label: "1/5", tag_group: "scale", sort_order: 10 },
  { slug: "scale-1-8", label: "1/8", tag_group: "scale", sort_order: 20 },
  { slug: "scale-1-10", label: "1/10", tag_group: "scale", sort_order: 30 },
  { slug: "scale-1-12", label: "1/12", tag_group: "scale", sort_order: 40 },
  { slug: "scale-1-14", label: "1/14", tag_group: "scale", sort_order: 50 },
  { slug: "scale-mini", label: "Mini / micro", tag_group: "scale", sort_order: 60 },
  { slug: "surface-on-road", label: "On-road", tag_group: "surface", sort_order: 10 },
  { slug: "surface-off-road", label: "Off-road", tag_group: "surface", sort_order: 20 },
  { slug: "surface-carpet", label: "Carpet", tag_group: "surface", sort_order: 30 },
  { slug: "surface-dirt", label: "Dirt", tag_group: "surface", sort_order: 40 },
  { slug: "surface-astro", label: "Astro / clay", tag_group: "surface", sort_order: 50 },
  { slug: "surface-turf", label: "Turf / grass", tag_group: "surface", sort_order: 60 },
  { slug: "power-electric", label: "Electric (EP)", tag_group: "power", sort_order: 10 },
  { slug: "power-nitro", label: "Nitro (IC)", tag_group: "power", sort_order: 20 },
  { slug: "power-gas", label: "Gas / petrol", tag_group: "power", sort_order: 30 },
  { slug: "power-glow", label: "Glow / nitro plane", tag_group: "power", sort_order: 40 },
  { slug: "disc-touring", label: "Touring", tag_group: "discipline", sort_order: 10 },
  { slug: "disc-drift", label: "Drift", tag_group: "discipline", sort_order: 20 },
  { slug: "disc-pan", label: "Pan car", tag_group: "discipline", sort_order: 30 },
  { slug: "disc-buggy", label: "Buggy", tag_group: "discipline", sort_order: 40 },
  { slug: "disc-truggy", label: "Truggy", tag_group: "discipline", sort_order: 50 },
  { slug: "disc-short-course", label: "Short course", tag_group: "discipline", sort_order: 60 },
  { slug: "disc-crawler", label: "Rock crawler", tag_group: "discipline", sort_order: 70 },
  { slug: "disc-rally", label: "Rally", tag_group: "discipline", sort_order: 80 },
  { slug: "disc-stadium", label: "Stadium truck", tag_group: "discipline", sort_order: 90 },
  { slug: "disc-onroad-gt", label: "On-road GT", tag_group: "discipline", sort_order: 100 },
  { slug: "disc-fixed-wing", label: "Fixed-wing", tag_group: "discipline", sort_order: 110 },
  { slug: "disc-helicopter", label: "Helicopter", tag_group: "discipline", sort_order: 120 },
  { slug: "disc-fpv-drone", label: "FPV / drone", tag_group: "discipline", sort_order: 130 },
  { slug: "disc-boat", label: "Boat / marine", tag_group: "discipline", sort_order: 140 },
  { slug: "disc-jet", label: "Jet boat", tag_group: "discipline", sort_order: 150 },
  { slug: "disc-submarine", label: "Submarine", tag_group: "discipline", sort_order: 160 },
];

export async function fetchPlatformDisciplineTags(supabase) {
  const { data, error } = await supabase
    .from("platform_discipline_tags")
    .select("slug, label, tag_group, sort_order")
    .eq("active", true)
    .order("tag_group")
    .order("sort_order");

  if (error || !data?.length) {
    if (error) {
      console.warn("[platformDisciplines] load tags", error.message);
    }
    return FALLBACK_DISCIPLINE_TAGS.slice();
  }

  return data;
}

export function buildDisciplineTagLookup(tags) {
  const map = new Map();
  for (const tag of tags || []) {
    if (tag?.slug) map.set(tag.slug, tag);
  }
  return map;
}

export function groupDisciplineTags(tags) {
  const grouped = {};
  for (const group of DISCIPLINE_TAG_GROUPS) {
    grouped[group] = [];
  }
  for (const tag of tags || []) {
    const group = tag.tag_group;
    if (!grouped[group]) grouped[group] = [];
    grouped[group].push(tag);
  }
  for (const group of Object.keys(grouped)) {
    grouped[group].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  }
  return grouped;
}

export function filterDisciplineTagsBySearch(tags, searchTerm) {
  const q = String(searchTerm || "").trim().toLowerCase();
  if (!q) return tags;
  return tags.filter(
    (tag) =>
      tag.label.toLowerCase().includes(q) ||
      tag.slug.toLowerCase().includes(q) ||
      tag.tag_group.toLowerCase().includes(q)
  );
}

export function clubDisciplineSlugs(club) {
  const { discipline_slugs } = parseDirectoryProfile(club?.directory_profile);
  return discipline_slugs;
}

/** Club must include every selected slug (AND). */
export function clubMatchesDisciplineSlugs(club, selectedSlugs) {
  if (!selectedSlugs?.length) return true;
  const clubSlugs = new Set(clubDisciplineSlugs(club));
  return selectedSlugs.every((slug) => clubSlugs.has(slug));
}

export function resolveDisciplineLabels(slugs, tagLookup) {
  return (slugs || [])
    .map((slug) => tagLookup.get(slug)?.label || slug)
    .filter(Boolean);
}

export function toggleSlugInList(list, slug) {
  const set = new Set(list || []);
  if (set.has(slug)) set.delete(slug);
  else set.add(slug);
  return [...set];
}
