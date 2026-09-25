import {
  formatMetricsCurrency,
} from "@app/pages/admin/adminDashboardMetrics";

const METRICS_GRID_STYLE = {
  display: "grid",
  gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
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

function MetricsGroup({ title, children }) {
  return (
    <div style={{ marginBottom: "14px" }}>
      <h3 style={METRICS_SUBHEADING_STYLE}>{title}</h3>
      <div style={METRICS_GRID_STYLE}>{children}</div>
    </div>
  );
}

export default function AdminKeyMetrics({ stats, showMembership = true }) {
  return (
    <>
      {showMembership ? (
        <MetricsGroup title="Membership Metrics">
          <StatCard label="Active" value={stats.membership.active} />
          <StatCard label="Adult" value={stats.membership.adult} />
          <StatCard label="Family" value={stats.membership.family} />
          <StatCard label="Junior" value={stats.membership.junior} />
          <StatCard label="Non Member" value={stats.membership.nonMember} />
        </MetricsGroup>
      ) : null}

      <MetricsGroup title="Event Metrics">
        <StatCard label="Total Events" value={stats.events.total} />
        <StatCard label="Modern Track" value={stats.events.modern} />
        <StatCard label="Dirt Track" value={stats.events.dirt} />
        <StatCard label="Events Cancelled" value={stats.events.cancelled} />
        <StatCard label="Events Remaining" value={stats.events.remaining} />
      </MetricsGroup>

      <MetricsGroup title="Nomination Metrics">
        <StatCard label="Total Nominations" value={stats.nominations.totalYtd} />
        <StatCard label="Modern Track" value={stats.nominations.modernYtd} />
        <StatCard
          label="Modern Revenue"
          value={formatMetricsCurrency(stats.nominations.modernRevenue)}
        />
        <StatCard label="Dirt Track" value={stats.nominations.dirtYtd} />
        <StatCard
          label="Dirt Revenue"
          value={formatMetricsCurrency(stats.nominations.dirtRevenue)}
        />
      </MetricsGroup>
    </>
  );
}
