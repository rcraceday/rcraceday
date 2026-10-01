import { useTranslation } from "@/app/i18n/I18nContext";
import {
  formatMetricsCurrency,
  getCalendarYear,
} from "@app/pages/admin/adminDashboardMetrics";

const METRICS_MEMBERSHIP_GRID_STYLE = {
  display: "grid",
  gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
  gap: "8px",
  width: "100%",
  minWidth: 0,
};

const METRICS_DRIVER_GRID_STYLE = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: "8px",
  width: "100%",
  minWidth: 0,
};

const METRICS_SUBHEADING_STYLE = {
  fontSize: "12px",
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.14em",
  color: "#9CA3AF",
  margin: "0 0 8px",
};

function StatCard({ label, value }) {
  return (
    <div
      style={{
        backgroundColor: "#FFFFFF",
        borderRadius: "8px",
        border: "1px solid #E5E7EB",
        padding: "10px 6px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        minHeight: "80px",
        boxSizing: "border-box",
        minWidth: 0,
        width: "100%",
      }}
    >
      <span
        style={{
          fontSize: "10px",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: "#6B7280",
          fontWeight: 600,
          lineHeight: 1.35,
          minHeight: "2.7em",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          whiteSpace: "pre-line",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: "18px",
          fontWeight: 700,
          color: "#111827",
          marginTop: "6px",
          lineHeight: 1.2,
        }}
      >
        {value}
      </span>
    </div>
  );
}

const METRICS_GRID_STYLE = {
  display: "grid",
  gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
  gap: "8px",
  width: "100%",
  minWidth: 0,
};

function MetricsGroup({ title, children, gridStyle = METRICS_GRID_STYLE }) {
  return (
    <div style={{ marginBottom: "14px", width: "100%" }}>
      <h3 style={METRICS_SUBHEADING_STYLE}>{title}</h3>
      <div style={gridStyle}>{children}</div>
    </div>
  );
}

export default function AdminKeyMetrics({
  stats,
  showMembership = true,
  metricsYear = getCalendarYear(),
}) {
  const { t } = useTranslation();

  return (
    <>
      {showMembership ? (
        <>
          <MetricsGroup
            title={t("admin.metrics.membershipTitle")}
            gridStyle={METRICS_MEMBERSHIP_GRID_STYLE}
          >
            <StatCard
              label={t("admin.metrics.totalMembers")}
              value={stats.membership.totalMembers}
            />
            <StatCard
              label={t("admin.metrics.adultMembers")}
              value={stats.membership.adult}
            />
            <StatCard
              label={t("admin.metrics.familyMembers")}
              value={stats.membership.family}
            />
            <StatCard
              label={t("admin.metrics.juniorMembers")}
              value={stats.membership.junior}
            />
            <StatCard
              label={t("admin.metrics.nonMember")}
              value={stats.membership.nonMember}
            />
          </MetricsGroup>

          <MetricsGroup
            title={t("admin.metrics.driverTitle")}
            gridStyle={METRICS_DRIVER_GRID_STYLE}
          >
            <StatCard label={t("admin.metrics.totalDrivers")} value={stats.drivers?.total ?? 0} />
            <StatCard label={t("admin.common.adult")} value={stats.drivers?.adult ?? 0} />
            <StatCard label={t("admin.common.junior")} value={stats.drivers?.junior ?? 0} />
            <StatCard label={t("admin.metrics.nonDrivers")} value={stats.drivers?.nonDrivers ?? 0} />
          </MetricsGroup>
        </>
      ) : null}

      <MetricsGroup title={t("admin.metrics.eventTitle")}>
        <StatCard
          label={t("admin.metrics.eventsYear", { year: metricsYear })}
          value={stats.events.total}
        />
        <StatCard label={t("admin.metrics.modern")} value={stats.events.modern} />
        <StatCard label={t("admin.metrics.dirt")} value={stats.events.dirt} />
        <StatCard label={t("admin.metrics.cancelled")} value={stats.events.cancelled} />
        <StatCard label={t("admin.metrics.remaining")} value={stats.events.remaining} />
      </MetricsGroup>

      <MetricsGroup title={t("admin.metrics.nominationTitle")}>
        <StatCard label={t("admin.metrics.totalNominations")} value={stats.nominations.totalYtd} />
        <StatCard label={t("admin.metrics.modernTrack")} value={stats.nominations.modernYtd} />
        <StatCard
          label={t("admin.metrics.modernRevenue")}
          value={formatMetricsCurrency(stats.nominations.modernRevenue)}
        />
        <StatCard label={t("admin.metrics.dirtTrack")} value={stats.nominations.dirtYtd} />
        <StatCard
          label={t("admin.metrics.dirtRevenue")}
          value={formatMetricsCurrency(stats.nominations.dirtRevenue)}
        />
      </MetricsGroup>
    </>
  );
}
