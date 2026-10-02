import { normalizePointsTable } from "./championshipPointsTable.js";

export function parseClubPointsPresets(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item) => item && typeof item.name === "string" && item.name.trim())
    .map((item) => ({
      id: item.id || `preset-${item.name}`,
      name: item.name.trim(),
      spread: item.spread || null,
      pointsTable: normalizePointsTable(item.pointsTable || item.points_table),
    }));
}

export async function loadClubPointsPresets(supabase, clubId) {
  if (!clubId) return [];
  const { data, error } = await supabase
    .from("clubs")
    .select("championship_points_presets")
    .eq("id", clubId)
    .maybeSingle();
  if (error) {
    if (/championship_points_presets|schema cache/i.test(error.message || "")) return [];
    throw error;
  }
  return parseClubPointsPresets(data?.championship_points_presets);
}

export async function saveClubPointsPresets(supabase, clubId, presets) {
  const { error } = await supabase
    .from("clubs")
    .update({ championship_points_presets: presets })
    .eq("id", clubId);
  if (error) throw error;
}

export function buildPresetFromCurrent({ name, spread, pointsTable }) {
  return {
    id: crypto.randomUUID(),
    name: String(name || "").trim(),
    spread: spread ? { ...spread } : null,
    pointsTable: normalizePointsTable(pointsTable),
  };
}
