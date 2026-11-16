export default function ResultsStatTile({ label, value, accent, emphasis = false }) {
  return (
    <div
      className={`rounded-lg px-3 py-2 min-w-0 border ${
        emphasis ? "col-span-2 sm:col-span-1" : ""
      }`}
      style={
        accent
          ? { borderColor: `${accent}33`, backgroundColor: `${accent}0d` }
          : { borderColor: "var(--border, #e5e7eb)", backgroundColor: "rgba(248,250,252,0.6)" }
      }
    >
      <div className="text-[10px] uppercase tracking-wide text-text-muted">{label}</div>
      <div
        className={`tabular-nums text-text-base ${
          emphasis ? "text-2xl font-bold tracking-tight" : "text-sm font-bold"
        }`}
        style={emphasis && accent ? { color: accent } : undefined}
      >
        {value ?? "—"}
      </div>
    </div>
  );
}