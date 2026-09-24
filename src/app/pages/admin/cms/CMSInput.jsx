import { cmsStyles } from "./styles";

const ADMIN_RED = "#DC2626";

export default function CMSInput({
  label,
  value,
  onChange,
  type = "text",
  name,
  options = null,
  inputStyle = {},
  action = null,
}) {
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
      {label && <label style={cmsStyles.label}>{label}</label>}

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
            style={baseInputStyle}
            {...focusHandlers}
          />
        )
      )}
    </div>
  );
}
