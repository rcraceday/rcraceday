import { useTranslation } from "@/app/i18n/I18nContext";
export default function CMSPage({ title, children }) {
  const { t } = useTranslation();
  return (
    <div>
      {title && (
        <h1
          style={{
            fontSize: "22px",
            fontWeight: 600,
            marginBottom: "12px",
            color: "#111827",
          }}
        >
          {title}
        </h1>
      )}

      {children}
    </div>
  );
}
