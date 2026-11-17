export const DROPDOWN_BORDER_RADIUS = 6;
export const DROPDOWN_BORDER_WIDTH = 1;
export const CMS_SELECT_BORDER = "#D1D5DB";
export const CMS_SELECT_TEXT = "#111827";

export const COMPACT_DROPDOWN_TRIGGER_OVERRIDES = {
  minWidth: 0,
  width: "100%",
  padding: "0.375rem 0.5rem",
  gap: "0.375rem",
  fontSize: "0.75rem",
  lineHeight: 1.25,
  minHeight: "2rem",
};

const DEFAULT_TEXT = "#0a1a2f";

function textColor(palette) {
  return palette?.text || DEFAULT_TEXT;
}

/** Neutral border for app/public dropdowns (not admin CMSSelect). */
export function getPublicDropdownBorderColor(palette) {
  return palette?.surfaceBorder || CMS_SELECT_BORDER;
}

export function getPremiumDropdownTriggerStyle(palette, overrides = {}) {
  const primary = palette?.primary || "#00438a";
  return getDropdownTriggerStyle(palette, {
    minHeight: "2.5rem",
    padding: "0.55rem 0.9rem",
    borderRadius: 10,
    border: `1px solid color-mix(in srgb, ${primary} 32%, ${CMS_SELECT_BORDER})`,
    background: `linear-gradient(180deg, #ffffff 0%, color-mix(in srgb, ${primary} 7%, #ffffff) 100%)`,
    boxShadow: `inset 0 1px 0 rgba(255,255,255,0.9), 0 1px 2px rgba(10, 26, 47, 0.06)`,
    fontWeight: 600,
    fontSize: "0.8125rem",
    letterSpacing: "0.01em",
    ...overrides,
  });
}

export function getPremiumDropdownMenuStyle(palette, overrides = {}) {
  const primary = palette?.primary || "#00438a";
  return getDropdownMenuStyle(palette, {
    borderRadius: 10,
    border: `1px solid color-mix(in srgb, ${primary} 22%, ${CMS_SELECT_BORDER})`,
    boxShadow: "0 10px 28px rgba(10, 26, 47, 0.12), 0 2px 6px rgba(10, 26, 47, 0.06)",
    ...overrides,
  });
}

export function getDropdownTriggerStyle(palette, overrides = {}) {
  const borderColor = getPublicDropdownBorderColor(palette);
  return {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "0.75rem",
    minWidth: "10rem",
    padding: "0.5rem 0.75rem",
    border: `${DROPDOWN_BORDER_WIDTH}px solid ${borderColor}`,
    borderRadius: DROPDOWN_BORDER_RADIUS,
    background: "#fff",
    color: textColor(palette),
    cursor: "pointer",
    boxSizing: "border-box",
    ...overrides,
  };
}

export function getDropdownMenuStyle(palette, overrides = {}) {
  const borderColor = getPublicDropdownBorderColor(palette);
  return {
    position: "absolute",
    top: "calc(100% + 0.25rem)",
    left: 0,
    zIndex: 300,
    minWidth: "100%",
    border: `${DROPDOWN_BORDER_WIDTH}px solid ${borderColor}`,
    borderRadius: DROPDOWN_BORDER_RADIUS,
    background: "#fff",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
    ...overrides,
  };
}

/** Matches admin CMSSelect (ClassesCard) — grey border, neutral surface. */
export function getCmsSelectTriggerStyle(palette, overrides = {}) {
  return getDropdownTriggerStyle(palette, {
    color: CMS_SELECT_TEXT,
    ...overrides,
  });
}

export function getCmsSelectMenuStyle(palette, overrides = {}) {
  return getDropdownMenuStyle(palette, {
    zIndex: 300,
    background: "#FFFFFF",
    ...overrides,
  });
}

/** In-flow menu: expands parent height instead of overlaying / internal scroll. */
export function getInlineDropdownMenuStyle(palette, overrides = {}) {
  return getDropdownMenuStyle(palette, {
    position: "relative",
    top: 0,
    left: 0,
    marginTop: "0.25rem",
    overflow: "visible",
    zIndex: 1,
    boxShadow: "none",
    ...overrides,
  });
}

export function getDropdownOptionStyle(palette, overrides = {}) {
  return {
    display: "block",
    width: "100%",
    padding: "0.5rem 0.75rem",
    border: 0,
    color: textColor(palette),
    cursor: "pointer",
    textAlign: "left",
    ...overrides,
  };
}

export function getNativeSelectStyle(palette, sizeOverrides = {}) {
  const borderColor = getPublicDropdownBorderColor(palette);
  return {
    border: `${DROPDOWN_BORDER_WIDTH}px solid ${borderColor}`,
    borderRadius: DROPDOWN_BORDER_RADIUS,
    background: "#fff",
    color: textColor(palette),
    boxSizing: "border-box",
    outline: "none",
    ...sizeOverrides,
  };
}
