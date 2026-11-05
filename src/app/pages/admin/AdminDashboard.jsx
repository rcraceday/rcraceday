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
  ChartBarIcon,
  NewspaperIcon,
  ChatBubbleLeftRightIcon,
} from "@heroicons/react/24/solid";

import { useTranslation } from "@/app/i18n/I18nContext";
import { useClub } from "@/app/providers/ClubProvider";
import { useClubMessageUnreadCount } from "@/app/hooks/useClubMessageUnreadCount";
import { cmsStyles } from "@cms/styles";
import { richTextToPlainText } from "@/app/lib/richText";
import { loadAdminRecentActivity } from "@/app/lib/adminDashboardActivity";
import { loadAdminSystemNotices } from "@/app/lib/adminDashboardNotices";
import AdminRecentActivityPanel from "@app/pages/admin/components/AdminRecentActivityPanel";
import AdminSystemNoticesPanel from "@app/pages/admin/components/AdminSystemNoticesPanel";
import {
  getCalendarYear,
  loadClubMetricsContext,
} from "@app/pages/admin/adminDashboardMetrics";

const DASHBOARD_SECTION_GAP = "12px";

const sectionHeadingStyle = {
  fontSize: "12px",
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.12em",
  color: "#6B7280",
  margin: 0,
};

function QuickAction({ to, icon: Icon, label, badge = 0 }) {
  const content = (
    <div
      style={{
        backgroundColor: "#FFFFFF",
        borderRadius: "8px",
        border: "1px solid #E5E7EB",
        padding: "12px 14px",
        display: "flex",
        alignItems: "center",
        gap: "10px",
        cursor: "pointer",
        transition: "background-color 0.15s ease",
        position: "relative",
      }}
    >
      <Icon
        style={{
          width: "18px",
          height: "18px",
          color: "var(--admin-accent, #c20a0a)",
          flexShrink: 0,
        }}
      />
      <span
        style={{
          fontSize: "14px",
          fontWeight: 500,
          color: "#111827",
          flex: 1,
        }}
      >
        {label}
      </span>
      {badge > 0 ? (
        <span
          style={{
            minWidth: "20px",
            height: "20px",
            padding: "0 6px",
            borderRadius: "999px",
            backgroundColor: "#DC2626",
            color: "#FFFFFF",
            fontSize: "11px",
            fontWeight: 700,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {badge > 99 ? "99+" : badge}
        </span>
      ) : null}
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
        padding: "14px",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        boxSizing: "border-box",
      }}
    >
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", justifyContent: "space-between", gap: "8px" }}>
        <span
          style={{
            ...sectionHeadingStyle,
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
  const { club } = useClub();
  const metricsYear = getCalendarYear();
  const { unreadCount: unreadMessages } = useClubMessageUnreadCount({
    clubId: club?.id,
    audience: "admin",
  });

  const [nominationsByEvent, setNominationsByEvent] = useState([]);
  const [activityItems, setActivityItems] = useState([]);
  const [systemNotices, setSystemNotices] = useState([]);
  const [panelsLoading, setPanelsLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      setPanelsLoading(true);
      const context = await loadClubMetricsContext(clubSlug);
      if (context.error) {
        console.error("Failed to load club:", context.error);
        setPanelsLoading(false);
        return;
      }

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

      const [activityResult, noticesResult] = await Promise.all([
        loadAdminRecentActivity(context.clubId),
        loadAdminSystemNotices(context.clubId, clubSlug),
      ]);

      if (activityResult.error) {
        console.error("Failed to load activity:", activityResult.error);
      }
      if (noticesResult.error) {
        console.error("Failed to load notices:", noticesResult.error);
      }

      setActivityItems(activityResult.items || []);
      setSystemNotices(noticesResult.notices || []);
      setPanelsLoading(false);
    }

    loadDashboard();
  }, [clubSlug, t]);

  return (
    <div style={cmsStyles.pageContainer}>
      <div style={{ ...cmsStyles.pageContent, gap: DASHBOARD_SECTION_GAP, padding: "12px 0 28px" }}>

        <div style={{ ...cmsStyles.sectionHeader, gap: "2px" }}>
          <h1 style={cmsStyles.sectionHeaderTitle}>{t("admin.dashboard.title")}</h1>
          <p style={cmsStyles.sectionHeaderSubtitle}>{t("admin.dashboard.subtitle")}</p>
        </div>

        <section
          style={{
            display: "flex",
            flexDirection: "column",
            gap: DASHBOARD_SECTION_GAP,
          }}
        >
          <Link
            to={`/${clubSlug}/app/admin/metrics`}
            style={{ textDecoration: "none" }}
          >
            <div
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: "8px",
                border: "1px solid #E5E7EB",
                padding: "12px 14px",
                display: "flex",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <ChartBarIcon style={{ width: "20px", height: "20px", color: "var(--admin-accent, #c20a0a)", flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: "14px", fontWeight: 600, color: "#111827" }}>
                  {t("admin.dashboard.keyMetricsLinkTitle", { year: metricsYear })}
                </div>
                <div style={{ fontSize: "12px", color: "#6B7280", marginTop: "2px" }}>
                  {t("admin.dashboard.keyMetricsLinkBody")}
                </div>
              </div>
            </div>
          </Link>

          <CurrentNominationsPanel
            events={nominationsByEvent}
            totalCount={nominationsByEvent.reduce((sum, event) => sum + event.nominationCount, 0)}
            t={t}
          />

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <h2 style={sectionHeadingStyle}>{t("admin.dashboard.quickActions")}</h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: DASHBOARD_SECTION_GAP,
              }}
            >
              <QuickAction to="events" icon={CalendarDaysIcon} label={t("admin.dashboard.manageEvents")} />
              <QuickAction to="nominations" icon={UserPlusIcon} label={t("admin.dashboard.manageNominations")} />
              <QuickAction to="membership" icon={IdentificationIcon} label={t("admin.dashboard.manageMembership")} />
              <QuickAction to="drivers" icon={UserGroupIcon} label={t("admin.dashboard.manageDrivers")} />
              <QuickAction to="news" icon={NewspaperIcon} label={t("admin.dashboard.manageNews")} />
              <QuickAction
                to="messages"
                icon={ChatBubbleLeftRightIcon}
                label={t("admin.dashboard.manageMessages")}
                badge={unreadMessages}
              />
              <QuickAction to="settings" icon={Cog6ToothIcon} label={t("admin.dashboard.adminSettings")} />
              <QuickAction to="metrics" icon={ChartBarIcon} label={t("admin.dashboard.keyMetricsLinkShort")} />
              <QuickAction to="archives" icon={ArchiveBoxIcon} label={t("admin.dashboard.archives")} />
            </div>
          </div>
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1.4fr)",
            gap: DASHBOARD_SECTION_GAP,
          }}
        >
          <AdminRecentActivityPanel items={activityItems} loading={panelsLoading} />
          <AdminSystemNoticesPanel notices={systemNotices} loading={panelsLoading} />
        </section>

      </div>
    </div>
  );
}
