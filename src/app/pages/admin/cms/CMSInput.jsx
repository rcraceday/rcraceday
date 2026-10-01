import { cmsStyles } from "./styles";
import { useTranslation } from "@/app/i18n/I18nContext";

const ADMIN_RED = "#DC2626";

export default function CMSInput({
  label,
  labelKey,
  value,
  onChange,
  type = "text",
  name,
  options = null,
  inputStyle = {},
  action = null,
  maxLength,
  placeholder,
}) {
  const { t } = useTranslation();
  const resolvedLabel = labelKey ? t(labelKey) : label;
  const baseInputStyle = {
    ...cmsStyles.input,
    borderColor: "#D1D5DD",
    outline: "none",
    ...inputStyle,
  };

  const baseTextareaStyle = {
    ...cmsStyles.textarea,
    borderColor: "#D1D5DD",
    outline: "none",
  };

  // Accept either a raw value or a DOM event so all admin forms work consistently.
  const handleValue = (eOrValue) => {
    const value =
      typeof eOrValue === "string" || typeof eOrValue === "number"
        ? eOrValue
        : eOrValue?.target?.value ?? "";

    onChange?.(value);
  };

  const focusHandlers = {
    onFocus: (e) => {
      e.target.style.borderColor = ADMIN_RED;
      e.target.style.boxShadow = `0 0 0 2px ${ADMIN_RED}33`;
    },
    onBlur: (e) => {
      e.target.style.borderColor = "#D1D5DD";
      e.target.style.boxShadow = "none";
      if (type === "datetime-local" || type === "date") {
        handleValue(e);
      }
    },
  };

  const wrapControl = (control) =>
    action ? (
      <div className="admin-input-action-row">
        {control}
        {action}
      </div>
    ) : (
      control
    );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
      {resolvedLabel && <label style={cmsStyles.label}>{resolvedLabel}</label>}

      {options ? (
        wrapControl(
          <select
            name={name}
            value={value || ""}
            onChange={handleValue}
            style={{
              ...baseInputStyle,
              appearance: "none",
              backgroundImage:
                `linear-gradient(45deg, transparent 50%, ${ADMIN_RED} 50%), 
                 linear-gradient(135deg, ${ADMIN_RED} 50%, transparent 50%)`,
              backgroundPosition:
                "calc(100% - 15px) calc(50% - 3px), calc(100% - 10px) calc(50% - 3px)",
              backgroundSize: "5px 5px, 5px 5px",
              backgroundRepeat: "no-repeat",
            }}
            {...focusHandlers}
          >
            {[...options]
              .sort((a, b) =>
                String(a.label ?? "").localeCompare(String(b.label ?? ""), undefined, {
                  sensitivity: "base",
                })
              )
              .map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
          </select>
        )
      ) : type === "textarea" ? (
        <textarea
          name={name}
          value={value || ""}
          onChange={handleValue}
          maxLength={maxLength}
          placeholder={placeholder}
          style={baseTextareaStyle}
          {...focusHandlers}
        />
      ) : (
        wrapControl(
          <input
            name={name}
            type={type}
            value={value || ""}
            onChange={handleValue}
            onInput={type === "datetime-local" || type === "date" ? handleValue : undefined}
            maxLength={maxLength}
            placeholder={placeholder}
            style={baseInputStyle}
            {...focusHandlers}
          />
        )
      )}
    </div>
  );
}
