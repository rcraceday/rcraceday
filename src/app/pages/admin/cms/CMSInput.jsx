import { cmsStyles } from "./styles";

const ADMIN_RED = "#DC2626";

export default function CMSInput({
  label,
  value,
  onChange,
  type = "text",
  name,
  options = null,
}) {
  const baseInputStyle = {
    ...cmsStyles.input,
    borderColor: "#D1D5DB", // normal grey border
    outline: "none",
  };

  const baseTextareaStyle = {
    ...cmsStyles.textarea,
    borderColor: "#D1D5DB",
    outline: "none",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      {label && <label style={cmsStyles.label}>{label}</label>}

      {/* SELECT */}
      {options ? (
        <select
          name={name}
          value={value}
          onChange={onChange}
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
          onFocus={(e) => {
            e.target.style.borderColor = ADMIN_RED;
            e.target.style.boxShadow = `0 0 0 2px ${ADMIN_RED}33`;
          }}
          onBlur={(e) => {
            e.target.style.borderColor = "#D1D5DB";
            e.target.style.boxShadow = "none";
          }}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : type === "textarea" ? (
        <textarea
          name={name}
          value={value}
          onChange={onChange}
          style={baseTextareaStyle}
          onFocus={(e) => {
            e.target.style.borderColor = ADMIN_RED;
            e.target.style.boxShadow = `0 0 0 2px ${ADMIN_RED}33`;
          }}
          onBlur={(e) => {
            e.target.style.borderColor = "#D1D5DB";
            e.target.style.boxShadow = "none";
          }}
        />
      ) : (
        <input
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          style={baseInputStyle}
          onFocus={(e) => {
            e.target.style.borderColor = ADMIN_RED;
            e.target.style.boxShadow = `0 0 0 2px ${ADMIN_RED}33`;
          }}
          onBlur={(e) => {
            e.target.style.borderColor = "#D1D5DB";
            e.target.style.boxShadow = "none";
          }}
        />
      )}
    </div>
  );
}
