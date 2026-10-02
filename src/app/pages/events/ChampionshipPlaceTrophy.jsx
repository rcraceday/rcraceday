import { TrophyIcon } from "@heroicons/react/24/solid";

const TROPHY_COLOR = {
  1: "#EAB308",
  2: "#9CA3AF",
  3: "#B45309",
};

export default function ChampionshipPlaceTrophy({ rank, className = "" }) {
  const place = Number(rank);
  if (!Number.isFinite(place) || place < 1 || place > 3) return null;
  return (
    <TrophyIcon
      className={`inline-block h-4 w-4 shrink-0 ${className}`.trim()}
      style={{ color: TROPHY_COLOR[place] }}
      aria-hidden
    />
  );
}
