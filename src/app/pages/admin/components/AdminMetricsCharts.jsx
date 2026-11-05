import { useTranslation } from "@/app/i18n/I18nContext";
import { formatMetricsCurrency } from "@app/pages/admin/adminDashboardMetrics";

function BarChart({
  title,
  labels,
  values,
  valueFormatter = (v) => v,
  valueColumnWidth = 40,
  compact = false,
}) {
  const max = Math.max(1, ...values);

  return (
    <div
      style={{
        backgroundColor: "#FFFFFF",
        borderRadius: "8px",
        border: "1px solid #E5E7EB",
        padding: compact ? "12px" : "16px",
      }}
    >
      <h3
        style={{
          fontSize: compact ? "11px" : "13px",
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          color: "#6B7280",
          margin: "0 0 10px",
        }}
      >
        {title}
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: compact ? "6px" : "8px" }}>
        {labels.map((label, index) => {
          const value = values[index] || 0;
          const width = `${Math.round((value / max) * 100)}%`;
          return (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span
                style={{
                  width: compact ? "56px" : "72px",
                  flexShrink: 0,
                  fontSize: compact ? "11px" : "12px",
                  color: "#4B5563",
                }}
              >
                {label}
              </span>
              <div
                style={{
                  flex: 1,
                  height: compact ? "18px" : "22px",
                  backgroundColor: "#F3F4F6",
                  borderRadius: "4px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width,
                    minWidth: value > 0 ? "4px" : 0,
                    height: "100%",
                    backgroundColor: "#DC2626",
                    borderRadius: "4px",
                    transition: "width 0.2s ease",
                  }}
                />
              </div>
              <span
                style={{
                  width: `${valueColumnWidth}px`,
                  flexShrink: 0,
                  textAlign: "right",
                  fontSize: compact ? "10px" : "12px",
                  fontWeight: 600,
                  color: "#111827",
                }}
              >
                {valueFormatter(value)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DualMonthBarChart({
  title,
  monthLabels,
  valuesA,
  valuesB,
  yearA,
  yearB,
  valueFormatter = (v) => v,
  valueColumnWidth = 48,
  compact = false,
}) {
  const max = Math.max(1, ...valuesA, ...valuesB);

  return (
    <div
      style={{
        backgroundColor: "#FFFFFF",
        borderRadius: "8px",
        border: "1px solid #E5E7EB",
        padding: compact ? "12px" : "16px",
        gridColumn: "1 / -1",
      }}
    >
      <h3
        style={{
          fontSize: compact ? "11px" : "13px",
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          color: "#6B7280",
          margin: "0 0 8px",
        }}
      >
        {title}
      </h3>
      <div
        style={{
          display: "flex",
          gap: "16px",
          fontSize: "11px",
          color: "#6B7280",
          marginBottom: "8px",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span
            style={{
              width: "10px",
              height: "10px",
              borderRadius: "2px",
              backgroundColor: "#DC2626",
              display: "inline-block",
            }}
          />
          {yearA}
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span
            style={{
              width: "10px",
              height: "10px",
              borderRadius: "2px",
              backgroundColor: "#93C5FD",
              display: "inline-block",
            }}
          />
          {yearB}
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: compact ? "6px" : "8px" }}>
        {monthLabels.map((label, index) => {
          const a = valuesA[index] || 0;
          const b = valuesB[index] || 0;
          return (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span
                style={{
                  width: compact ? "56px" : "72px",
                  flexShrink: 0,
                  fontSize: compact ? "11px" : "12px",
                  color: "#4B5563",
                }}
              >
                {label}
              </span>
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  gap: "3px",
                }}
              >
                <div
                  style={{
                    height: compact ? "7px" : "8px",
                    backgroundColor: "#F3F4F6",
                    borderRadius: "3px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${Math.round((a / max) * 100)}%`,
                      minWidth: a > 0 ? "2px" : 0,
                      height: "100%",
                      backgroundColor: "#DC2626",
                    }}
                  />
                </div>
                <div
                  style={{
                    height: compact ? "7px" : "8px",
                    backgroundColor: "#F3F4F6",
                    borderRadius: "3px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${Math.round((b / max) * 100)}%`,
                      minWidth: b > 0 ? "2px" : 0,
                      height: "100%",
                      backgroundColor: "#93C5FD",
                    }}
                  />
                </div>
              </div>
              <span
                style={{
                  width: `${valueColumnWidth}px`,
                  flexShrink: 0,
                  textAlign: "right",
                  fontSize: compact ? "9px" : "10px",
                  fontWeight: 600,
                  color: "#111827",
                  lineHeight: 1.35,
                }}
              >
                {valueFormatter(a)}
                <br />
                <span style={{ color: "#6B7280", fontWeight: 500 }}>{valueFormatter(b)}</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const MONTH_KEYS = [
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec",
];

export default function AdminMetricsCharts({
  stats,
  compareStats,
  nominationsByMonth,
  compareNominationsByMonth,
  revenueByMonth,
  compareRevenueByMonth,
  metricsYear,
  compareYear,
}) {
  const { t } = useTranslation();
  const compact = true;

  const monthLabels = MONTH_KEYS.map((key) => t(`admin.metrics.monthShort.${key}`));

  const membershipValues = [
    stats.membership?.adult ?? 0,
    stats.membership?.family ?? 0,
    stats.membership?.junior ?? 0,
    stats.membership?.nonMember ?? 0,
  ];

  const membershipLabels = [
    t("admin.metrics.adultMembers"),
    t("admin.metrics.familyMembers"),
    t("admin.metrics.juniorMembers"),
    t("admin.metrics.nonMember"),
  ];

  const eventValues = [
    stats.events?.modern ?? 0,
    stats.events?.dirt ?? 0,
    stats.events?.cancelled ?? 0,
    stats.events?.remaining ?? 0,
  ];

  const eventCompareValues = compareStats
    ? [
        compareStats.events?.modern ?? 0,
        compareStats.events?.dirt ?? 0,
        compareStats.events?.cancelled ?? 0,
        compareStats.events?.remaining ?? 0,
      ]
    : null;

  const eventLabels = [
    t("admin.metrics.modern"),
    t("admin.metrics.dirt"),
    t("admin.metrics.cancelled"),
    t("admin.metrics.remaining"),
  ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
        gap: "12px",
        marginTop: "8px",
      }}
    >
      <BarChart
        compact={compact}
        title={t("admin.metrics.chartMembershipMix")}
        labels={membershipLabels}
        values={membershipValues}
      />
      <BarChart
        compact={compact}
        title={t("admin.metrics.chartEventsYear", { year: metricsYear })}
        labels={eventLabels}
        values={eventValues}
      />
      {compareStats && eventCompareValues ? (
        <BarChart
          compact={compact}
          title={t("admin.metrics.chartEventsCompare", { year: compareYear })}
          labels={eventLabels}
          values={eventCompareValues}
        />
      ) : null}
      {compareYear != null ? (
        <>
          <DualMonthBarChart
            compact={compact}
            title={t("admin.metrics.chartNominationsCompare", {
              yearA: metricsYear,
              yearB: compareYear,
            })}
            monthLabels={monthLabels}
            valuesA={nominationsByMonth}
            valuesB={compareNominationsByMonth}
            yearA={metricsYear}
            yearB={compareYear}
          />
          <DualMonthBarChart
            compact={compact}
            title={t("admin.metrics.chartRevenueCompare", {
              yearA: metricsYear,
              yearB: compareYear,
            })}
            monthLabels={monthLabels}
            valuesA={revenueByMonth || Array(12).fill(0)}
            valuesB={compareRevenueByMonth || Array(12).fill(0)}
            yearA={metricsYear}
            yearB={compareYear}
            valueFormatter={(value) => formatMetricsCurrency(value)}
            valueColumnWidth={56}
          />
        </>
      ) : (
        <>
          <BarChart
            compact={compact}
            title={t("admin.metrics.chartNominationsByMonth", { year: metricsYear })}
            labels={monthLabels}
            values={nominationsByMonth}
          />
          <BarChart
            compact={compact}
            title={t("admin.metrics.chartRevenueByMonth", { year: metricsYear })}
            labels={monthLabels}
            values={revenueByMonth || Array(12).fill(0)}
            valueFormatter={(value) => formatMetricsCurrency(value)}
            valueColumnWidth={52}
          />
        </>
      )}
    </div>
  );
}
