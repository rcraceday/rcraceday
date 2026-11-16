/** Dot colors for calendar month grids (distinct but aligned with chip palette). */
export const EVENT_TYPE_COLORS = {
  racing: "#2563eb",
  practice: "#64748b",
  club_meet: "#2563eb",
  championship_round: "#d97706",
  state_titles: "#7c3aed",
  national_titles: "#e11d48",
};

const CHIP_CLASS_BY_TYPE = {
  practice: "bg-slate-100 text-slate-800 border-slate-200/90",
  championship_round: "bg-amber-50 text-amber-950 border-amber-200",
  state_titles: "bg-violet-50 text-violet-950 border-violet-200",
  national_titles: "bg-rose-50 text-rose-950 border-rose-200",
};

const CLUB_PRIMARY_TYPES = new Set(["club_meet", "racing"]);

export function eventTypeUsesClubPrimary(type) {
  return CLUB_PRIMARY_TYPES.has((type || "").toLowerCase());
}

export function eventTypeChipClassName(type) {
  const key = (type || "").toLowerCase();
  return CHIP_CLASS_BY_TYPE[key] || "bg-surface-alt/80 text-text-base border-border";
}