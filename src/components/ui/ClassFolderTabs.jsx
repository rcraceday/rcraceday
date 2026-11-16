import { useLayoutEffect, useRef, useState } from "react";

const STACK_OVERLAP_PX = 17;
const INACTIVE_MIN_PX = 52;
const H_PAD = 16;

/** File-folder tabs; accordion overlap when full labels cannot fit on one row (or wrap to two rows). */
export default function ClassFolderTabs({
  options,
  value,
  onChange,
  brand = "#2563eb",
  wrapWhenOverflow = false,
}) {
  const shellRef = useRef(null);
  const measureRef = useRef(null);
  const [layout, setLayout] = useState("flat");
  const stacked = layout === "stacked";
  const [inactiveTabPx, setInactiveTabPx] = useState(INACTIVE_MIN_PX);

  const activeIndex = options.findIndex((opt) => opt.value === value);

  useLayoutEffect(() => {
    const shell = shellRef.current;
    const measure = measureRef.current;
    if (!shell || !measure || !options.length) return;

    const run = () => {
      const width = shell.clientWidth;
      if (width < 48) {
        setLayout("flat");
        return;
      }

      const chips = [...measure.querySelectorAll("[data-measure-tab]")];
      const widths = chips.map((chip) => chip.offsetWidth);
      const gap = 2;
      const flatTotal =
        widths.reduce((sum, w, i) => sum + w + (i > 0 ? gap : 0), 0) + options.length * 2;
      const fitsFlat = flatTotal <= width - H_PAD;

      if (fitsFlat) {
        setLayout("flat");
        setInactiveTabPx(INACTIVE_MIN_PX);
        return;
      }

      if (wrapWhenOverflow) {
        setLayout("wrap");
        setInactiveTabPx(INACTIVE_MIN_PX);
        return;
      }

      setLayout("stacked");

      const ai = activeIndex >= 0 ? activeIndex : 0;
      const activeW = widths[ai] || widths[0] || 80;
      const others = Math.max(1, options.length - 1);
      const overlapTotal = STACK_OVERLAP_PX * (options.length - 1);
      const available = width - H_PAD;

      const spreadInactive = (available - activeW + overlapTotal) / others;
      setInactiveTabPx(Math.max(INACTIVE_MIN_PX, Math.floor(spreadInactive)));
    };

    run();
    const raf = requestAnimationFrame(run);
    const observer = new ResizeObserver(run);
    observer.observe(shell);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [options, value, activeIndex, wrapWhenOverflow]);

  if (!options?.length) return null;

  return (
    <div ref={shellRef} className="relative w-full border-b border-border/60 bg-surface-alt/20">
      <div
        ref={measureRef}
        className="absolute left-0 top-0 flex gap-0.5 pointer-events-none"
        aria-hidden
        style={{ visibility: "hidden" }}
      >
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            data-measure-tab
            tabIndex={-1}
            disabled
            className="inline-flex items-center text-xs font-semibold px-3 py-1.5 whitespace-nowrap rounded-t-md border border-b-0 border-transparent box-border"
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div
        className={[
          "flex items-end px-2 pt-2 pb-0 w-full min-w-0 gap-x-0.5",
          layout === "wrap"
            ? "flex-wrap gap-y-1 overflow-y-hidden"
            : stacked
              ? "flex-nowrap overflow-x-hidden overflow-y-hidden"
              : "flex-nowrap overflow-y-hidden",
        ].join(" ")}
        role="tablist"
      >
        {options.map((opt, index) => {
          const active = opt.value === value;
          const isLeftOfActive = activeIndex >= 0 && index < activeIndex;
          const isRightOfActive = activeIndex >= 0 && index > activeIndex;

          let zIndex = 10 + index;
          if (active) {
            zIndex = 100;
          } else if (isLeftOfActive) {
            zIndex = 5 + index;
          } else if (isRightOfActive) {
            zIndex = Math.max(2, 24 - (index - activeIndex));
          }

          return (
            <button
              key={opt.value}
              type="button"
              role="tab"
              aria-selected={active}
              title={stacked && !active ? opt.label : undefined}
              onClick={() => onChange(opt.value)}
              className={[
                "relative box-border text-left text-xs font-semibold py-1.5 rounded-t-md border border-b-0 transition-colors",
                stacked
                  ? [
                      "shrink-0",
                      active
                        ? "bg-white text-text-base shadow-md -mb-px px-3 whitespace-nowrap"
                        : "bg-surface-alt/90 border-border/50 text-text-muted hover:bg-surface-alt hover:text-text-base px-2 truncate",
                    ].join(" ")
                  : [
                      "shrink-0 whitespace-nowrap px-3",
                      active
                        ? "bg-white text-text-base shadow-sm -mb-px"
                        : "bg-surface-alt/80 border-border/50 text-text-muted hover:bg-surface-alt hover:text-text-base",
                    ].join(" "),
              ].join(" ")}
              style={{
                zIndex: stacked ? zIndex : active ? 1 : undefined,
                ...(stacked && index > 0 ? { marginLeft: -STACK_OVERLAP_PX } : {}),
                ...(stacked && !active
                  ? { width: inactiveTabPx, maxWidth: inactiveTabPx, minWidth: INACTIVE_MIN_PX }
                  : {}),
                ...(active
                  ? {
                      borderTopWidth: 2,
                      borderTopColor: brand,
                    }
                  : {}),
              }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}