import { Link } from "react-router-dom";
import { useTranslation } from "@/app/i18n/I18nContext";

const SEVERITY_COLOR = {
  warning: { bg: "#FEF3C7", border: "#FCD34D", text: "#92400E" },
  info: { bg: "#EFF6FF", border: "#BFDBFE", text: "#1D4ED8" },
};

export default function AdminSystemNoticesPanel({ notices, loading }) {
  const { t } = useTranslation();

  return (
    <div
      style={{
        backgroundColor: "#FFFFFF",
        borderRadius: "8px",
        border: "1px solid #E5E7EB",
        padding: "10px 12px 12px",
        boxSizing: "border-box",
      }}
    >
      <h3
        style={{
          fontSize: "12px",
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          color: "#6B7280",
          margin: "0 0 8px",
        }}
      >
        {t("admin.dashboard.systemNotices")}
      </h3>

      {loading ? (
        <p style={{ fontSize: "13px", color: "#6B7280", margin: 0 }}>{t("loading.loading")}</p>
      ) : !notices?.length ? (
        <p style={{ fontSize: "13px", color: "#6B7280", margin: 0 }}>
          {t("admin.dashboard.systemNoticesClear")}
        </p>
      ) : (
        <ul
          style={{
            listStyle: "none",
            margin: 0,
            padding: 0,
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            maxHeight: "280px",
            overflowY: "auto",
          }}
        >
          {notices.map((notice) => {
            const palette = SEVERITY_COLOR[notice.severity] || SEVERITY_COLOR.info;
            const body = (
              <span style={{ fontSize: "13px", lineHeight: 1.4, color: palette.text }}>
                {t(notice.messageKey, notice.messageParams)}
              </span>
            );
            return (
              <li
                key={notice.id}
                style={{
                  padding: "8px 10px",
                  borderRadius: "6px",
                  backgroundColor: palette.bg,
                  border: `1px solid ${palette.border}`,
                }}
              >
                {notice.to ? (
                  <Link to={notice.to} style={{ textDecoration: "none", color: "inherit" }}>
                    {body}
                  </Link>
                ) : (
                  body
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
