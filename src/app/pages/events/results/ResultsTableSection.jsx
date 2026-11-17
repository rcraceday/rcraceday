export default function ResultsTableSection({ title, action = null, children }) {
  return (
    <div className="my-results-table-section rounded-xl border border-border/80 bg-gradient-to-b from-surface-alt/30 to-transparent overflow-hidden">
      <div className="px-3 py-2 border-b border-border/60 bg-surface-alt/40 flex items-center justify-between gap-3">
        <h4 className="m-0 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
          {title}
        </h4>
        {action}
      </div>
      <div className="p-2 sm:p-3 overflow-x-auto">{children}</div>
    </div>
  );
}

export function ResultsDataTable({ children, className = "" }) {
  return (
    <table className={`my-results-data-table w-full text-sm ${className}`.trim()}>{children}</table>
  );
}

export function positionCellClass(position) {
  const pos = Number(position);
  if (pos === 1) return "my-results-pos-badge my-results-pos-p1";
  if (pos === 2) return "my-results-pos-badge my-results-pos-p2";
  if (pos === 3) return "my-results-pos-badge my-results-pos-p3";
  return "my-results-pos-badge";
}

export function PositionCell({ value }) {
  const display = value ?? "—";
  return (
    <td className="py-2 pr-2">
      <span className={positionCellClass(value)}>{display}</span>
    </td>
  );
}