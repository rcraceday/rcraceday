import { useTranslation } from "@/app/i18n/I18nContext";
import {
  formatMetricsCurrency,
  getCalendarYear,
} from "@app/pages/admin/adminDashboardMetrics";

function metricsStyles(compact) {
  return {
    subheading: {
      fontSize: compact ? "10px" : "12px",
      fontWeight: 600,
      textTransform: "uppercase",
      letterSpacing: compact ? "0.12em" : "0.14em",
      color: "#9CA3AF",
      margin: compact ? "0 0 3px" : "0 0 8px",
    },
    groupMargin: compact ? "0" : "14px",
    membershipGrid: {
      display: "grid",
      gridTemplateColumns: compact
        ? "repeat(auto-fit, minmax(88px, 1fr))"
        : "repeat(5, minmax(0, 1fr))",
      gap: compact ? "6px" : "8px",
      width: "100%",
      minWidth: 0,
    },
    driverGrid: {
      display: "grid",
      gridTemplateColumns: compact
        ? "repeat(auto-fit, minmax(88px, 1fr))"
        : "repeat(4, minmax(0, 1fr))",
      gap: compact ? "6px" : "8px",
      width: "100%",
      minWidth: 0,
    },
    defaultGrid: {
      display: "grid",
      gridTemplateColumns: compact
        ? "repeat(auto-fit, minmax(88px, 1fr))"
        : "repeat(5, minmax(0, 1fr))",
      gap: compact ? "6px" : "8px",
      width: "100%",
      minWidth: 0,
    },
    card: {
      backgroundColor: "#FFFFFF",
      borderRadius: compact ? "6px" : "8px",
      border: "1px solid #E5E7EB",
      padding: compact ? "6px 4px" : "10px 6px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      textAlign: "center",
      minHeight: compact ? "52px" : "80px",
      boxSizing: "border-box",
      minWidth: 0,
      width: "100%",
    },
    label: {
      fontSize: compact ? "8px" : "10px",
      textTransform: "uppercase",
      letterSpacing: "0.06em",
      color: "#6B7280",
      fontWeight: 600,
      lineHeight: 1.25,
      minHeight: compact ? "2.2em" : "2.7em",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      whiteSpace: "pre-line",
    },
    value: {
      fontSize: compact ? "14px" : "18px",
      fontWeight: 700,
      color: "#111827",
      marginTop: compact ? "4px" : "6px",
      lineHeight: 1.15,
    },
  };
}

function formatCompareDelta(current, previous, { currency = false } = {}) {
  if (previous == null || previous === undefined) return null;
  const cur = Number(current) || 0;
  const prev = Number(previous) || 0;
  if (currency) {
    const diff = cur - prev;
    if (diff === 0) return "±$0";
    const sign = diff > 0 ? "+" : "";
    return `${sign}${formatMetricsCurrency(diff)}`;
  }
  if (prev === 0) {
    if (cur === 0) return null;
    return `+${cur}`;
  }
  const pct = Math.round(((cur - prev) / prev) * 100);
  if (pct === 0) return "±0%";
  return `${pct > 0 ? "+" : ""}${pct}%`;
}

function StatCard({
  label,
  value,
  compact = false,
  compareNumber = null,
  compareCurrency = false,
  metricNumber = null,
}) {
  const s = metricsStyles(compact);
  const currentNumber = compareCurrency ? Number(metricNumber) || 0 : Number(value) || 0;
  const deltaLabel =
    compareNumber != null && compareNumber !== undefined
      ? formatCompareDelta(currentNumber, compareNumber, { currency: compareCurrency })
      : null;

  return (
    <div style={s.card}>
      <span style={s.label}>{label}</span>
      <span style={s.value}>{value}</span>
      {deltaLabel ? (
        <span
          style={{
            fontSize: compact ? "9px" : "10px",
            color: "#6B7280",
            marginTop: "2px",
            lineHeight: 1.2,
          }}
        >
          {deltaLabel}
        </span>
      ) : null}
    </div>
  );
}

function MetricsGroup({ title, children, gridStyle, compact = false }) {
  const s = metricsStyles(compact);
  return (
    <div style={{ marginBottom: s.groupMargin, width: "100%" }}>
      <h3 style={s.subheading}>{title}</h3>
      <div style={gridStyle}>{children}</div>
    </div>
  );
}

export default function AdminKeyMetrics({
  stats,
  showMembership = true,
  metricsYear = getCalendarYear(),
  compact = false,
  compareStats = null,
}) {
  const { t } = useTranslation();
  const s = metricsStyles(compact);
  const prev = compareStats;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: compact ? "2px" : undefined,
      }}
    >
      {showMembership ? (
        <>
          <MetricsGroup
            title={t("admin.metrics.membershipTitle")}
            gridStyle={s.membershipGrid}
            compact={compact}
          >
            <StatCard
              compact={compact}
              label={t("admin.metrics.totalMembers")}
              value={stats.membership.totalMembers}
            />
            <StatCard
              compact={compact}
              label={t("admin.metrics.adultMembers")}
              value={stats.membership.adult}
            />
            <StatCard
              compact={compact}
              label={t("admin.metrics.familyMembers")}
              value={stats.membership.family}
            />
            <StatCard
              compact={compact}
              label={t("admin.metrics.juniorMembers")}
              value={stats.membership.junior}
            />
            <StatCard
              compact={compact}
              label={t("admin.metrics.nonMember")}
              value={stats.membership.nonMember}
            />
          </MetricsGroup>

          <MetricsGroup
            title={t("admin.metrics.driverTitle")}
            gridStyle={s.driverGrid}
            compact={compact}
          >
            <StatCard compact={compact} label={t("admin.metrics.totalDrivers")} value={stats.drivers?.total ?? 0} />
            <StatCard compact={compact} label={t("admin.common.adult")} value={stats.drivers?.adult ?? 0} />
            <StatCard compact={compact} label={t("admin.common.junior")} value={stats.drivers?.junior ?? 0} />
            <StatCard compact={compact} label={t("admin.metrics.nonDrivers")} value={stats.drivers?.nonDrivers ?? 0} />
          </MetricsGroup>
        </>
      ) : null}

      <MetricsGroup title={t("admin.metrics.eventTitle")} gridStyle={s.defaultGrid} compact={compact}>
        <StatCard
          compact={compact}
          label={t("admin.metrics.eventsYear", { year: metricsYear })}
          value={stats.events.total}
          compareNumber={prev ? prev.events.total : null}
        />
        <StatCard
          compact={compact}
          label={t("admin.metrics.modern")}
          value={stats.events.modern}
          compareNumber={prev ? prev.events.modern : null}
        />
        <StatCard
          compact={compact}
          label={t("admin.metrics.dirt")}
          value={stats.events.dirt}
          compareNumber={prev ? prev.events.dirt : null}
        />
        <StatCard
          compact={compact}
          label={t("admin.metrics.cancelled")}
          value={stats.events.cancelled}
          compareNumber={prev ? prev.events.cancelled : null}
        />
        <StatCard
          compact={compact}
          label={t("admin.metrics.remaining")}
          value={stats.events.remaining}
          compareNumber={prev ? prev.events.remaining : null}
        />
      </MetricsGroup>

      <MetricsGroup title={t("admin.metrics.nominationTitle")} gridStyle={s.defaultGrid} compact={compact}>
        <StatCard
          compact={compact}
          label={t("admin.metrics.totalNominations")}
          value={stats.nominations.totalYtd}
          compareNumber={prev ? prev.nominations.totalYtd : null}
        />
        <StatCard
          compact={compact}
          label={t("admin.metrics.modernTrack")}
          value={stats.nominations.modernYtd}
          compareNumber={prev ? prev.nominations.modernYtd : null}
        />
        <StatCard
          compact={compact}
          label={t("admin.metrics.modernRevenue")}
          value={formatMetricsCurrency(stats.nominations.modernRevenue)}
          metricNumber={stats.nominations.modernRevenue}
          compareNumber={prev ? prev.nominations.modernRevenue : null}
          compareCurrency
        />
        <StatCard
          compact={compact}
          label={t("admin.metrics.dirtTrack")}
          value={stats.nominations.dirtYtd}
          compareNumber={prev ? prev.nominations.dirtYtd : null}
        />
        <StatCard
          compact={compact}
          label={t("admin.metrics.dirtRevenue")}
          value={formatMetricsCurrency(stats.nominations.dirtRevenue)}
          metricNumber={stats.nominations.dirtRevenue}
          compareNumber={prev ? prev.nominations.dirtRevenue : null}
          compareCurrency
        />
      </MetricsGroup>
    </div>
  );
}
