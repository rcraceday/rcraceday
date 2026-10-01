import { useTranslation } from "@/app/i18n/I18nContext";
import { cmsStyles } from "./styles";

export default function CMSCard({ title, titleKey, actions, children, style = {} }) {
  const { t } = useTranslation();
  const resolvedTitle = titleKey ? t(titleKey) : title;
  return (
    <div
      style={{
        width: "100%",
        background: "#FFFFFF",
        border: "1px solid #E5E7EB",
        borderRadius: "6px",
        padding: "16px",              // ⭐ tighter padding
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        gap: "12px",                  // ⭐ tighter gap
        ...style,
      }}
    >
      {(resolvedTitle || actions) && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "4px",
          }}
        >
          <div style={{ fontSize: "18px", fontWeight: 600, color: "#111827" }}>
            {resolvedTitle}
          </div>

          {actions && (
            <div style={{ display: "flex", alignItems: "center" }}>
              {actions}
            </div>
          )}
        </div>
      )}

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "8px",                 // ⭐ tighter field spacing
        }}
      >
        {children}
      </div>
    </div>
  );
}
