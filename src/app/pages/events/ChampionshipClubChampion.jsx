import { TrophyIcon } from "@heroicons/react/24/solid";

function LaurelBranch({ flip = false }) {
  return (
    <svg
      viewBox="0 0 52 92"
      className="h-[4.75rem] w-9 sm:h-24 sm:w-11 shrink-0"
      aria-hidden
      style={{ transform: flip ? "scaleX(-1)" : undefined }}
    >
      <path
        d="M26 88 C 22 68 18 52 22 34 C 24 22 28 12 32 6"
        fill="none"
        stroke="#B45309"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      {[
        [24, 78, -48],
        [22, 68, -40],
        [21, 58, -34],
        [22, 48, -28],
        [24, 38, -22],
        [27, 28, -16],
        [30, 18, -10],
        [32, 72, 42],
        [30, 62, 36],
        [29, 52, 30],
        [30, 42, 24],
        [32, 32, 16],
        [34, 22, 10],
      ].map(([x, y, rot], index) => (
        <ellipse
          key={index}
          cx={x}
          cy={y}
          rx="7.5"
          ry="3.2"
          fill={index % 2 ? "#CA8A04" : "#EAB308"}
          stroke="#92400E"
          strokeWidth="0.4"
          transform={`rotate(${rot} ${x} ${y})`}
        />
      ))}
    </svg>
  );
}

export default function ChampionshipClubChampion({
  season,
  clubName,
  driverName,
  className,
  primaryColor,
  t,
}) {
  return (
    <div
      className="relative overflow-hidden rounded-xl px-3 py-4 sm:px-4 sm:py-5 text-center"
      style={{
        background: `radial-gradient(ellipse at 50% 0%, color-mix(in srgb, #eab308 22%, white) 0%, color-mix(in srgb, ${primaryColor} 8%, white) 55%, white 100%)`,
        border: "1px solid color-mix(in srgb, #eab308 40%, #d1d5db)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.8), 0 1px 3px rgba(146, 64, 14, 0.08)",
      }}
    >
      <div className="flex items-center justify-center gap-1 sm:gap-3">
        <LaurelBranch />
        <div className="min-w-0 px-1">
          <TrophyIcon
            className="mx-auto h-7 w-7 sm:h-8 sm:w-8 mb-1"
            style={{ color: "#EAB308", filter: "drop-shadow(0 1px 1px rgba(146,64,14,0.35))" }}
            aria-hidden
          />
          <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.16em] font-bold m-0 leading-snug"
            style={{ color: "#92400E" }}
          >
            {t("results.championshipClubChampion", {
              season,
              club: clubName,
            })}
          </p>
          <p className="text-lg sm:text-2xl font-bold m-0 mt-1 text-text-base tracking-tight leading-tight break-words">
            {driverName}
          </p>
          {className ? (
            <p className="text-[11px] text-text-muted m-0 mt-1 uppercase tracking-wide font-semibold">
              {className}
            </p>
          ) : null}
        </div>
        <LaurelBranch flip />
      </div>
    </div>
  );
}
