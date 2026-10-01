export function raceFormatLabel(format, t) {
  const key = `results.raceFormatOptions.${format}`;
  const label = t?.(key);
  if (label && label !== key) return label;
  const fallbacks = {
    auto: "Auto-detect from LiveRC",
    triple_heads_up: "Triple A-main (heads-up grid)",
    club_mains: "All mains from LiveRC",
    single_main: "Single A-main only",
    qual_heats: "Qualifying heats (no round ranking)",
  };
  return fallbacks[format] || format;
}
