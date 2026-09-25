import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { cmsStyles } from "@cms/styles";
import AdminKeyMetrics from "@app/pages/admin/components/AdminKeyMetrics";
import {
  buildStatsForYear,
  emptyDashboardStats,
  getCalendarYear,
  listArchiveYears,
  loadClubMetricsContext,
} from "@app/pages/admin/adminDashboardMetrics";

export default function AdminMetricsArchives() {
  const { clubSlug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentYear = getCalendarYear();

  const [archiveYears, setArchiveYears] = useState([]);
  const [metricsContext, setMetricsContext] = useState(null);
  const [stats, setStats] = useState(emptyDashboardStats());
  const [loading, setLoading] = useState(true);

  const selectedYear = useMemo(() => {
    const raw = searchParams.get("year");
    const parsed = raw ? Number.parseInt(raw, 10) : NaN;
    if (Number.isFinite(parsed) && parsed < currentYear && archiveYears.includes(parsed)) {
      return parsed;
    }
    return archiveYears[0] ?? null;
  }, [searchParams, archiveYears, currentYear]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const context = await loadClubMetricsContext(clubSlug);
      if (cancelled) return;

      if (context.error) {
        console.error("Failed to load archives:", context.error);
        setArchiveYears([]);
        setMetricsContext(null);
        setStats(emptyDashboardStats());
        setLoading(false);
        return;
      }

      const years = listArchiveYears(context.clubEvents, currentYear);
      setArchiveYears(years);
      setMetricsContext(context);
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [clubSlug, currentYear]);

  useEffect(() => {
    if (!archiveYears.length) return;
    const raw = searchParams.get("year");
    const parsed = raw ? Number.parseInt(raw, 10) : NaN;
    if (!Number.isFinite(parsed) || !archiveYears.includes(parsed)) {
      setSearchParams({ year: String(archiveYears[0]) }, { replace: true });
    }
  }, [archiveYears, searchParams, setSearchParams]);

  useEffect(() => {
    if (!metricsContext || selectedYear == null) {
      setStats(emptyDashboardStats());
      return;
    }
    setStats(buildStatsForYear(metricsContext, selectedYear));
  }, [metricsContext, selectedYear]);

  function handleYearChange(event) {
    const year = Number.parseInt(event.target.value, 10);
    if (!Number.isFinite(year)) return;
    setSearchParams({ year: String(year) });
  }

  return (
    <div style={cmsStyles.pageContainer}>
      <div style={cmsStyles.pageContent}>
        <div style={cmsStyles.sectionHeader}>
          <h1 style={cmsStyles.sectionHeaderTitle}>Metrics Archives</h1>
          <p style={cmsStyles.sectionHeaderSubtitle}>
            Event and nomination metrics for prior calendar years. The dashboard shows the current year only and resets each 1 January.
          </p>
        </div>

        <p style={{ fontSize: "13px", color: "#6B7280", margin: "0 0 16px" }}>
          <Link
            to={`/${clubSlug}/app/admin`}
            style={{ color: "#2563EB", textDecoration: "none", fontWeight: 500 }}
          >
            Back to dashboard
          </Link>
        </p>

        {loading ? (
          <p style={{ fontSize: "13px", color: "#6B7280" }}>Loading archives…</p>
        ) : archiveYears.length === 0 ? (
          <p style={{ fontSize: "13px", color: "#6B7280", margin: 0 }}>
            No prior calendar years are available yet. Metrics will appear here after the first 1 January rollover.
          </p>
        ) : (
          <>
            <label
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "6px",
                marginBottom: "16px",
                maxWidth: "220px",
              }}
            >
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                  color: "#6B7280",
                }}
              >
                Calendar year
              </span>
              <select
                value={selectedYear ?? ""}
                onChange={handleYearChange}
                style={{
                  borderRadius: "8px",
                  border: "1px solid #E5E7EB",
                  padding: "8px 10px",
                  fontSize: "14px",
                  backgroundColor: "#FFFFFF",
                }}
              >
                {archiveYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </label>

            <p style={{ fontSize: "13px", color: "#6B7280", margin: "0 0 12px" }}>
              Figures for {selectedYear}. Membership counts are not stored by year and are omitted from archives.
            </p>

            <section>
              <h2
                style={{
                  fontSize: "13px",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.16em",
                  color: "#6B7280",
                  marginBottom: "10px",
                }}
              >
                {selectedYear} Metrics
              </h2>
              <AdminKeyMetrics stats={stats} showMembership={false} />
            </section>
          </>
        )}
      </div>
    </div>
  );
}
