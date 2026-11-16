import { useId, useMemo } from "react";

/**
 * SVG line chart — lower values plotted higher when lowerIsBetter (positions, lap ms).
 */
export default function ResultsSeasonLineChart({
  title,
  hint,
  points,
  formatValue = (v) => v,
  lowerIsBetter = true,
  stroke,
  fill,
  height = 168,
}) {
  const clipId = useId();
  const sorted = useMemo(
    () =>
      [...(points || [])].sort((a, b) =>
        String(a.sortKey || a.monthKey).localeCompare(String(b.sortKey || b.monthKey))
      ),
    [points]
  );

  if (!sorted.length) return null;

  const pad = { top: 18, right: 10, bottom: 30, left: 42 };
  const vbW = 360;
  const vbH = height;
  const plotW = vbW - pad.left - pad.right;
  const plotH = vbH - pad.top - pad.bottom;

  const values = sorted.map((p) => Number(p.value));
  let yMin = Math.min(...values);
  let yMax = Math.max(...values);
  if (yMin === yMax) {
    yMin -= 1;
    yMax += 1;
  }
  const yPad = (yMax - yMin) * 0.12 || 0.5;
  yMin -= yPad;
  yMax += yPad;

  const xAt = (index) => pad.left + (sorted.length === 1 ? plotW / 2 : (index / (sorted.length - 1)) * plotW);
  const yAt = (value) => {
    const t = (value - yMin) / (yMax - yMin);
    const screenT = lowerIsBetter ? 1 - t : t;
    return pad.top + screenT * plotH;
  };

  const coords = sorted.map((p, i) => ({ x: xAt(i), y: yAt(Number(p.value)), point: p }));
  const linePath = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(2)} ${c.y.toFixed(2)}`).join(" ");
  const areaPath =
    linePath +
    ` L ${coords[coords.length - 1].x.toFixed(2)} ${(pad.top + plotH).toFixed(2)}` +
    ` L ${coords[0].x.toFixed(2)} ${(pad.top + plotH).toFixed(2)} Z`;

  const gridLines = 4;
  const yTicks = [];
  for (let i = 0; i <= gridLines; i++) {
    const actual = yMin + ((yMax - yMin) * i) / gridLines;
    yTicks.push({ y: yAt(actual), label: formatValue(actual) });
  }

  const strokeColor = stroke || "#2563eb";
  const fillColor = fill || strokeColor;

  return (
    <div className="rounded-xl border border-border/80 bg-gradient-to-b from-surface-alt/40 to-transparent p-3">
      <div className="mb-2">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">{title}</div>
        {hint ? <p className="text-[10px] text-text-muted m-0 mt-0.5 leading-snug">{hint}</p> : null}
      </div>
      <svg
        viewBox={`0 0 ${vbW} ${vbH}`}
        className="w-full block"
        role="img"
        aria-label={title}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id={`${clipId}-area`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={fillColor} stopOpacity="0.28" />
            <stop offset="100%" stopColor={fillColor} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {yTicks.map((tick, i) => (
          <g key={i}>
            <line
              x1={pad.left}
              y1={tick.y}
              x2={pad.left + plotW}
              y2={tick.y}
              stroke="currentColor"
              strokeOpacity={0.08}
            />
            <text
              x={pad.left - 6}
              y={tick.y + 3}
              textAnchor="end"
              fontSize="9"
              fill="currentColor"
              opacity={0.45}
            >
              {tick.label}
            </text>
          </g>
        ))}
        <path d={areaPath} fill={`url(#${clipId}-area)`} />
        {coords.length > 1 ? (
          <path
            d={linePath}
            fill="none"
            stroke={strokeColor}
            strokeWidth="2.25"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}
        {coords.map((c, i) => (
          <g key={c.point.id || i}>
            <circle cx={c.x} cy={c.y} r="5.5" fill={strokeColor} stroke="#fff" strokeWidth="2" />
            <title>
              {c.point.tooltip ||
                `${c.point.monthLabel || c.point.xLabel}: ${formatValue(c.point.value)}`}
            </title>
            <text
              x={c.x}
              y={pad.top + plotH + 16}
              textAnchor="middle"
              fontSize="9"
              fontWeight="600"
              fill="currentColor"
              opacity={0.55}
            >
              {c.point.monthLabel || c.point.xLabel || ""}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}