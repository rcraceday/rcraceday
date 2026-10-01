import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/supabaseClient";

import {
  CalendarDaysIcon,
  UserPlusIcon,
  IdentificationIcon,
  UserGroupIcon,
  Cog6ToothIcon,
  ArchiveBoxIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/solid";

import { useTranslation } from "@/app/i18n/I18nContext";
import { cmsStyles } from "@cms/styles";
import { richTextToPlainText } from "@/app/lib/richText";
import AdminKeyMetrics from "@app/pages/admin/components/AdminKeyMetrics";
import {
  buildStatsForYear,
  emptyDashboardStats,
  getCalendarYear,
  loadClubMetricsContext,
} from "@app/pages/admin/adminDashboardMetrics";

function QuickAction({ to, icon: Icon, label }) {
  const content = (
    <div
      style={{
        backgroundColor: "#FFFFFF",
        borderRadius: "8px",
        border: "1px solid #E5E7EB",
        padding: "14px 16px",
        display: "flex",
        alignItems: "center",
        gap: "10px",
        cursor: "pointer",
        transition: "background-color 0.15s ease",
      }}
    >
      <Icon
        style={{
          width: "18px",
          height: "18px",
          color: "#4B5563",
        }}
      />
      <span
        style={{
          fontSize: "14px",
          fontWeight: 500,
          color: "#111827",
        }}
      >
        {label}
      </span>
    </div>
  );

  if (to) {
    return (
      <Link to={to} style={{ textDecoration: "none" }}>
        {content}
      </Link>
    );
  }

  return content;
}

function CurrentNominationsPanel({ events, totalCount, t }) {
  return (
    <div
      style={{
        width: "100%",
        backgroundColor: "#FFFFFF",
        borderRadius: "8px",
        border: "1px solid #E5E7EB",
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        boxSizing: "border-box",
      }}
    >
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", justifyContent: "space-between", gap: "8px" }}>
        <span
          style={{
            fontSize: "12px",
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            color: "#6B7280",
            fontWeight: 600,
          }}
        >
          {t("admin.dashboard.currentNominations")}
        </span>
        <span style={{ fontSize: "14px", fontWeight: 600, color: "#111827" }}>
          {t("admin.dashboard.totalCount", { count: totalCount })}
        </span>
      </div>
      {events.length === 0 ? (
        <p style={{ fontSize: "13px", color: "#6B7280", margin: 0 }}>
          {t("admin.dashboard.noNominationsUpcoming")}
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
            width: "100%",
          }}
        >
          {events.map((event) => (
            <li
              key={event.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px",
                padding: "10px 12px",
                borderRadius: "6px",
                backgroundColor: "#F9FAFB",
                border: "1px solid #E5E7EB",
              }}
            >
              <span style={{ fontSize: "14px", fontWeight: 500, color: "#111827" }}>
                {richTextToPlainText(event.name)}
              </span>
              <span style={{ fontSize: "14px", fontWeight: 700, color: "#111827", whiteSpace: "nowrap" }}>
                {event.nominationCount}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  const { t } = useTranslation();
  const { clubSlug } = useParams();
  const metricsYear = getCalendarYear();

  const [stats, setStats] = useState(() => emptyDashboardStats());
  const [nominationsByEvent, setNominationsByEvent] = useState([]);
  const [keyMetricsExpanded, setKeyMetricsExpanded] = useState(true);

  useEffect(() => {
    async function loadMetrics() {
      const context = await loadClubMetricsContext(clubSlug);
      if (context.error) {
        console.error("Failed to load club:", context.error);
        return;
      }

      setStats(buildStatsForYear(context, metricsYear));

      const upcomingEvents = context.upcomingEvents || [];
      const upcomingEventIds = upcomingEvents.map((event) => event.id);

      const nominationCounts = {};
      if (upcomingEventIds.length > 0) {
        const { data: nominationRows } = await supabase
          .from("nominations")
          .select("event_id")
          .in("event_id", upcomingEventIds);
        (nominationRows || []).forEach((row) => {
          nominationCounts[row.event_id] = (nominationCounts[row.event_id] || 0) + 1;
        });
      }

      const eventsWithNominations = upcomingEvents
        .filter((event) => nominationCounts[event.id] > 0)
        .map((event) => ({
          id: event.id,
          name: richTextToPlainText(event.name) || t("admin.dashboard.untitledEvent"),
          nominationCount: nominationCounts[event.id],
        }));

      setNominationsByEvent(eventsWithNominations);
    }

    loadMetrics();
  }, [clubSlug, metricsYear]);

  return (
    <div style={cmsStyles.pageContainer}>
      <div style={cmsStyles.pageContent}>

        {/* CANONICAL HEADER */}
        <div style={cmsStyles.sectionHeader}>
          <h1 style={cmsStyles.sectionHeaderTitle}>{t("admin.dashboard.title")}</h1>
          <p style={cmsStyles.sectionHeaderSubtitle}>{t("admin.dashboard.subtitle")}</p>
        </div>

        {/* KEY METRICS */}
        <section>
          <button
            type="button"
            onClick={() => setKeyMetricsExpanded((open) => !open)}
            aria-expanded={keyMetricsExpanded}
            aria-label={
              keyMetricsExpanded
                ? t("admin.dashboard.keyMetricsHide")
                : t("admin.dashboard.keyMetricsShow")
            }
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              margin: "0 0 10px",
              padding: 0,
              border: "none",
              background: "none",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.16em",
              color: "#6B7280",
              textAlign: "left",
            }}
          >
            {keyMetricsExpanded ? (
              <ChevronDownIcon
                style={{ width: "16px", height: "16px", flexShrink: 0, color: "#DC2626" }}
              />
            ) : (
              <ChevronRightIcon
                style={{ width: "16px", height: "16px", flexShrink: 0, color: "#DC2626" }}
              />
            )}
            {t("admin.dashboard.keyMetrics", { year: metricsYear })}
          </button>

          {keyMetricsExpanded ? (
            <>
              <p
                style={{
                  fontSize: "13px",
                  color: "#6B7280",
                  margin: "0 0 12px",
                  lineHeight: 1.5,
                }}
              >
                {t("admin.dashboard.keyMetricsNote", { year: metricsYear })}
              </p>

              <AdminKeyMetrics stats={stats} metricsYear={metricsYear} />
            </>
          ) : null}

          <div style={{ width: "100%", marginTop: keyMetricsExpanded ? "12px" : 0 }}>
            <CurrentNominationsPanel
              events={nominationsByEvent}
              totalCount={nominationsByEvent.reduce((sum, event) => sum + event.nominationCount, 0)}
              t={t}
            />
          </div>
        </section>

        {/* QUICK ACTIONS */}
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
            {t("admin.dashboard.quickActions")}
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "12px",
            }}
          >
            <QuickAction to="events" icon={CalendarDaysIcon} label={t("admin.dashboard.manageEvents")} />
            <QuickAction to="nominations" icon={UserPlusIcon} label={t("admin.dashboard.manageNominations")} />
            <QuickAction to="membership" icon={IdentificationIcon} label={t("admin.dashboard.manageMembership")} />
            <QuickAction to="drivers" icon={UserGroupIcon} label={t("admin.dashboard.manageDrivers")} />
            <QuickAction to="settings" icon={Cog6ToothIcon} label={t("admin.dashboard.adminSettings")} />
            <QuickAction to="archives" icon={ArchiveBoxIcon} label={t("admin.dashboard.archives")} />
          </div>
        </section>

        {/* PANELS */}
        <section
          style={{
            marginTop: "24px",
            display: "grid",
            gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1.4fr)",
            gap: "16px",
          }}
        >
          <div
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: "8px",
              border: "1px solid #E5E7EB",
              padding: "16px",
            }}
          >
            <h3
              style={{
                fontSize: "14px",
                fontWeight: 600,
                marginBottom: "6px",
                color: "#111827",
              }}
            >
              {t("admin.dashboard.recentActivity")}
            </h3>
            <p
              style={{
                fontSize: "13px",
                color: "#6B7280",
              }}
            >
              {t("admin.dashboard.recentActivityBody")}
            </p>
          </div>

          <div
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: "8px",
              border: "1px solid #E5E7EB",
              padding: "16px",
            }}
          >
            <h3
              style={{
                fontSize: "14px",
                fontWeight: 600,
                marginBottom: "6px",
                color: "#111827",
              }}
            >
              {t("admin.dashboard.systemNotices")}
            </h3>
            <p
              style={{
                fontSize: "13px",
                color: "#6B7280",
              }}
            >
              {t("admin.dashboard.systemNoticesBody")}
            </p>
          </div>
        </section>

      </div>
    </div>
  );
}
