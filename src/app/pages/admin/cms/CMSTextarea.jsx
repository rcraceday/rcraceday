import { cmsStyles } from "./styles";
import { useTranslation } from "@/app/i18n/I18nContext";

export default function CMSTextarea({ label, value, onChange, name }) {
  const { t } = useTranslation();
  const handleValue = (eOrValue) => {
    const value =
      typeof eOrValue === "string" || typeof eOrValue === "number"
        ? eOrValue
        : eOrValue?.target?.value ?? "";

    onChange?.(value);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      {label && <label style={cmsStyles.label}>{label}</label>}
      <textarea
        name={name}
        value={value || ""}
        onChange={handleValue}
        style={cmsStyles.textarea}
      />
    </div>
  );
}
