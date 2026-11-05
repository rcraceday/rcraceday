import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/supabaseClient";
import CMSButton from "@cms/CMSButton";
import { cmsStyles } from "@cms/styles";
import { useTranslation } from "@/app/i18n/I18nContext";
import AdminKeyMetrics from "@app/pages/admin/components/AdminKeyMetrics";
import AdminMetricsCharts from "@app/pages/admin/components/AdminMetricsCharts";
import {
  buildStatsForYear,
  emptyDashboardStats,
  getCalendarYear,
  listMetricsYears,
  loadClubMetricsContext,
  revenueByMonthFromNominations,
} from "@app/pages/admin/adminDashboardMetrics";

function nominationsByMonthFromRows(rows, year) {
  const counts = Array(12).fill(0);
  (rows || []).forEach((row) => {
    if (!row.created_at) return;
    const date = new Date(row.created_at);
    if (date.getFullYear() !== year) return;
    counts[date.getMonth()] += 1;
  });
  return counts;
}

export default function AdminMetrics() {
  const { t } = useTranslation();
  const { clubSlug } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentYear = getCalendarYear();

  const [metricsContext, setMetricsContext] = useState(null);
  const [stats, setStats] = useState(() => emptyDashboardStats());
  const [compareStats, setCompareStats] = useState(null);
  const [nominationsByMonth, setNominationsByMonth] = useState(() => Array(12).fill(0));
  const [compareNominationsByMonth, setCompareNominationsByMonth] = useState(() =>
    Array(12).fill(0)
  );
  const [revenueByMonth, setRevenueByMonth] = useState(() => Array(12).fill(0));
  const [compareRevenueByMonth, setCompareRevenueByMonth] = useState(() => Array(12).fill(0));
  const [loading, setLoading] = useState(true);

  const availableYears = useMemo(
    () =>
      metricsContext?.clubEvents
        ? listMetricsYears(metricsContext.clubEvents, currentYear)
        : [currentYear],
    [metricsContext, currentYear]
  );

  const selectedYear = useMemo(() => {
    const raw = searchParams.get("year");
    const parsed = raw ? Number.parseInt(raw, 10) : NaN;
    if (Number.isFinite(parsed) && availableYears.includes(parsed)) {
      return parsed;
    }
    return availableYears.includes(currentYear) ? currentYear : availableYears[0];
  }, [searchParams, availableYears, currentYear]);

  const compareYear = useMemo(() => {
    const prior = selectedYear - 1;
    return availableYears.includes(prior) ? prior : null;
  }, [availableYears, selectedYear]);

  useEffect(() => {
    if (!availableYears.length) return;
    const raw = searchParams.get("year");
    const parsed = raw ? Number.parseInt(raw, 10) : NaN;
    if (!Number.isFinite(parsed) || !availableYears.includes(parsed)) {
      const defaultYear = availableYears.includes(currentYear)
        ? currentYear
        : availableYears[0];
      setSearchParams({ year: String(defaultYear) }, { replace: true });
    }
  }, [availableYears, currentYear, searchParams, setSearchParams]);

  useEffect(() => {
    let cancelled = false;

    async function loadContext() {
      setLoading(true);
      const context = await loadClubMetricsContext(clubSlug);
      if (cancelled) return;
      if (context.error) {
        console.error("Failed to load metrics:", context.error);
        setMetricsContext(null);
        setLoading(false);
        return;
      }
      setMetricsContext(context);
    }

    loadContext();
    return () => {
      cancelled = true;
    };
  }, [clubSlug]);

  useEffect(() => {
    if (!metricsContext) return undefined;
    let cancelled = false;

    async function loadYearData() {
      setLoading(true);
      setStats(buildStatsForYear(metricsContext, selectedYear));
      setCompareStats(
        compareYear != null ? buildStatsForYear(metricsContext, compareYear) : null
      );

      const eventIds = (metricsContext.clubEvents || []).map((event) => event.id);
      if (eventIds.length === 0) {
        setNominationsByMonth(Array(12).fill(0));
        setCompareNominationsByMonth(Array(12).fill(0));
        setRevenueByMonth(Array(12).fill(0));
        setCompareRevenueByMonth(Array(12).fill(0));
        setLoading(false);
        return;
      }

      const yearsToLoad = compareYear != null ? [selectedYear, compareYear] : [selectedYear];
      const minYear = Math.min(...yearsToLoad);
      const maxYear = Math.max(...yearsToLoad);
      const rangeStart = `${minYear}-01-01T00:00:00.000Z`;
      const rangeEnd = `${maxYear + 1}-01-01T00:00:00.000Z`;

      const { data: nominationRows, error } = await supabase
        .from("nominations")
        .select("created_at, total_fee, paid, merchandise, driver_id")
        .in("event_id", eventIds)
        .gte("created_at", rangeStart)
        .lt("created_at", rangeEnd);

      if (cancelled) return;

      if (error) {
        console.error("Failed to load nomination trend:", error);
        setNominationsByMonth(Array(12).fill(0));
        setCompareNominationsByMonth(Array(12).fill(0));
        setRevenueByMonth(Array(12).fill(0));
        setCompareRevenueByMonth(Array(12).fill(0));
      } else {
        setNominationsByMonth(nominationsByMonthFromRows(nominationRows, selectedYear));
        setRevenueByMonth(revenueByMonthFromNominations(nominationRows, selectedYear));
        if (compareYear != null) {
          setCompareNominationsByMonth(nominationsByMonthFromRows(nominationRows, compareYear));
          setCompareRevenueByMonth(revenueByMonthFromNominations(nominationRows, compareYear));
        } else {
          setCompareNominationsByMonth(Array(12).fill(0));
          setCompareRevenueByMonth(Array(12).fill(0));
        }
      }

      setLoading(false);
    }

    loadYearData();
    return () => {
      cancelled = true;
    };
  }, [metricsContext, selectedYear, compareYear]);

  function handleYearChange(event) {
    const year = Number.parseInt(event.target.value, 10);
    if (Number.isFinite(year)) {
      setSearchParams({ year: String(year) });
    }
  }

  return (
    <div style={cmsStyles.pageContainer}>
      <div style={{ ...cmsStyles.pageContent, gap: "12px", padding: "12px 0 28px" }}>
        <div style={cmsStyles.sectionHeaderWithActions}>
          <header style={{ ...cmsStyles.sectionHeader, gap: "2px" }}>
            <h1 style={cmsStyles.sectionHeaderTitle}>{t("admin.metrics.pageTitle")}</h1>
            <p style={cmsStyles.sectionHeaderSubtitle}>{t("admin.metrics.pageSubtitle")}</p>
          </header>
          <CMSButton
            variant="secondary"
            onClick={() => navigate(`/${clubSlug}/app/admin`)}
          >
            ← Back
          </CMSButton>
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <label style={{ fontSize: "13px", color: "#374151", fontWeight: 500 }}>
            {t("admin.metrics.yearLabel")}
            <select
              value={selectedYear}
              onChange={handleYearChange}
              style={{
                marginLeft: "8px",
                padding: "6px 10px",
                borderRadius: "6px",
                border: "1px solid #D1D5DB",
                fontSize: "13px",
              }}
            >
              {availableYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </label>
          {compareYear != null ? (
            <span style={{ fontSize: "13px", color: "#6B7280" }}>
              {t("admin.metrics.comparedToYear", { year: compareYear })}
            </span>
          ) : (
            <span style={{ fontSize: "13px", color: "#6B7280" }}>
              {t("admin.metrics.noPriorYear")}
            </span>
          )}
        </div>

        {loading ? (
          <p style={{ fontSize: "14px", color: "#6B7280" }}>{t("loading.loading")}</p>
        ) : (
          <>
            <AdminKeyMetrics
              stats={stats}
              metricsYear={selectedYear}
              compact
              compareStats={compareStats}
            />
            <AdminMetricsCharts
              stats={stats}
              compareStats={compareStats}
              nominationsByMonth={nominationsByMonth}
              compareNominationsByMonth={compareNominationsByMonth}
              revenueByMonth={revenueByMonth}
              compareRevenueByMonth={compareRevenueByMonth}
              metricsYear={selectedYear}
              compareYear={compareYear}
            />
          </>
        )}
      </div>
    </div>
  );
}
