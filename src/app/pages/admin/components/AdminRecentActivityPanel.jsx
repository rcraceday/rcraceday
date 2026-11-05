import { useTranslation } from "@/app/i18n/I18nContext";
import { ADMIN_ACTIVITY_RETENTION_DAYS } from "@/app/lib/adminDashboardActivity";

function formatWhen(iso, t) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  const time = date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  if (sameDay) return t("admin.dashboard.activityToday", { time });
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function activityMessage(item, t) {
  const { kind, label, meta = {} } = item;
  switch (kind) {
    case "signup":
      return t("admin.dashboard.activitySignup", { name: label });
    case "account_linked":
      return t("admin.dashboard.activityAccountLinked", { name: label });
    case "membership_new":
      return t("admin.dashboard.activityMembershipNew", {
        name: label,
        type: meta.membershipType || "member",
      });
    case "nomination":
      return t("admin.dashboard.activityNomination", {
        name: label,
        event: meta.eventName || "Event",
      });
    case "driver_added":
      return t("admin.dashboard.activityDriverAdded", { name: label });
    case "event_created":
      return t("admin.dashboard.activityEventCreated", { name: label });
    case "event_updated":
      return t("admin.dashboard.activityEventUpdated", { name: label });
    default:
      return label;
  }
}

export default function AdminRecentActivityPanel({ items, loading }) {
  const { t } = useTranslation();

  const panelTitleStyle = {
    fontSize: "12px",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.12em",
    color: "#6B7280",
    margin: 0,
  };

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
      <h3 style={panelTitleStyle}>{t("admin.dashboard.recentActivity")}</h3>
      <p style={{ fontSize: "11px", color: "#9CA3AF", margin: "4px 0 8px", lineHeight: 1.35 }}>
        {t("admin.dashboard.recentActivityRetention", { days: ADMIN_ACTIVITY_RETENTION_DAYS })}
      </p>

      {loading ? (
        <p style={{ fontSize: "13px", color: "#6B7280", margin: 0 }}>{t("loading.loading")}</p>
      ) : !items?.length ? (
        <p style={{ fontSize: "13px", color: "#6B7280", margin: 0 }}>
          {t("admin.dashboard.recentActivityEmpty")}
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
          {items.map((item) => (
            <li
              key={item.id}
              style={{
                padding: "8px 10px",
                borderRadius: "6px",
                backgroundColor: "#F9FAFB",
                border: "1px solid #E5E7EB",
              }}
            >
              <div style={{ fontSize: "13px", color: "#111827", lineHeight: 1.4 }}>
                {activityMessage(item, t)}
              </div>
              <div style={{ fontSize: "11px", color: "#6B7280", marginTop: "4px" }}>
                {formatWhen(item.occurredAt, t)}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
