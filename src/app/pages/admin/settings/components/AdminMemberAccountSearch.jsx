import { useEffect, useMemo, useRef, useState } from "react";
import { cmsStyles } from "@cms/styles";
import { useTranslation } from "@/app/i18n/I18nContext";

const ADMIN_RED = "#DC2626";

function optionLabel(option) {
  if (!option) return "";
  if (option.name && option.email) {
    return `${option.name} (${option.email})`;
  }
  return option.name || option.email || "";
}

export default function AdminMemberAccountSearch({
  label,
  options = [],
  selectedUserId,
  onSelect,
  disabled = false,
}) {
  const { t } = useTranslation();
  const rootRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = useMemo(
    () => options.find((opt) => opt.userId === selectedUserId) || null,
    [options, selectedUserId]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options.slice(0, 50);
    return options
      .filter((opt) => opt.searchText.includes(q))
      .slice(0, 50);
  }, [options, query]);

  useEffect(() => {
    const onDocClick = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    if (!selectedUserId) {
      setQuery("");
      return;
    }
    setQuery(optionLabel(selected));
  }, [selectedUserId, selected]);

  const inputStyle = {
    ...cmsStyles.input,
    borderColor: "#D1D5DD",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
  };

  return (
    <div ref={rootRef} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
      {label ? <label style={cmsStyles.label}>{label}</label> : null}
      <div style={{ position: "relative" }}>
        <input
          type="text"
          disabled={disabled}
          value={query}
          placeholder={t("admin.userSettings.memberSearchPlaceholder")}
          onChange={(e) => {
            const next = e.target.value;
            setQuery(next);
            setOpen(true);
            if (!next.trim()) {
              onSelect?.(null);
              return;
            }
            if (selected && optionLabel(selected) !== next) {
              onSelect?.(null);
            }
          }}
          onFocus={(e) => {
            setOpen(true);
            e.target.style.borderColor = ADMIN_RED;
            e.target.style.boxShadow = `0 0 0 2px ${ADMIN_RED}33`;
          }}
          onBlur={(e) => {
            e.target.style.borderColor = "#D1D5DD";
            e.target.style.boxShadow = "none";
          }}
          style={inputStyle}
          autoComplete="off"
        />
        {open && !disabled ? (
          <ul
            role="listbox"
            style={{
              position: "absolute",
              zIndex: 40,
              top: "calc(100% + 4px)",
              left: 0,
              right: 0,
              margin: 0,
              padding: "4px 0",
              listStyle: "none",
              maxHeight: "240px",
              overflowY: "auto",
              backgroundColor: "#fff",
              border: "1px solid #E5E7EB",
              borderRadius: "6px",
              boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
            }}
          >
            {filtered.length === 0 ? (
              <li
                style={{
                  padding: "10px 12px",
                  fontSize: "13px",
                  color: "#6B7280",
                }}
              >
                {t("admin.userSettings.memberSearchEmpty")}
              </li>
            ) : (
              filtered.map((opt) => (
                <li key={opt.userId} role="option">
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      onSelect?.(opt.userId);
                      setQuery(optionLabel(opt));
                      setOpen(false);
                    }}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      border: "none",
                      background: opt.userId === selectedUserId ? "#FEF2F2" : "transparent",
                      padding: "10px 12px",
                      cursor: "pointer",
                      fontSize: "14px",
                      color: "#111827",
                    }}
                  >
                    <div style={{ fontWeight: 500 }}>{opt.name || opt.email}</div>
                    {opt.name && opt.email ? (
                      <div style={{ fontSize: "12px", color: "#6B7280", marginTop: "2px" }}>
                        {opt.email}
                      </div>
                    ) : null}
                  </button>
                </li>
              ))
            )}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
