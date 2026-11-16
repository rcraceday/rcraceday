import { ChevronDownIcon } from "@heroicons/react/24/solid";

export default function PageFilterBar({
  brand = "#00438a",
  filterLabel,
  summaryText,
  mobileFilters,
  desktopFilters,
  className = "",
}) {
  const filters = mobileFilters ?? desktopFilters;

  return (
    <div
      className={`page-filter-bar mb-4 sm:mb-6 px-2 sm:px-3 py-2 sm:py-3 rounded-2xl border border-border/80 shadow-sm ${className}`.trim()}
      style={{ background: `linear-gradient(135deg, ${brand}0c 0%, transparent 65%)` }}
    >
      <details className="group w-full">
        <summary className="flex items-center justify-between gap-2 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
          <span className="min-w-0 text-sm font-medium text-text-base truncate">
            <span className="text-text-muted font-normal">{filterLabel}: </span>
            {summaryText}
          </span>
          <ChevronDownIcon
            className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180"
            style={{ color: brand }}
            aria-hidden
          />
        </summary>
        <div className="grid grid-cols-1 gap-2 pt-3 w-full min-w-0">{filters}</div>
      </details>
    </div>
  );
}