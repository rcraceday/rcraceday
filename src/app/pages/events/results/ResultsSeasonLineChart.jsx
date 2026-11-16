import { useId, useMemo } from "react";

/**
 * SVG line chart — lower values plotted higher when lowerIsBetter (positions, lap ms).
 * overlaySeries: [{ id, label, points, stroke? }]
 */
export default function ResultsSeasonLineChart({
  title,
  hint,
  points,
  overlaySeries = [],
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

  const axisKeys = useMemo(() => {
    const keys = new Set();
    sorted.forEach((p) => {
      if (p.sortKey != null) keys.add(String(p.sortKey));
    });
    (overlaySeries || []).forEach((series) => {
      (series.points || []).forEach((p) => {
        if (p.sortKey != null) keys.add(String(p.sortKey));
      });
    });
    return [...keys].sort((a, b) => a.localeCompare(b));
  }, [sorted, overlaySeries]);

  const valueByKey = useMemo(() => {
    const map = new Map();
    sorted.forEach((p) => {
      if (p.sortKey != null) map.set(String(p.sortKey), Number(p.value));
    });
    return map;
  }, [sorted]);

  if (!sorted.length && !(overlaySeries || []).some((s) => s.points?.length)) return null;

  const pad = { top: 18, right: 10, bottom: 30, left: 42 };
  const vbW = 360;
  const vbH = height;
  const plotW = vbW - pad.left - pad.right;
  const plotH = vbH - pad.top - pad.bottom;

  const allValues = [...sorted.map((p) => Number(p.value))];
  (overlaySeries || []).forEach((series) => {
    (series.points || []).forEach((p) => {
      if (p.value != null) allValues.push(Number(p.value));
    });
  });

  let yMin = Math.min(...allValues);
  let yMax = Math.max(...allValues);
  if (!Number.isFinite(yMin) || !Number.isFinite(yMax)) return null;
  if (yMin === yMax) {
    yMin -= 1;
    yMax += 1;
  }
  const yPad = (yMax - yMin) * 0.12 || 0.5;
  yMin -= yPad;
  yMax += yPad;

  const xAt = (index) =>
    pad.left + (axisKeys.length === 1 ? plotW / 2 : (index / (axisKeys.length - 1)) * plotW);
  const yAt = (value) => {
    const t = (value - yMin) / (yMax - yMin);
    // Smaller values (better finish / faster lap) plot toward the top of the chart.
    const fromTop = lowerIsBetter ? t : 1 - t;
    return pad.top + fromTop * plotH;
  };

  const primaryCoords = axisKeys
    .map((key, index) => {
      const value = valueByKey.get(key);
      if (value == null) return null;
      const point = sorted.find((p) => String(p.sortKey) === key);
      return { x: xAt(index), y: yAt(value), key, point };
    })
    .filter(Boolean);

  const linePath = primaryCoords
    .map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(2)} ${c.y.toFixed(2)}`)
    .join(" ");
  const areaPath =
    primaryCoords.length > 0
      ? linePath +
        ` L ${primaryCoords[primaryCoords.length - 1].x.toFixed(2)} ${(pad.top + plotH).toFixed(2)}` +
        ` L ${primaryCoords[0].x.toFixed(2)} ${(pad.top + plotH).toFixed(2)} Z`
      : "";

  const gridLines = 4;
  const yTicks = [];
  for (let i = 0; i <= gridLines; i++) {
    const actual = yMin + ((yMax - yMin) * i) / gridLines;
    yTicks.push({ y: yAt(actual), label: formatValue(actual) });
  }

  const strokeColor = stroke || "#2563eb";
  const fillColor = fill || strokeColor;

  const overlayPaths = (overlaySeries || []).map((series) => {
    const byKey = new Map();
    (series.points || []).forEach((p) => {
      if (p.sortKey != null) byKey.set(String(p.sortKey), Number(p.value));
    });
    const coords = axisKeys
      .map((key, index) => {
        const value = byKey.get(key);
        if (value == null) return null;
        return { x: xAt(index), y: yAt(value), key };
      })
      .filter(Boolean);
    const path = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(2)} ${c.y.toFixed(2)}`).join(" ");
    return { ...series, coords, path };
  });

  const xLabels = axisKeys.map((key, index) => {
    const fromPrimary = sorted.find((p) => String(p.sortKey) === key);
    const label =
      fromPrimary?.monthLabel ||
      (overlaySeries || [])
        .flatMap((s) => s.points || [])
        .find((p) => String(p.sortKey) === key)?.monthLabel ||
      "";
    return { x: xAt(index), label };
  });

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
        {areaPath ? <path d={areaPath} fill={`url(#${clipId}-area)`} /> : null}
        {primaryCoords.length > 1 ? (
          <path
            d={linePath}
            fill="none"
            stroke={strokeColor}
            strokeWidth="2.25"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}
        {primaryCoords.map((c) => (
          <circle key={c.key} cx={c.x} cy={c.y} r="5.5" fill={strokeColor} stroke="#fff" strokeWidth="2" />
        ))}
        {overlayPaths.map((row) =>
          row.coords.length > 1 ? (
            <path
              key={row.id}
              d={row.path}
              fill="none"
              stroke={row.stroke || "#b45309"}
              strokeWidth="2"
              strokeDasharray="5 4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : row.coords.length === 1 ? (
            <circle
              key={row.id}
              cx={row.coords[0].x}
              cy={row.coords[0].y}
              r="4.5"
              fill={row.stroke || "#b45309"}
              stroke="#fff"
              strokeWidth="1.5"
            />
          ) : null
        )}
        {xLabels.map(
          (row, i) =>
            row.label ? (
              <text
                key={`x-${i}`}
                x={row.x}
                y={pad.top + plotH + 16}
                textAnchor="middle"
                fontSize="9"
                fontWeight="600"
                fill="currentColor"
                opacity={0.55}
              >
                {row.label}
              </text>
            ) : null
        )}
      </svg>
    </div>
  );
}