import { cmsStyles } from "./styles";

export default function CMSTextarea({ label, value, onChange, name }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      {label && <label style={cmsStyles.label}>{label}</label>}
      <textarea
        name={name}
        value={value}
        onChange={onChange}
        style={cmsStyles.textarea}
      />
    </div>
  );
}
