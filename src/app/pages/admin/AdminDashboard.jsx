import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/supabaseClient";

import {
  CalendarDaysIcon,
  UserPlusIcon,
  IdentificationIcon,
  UserGroupIcon,
  Cog6ToothIcon,
} from "@heroicons/react/24/solid";

import { cmsStyles } from "@cms/styles";

function StatCard({ label, value }) {
  return (
    <div
      style={{
        backgroundColor: "#FFFFFF",
        borderRadius: "8px",
        border: "1px solid #E5E7EB",
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        gap: "4px",
      }}
    >
      <span
        style={{
          fontSize: "12px",
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          color: "#6B7280",
          fontWeight: 600,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: "22px",
          fontWeight: 700,
          color: "#111827",
        }}
      >
        {value}
      </span>
    </div>
  );
}

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

export default function AdminDashboard() {
  const { clubSlug } = useParams();
  const [stats, setStats] = useState({
    totalEvents: 0,
    upcomingEvents: 0,
    pendingNominations: 0,
    activeMembers: 0,
    drivers: 0,
  });

  useEffect(() => {
    async function loadMetrics() {
      const { data: club } = await supabase
        .from("clubs")
        .select("id")
        .eq("slug", clubSlug)
        .single();

      const clubId = club?.id || null;

      const [
        totalEventsRes,
        upcomingEventsRes,
        pendingNominationsRes,
        activeMembersRes,
        driversRes,
      ] = await Promise.all([
        supabase
          .from("events")
          .select("id", { count: "exact" })
          .eq("club_id", clubId),

        supabase
          .from("events")
          .select("id", { count: "exact" })
          .eq("club_id", clubId)
          .gte("event_date", new Date().toISOString()),

        supabase
          .from("nominations")
          .select("id", { count: "exact" })
          .eq("club_id", clubId)
          .eq("status", "pending"),

        supabase
          .from("club_members")
          .select("id", { count: "exact" }),

        supabase
          .from("drivers")
          .select("id", { count: "exact" }),
      ]);

      setStats({
        totalEvents: totalEventsRes.count || 0,
        upcomingEvents: upcomingEventsRes.count || 0,
        pendingNominations: pendingNominationsRes.count || 0,
        activeMembers: activeMembersRes.count || 0,
        drivers: driversRes.count || 0,
      });
    }

    loadMetrics();
  }, [clubSlug]);

  return (
    <div style={cmsStyles.pageContainer}>
      <div style={cmsStyles.pageContent}>

        {/* CANONICAL HEADER */}
        <div style={cmsStyles.sectionHeader}>
          <h1 style={cmsStyles.sectionHeaderTitle}>Admin Dashboard</h1>
          <p style={cmsStyles.sectionHeaderSubtitle}>
            Overview of events, nominations, membership, and drivers across your club.
          </p>
        </div>

        {/* KEY METRICS */}
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
            Key Metrics
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",   // ⭐ 3‑wide
              gap: "12px",
            }}
          >
            <StatCard label="Total Events" value={stats.totalEvents} />
            <StatCard label="Upcoming Events" value={stats.upcomingEvents} />
            <StatCard label="Pending Nominations" value={stats.pendingNominations} />
            <StatCard label="Active Members" value={stats.activeMembers} />
            <StatCard label="Drivers" value={stats.drivers} />
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
            Quick Actions
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "12px",
            }}
          >
            <QuickAction to="events" icon={CalendarDaysIcon} label="Manage Events" />
            <QuickAction to="nominations" icon={UserPlusIcon} label="Manage Nominations" />
            <QuickAction to="membership" icon={IdentificationIcon} label="Manage Membership" />
            <QuickAction to="drivers" icon={UserGroupIcon} label="Manage Drivers" />
            <QuickAction to="settings" icon={Cog6ToothIcon} label="Admin Settings" />
          </div>
        </section>

        {/* PANELS — ⭐ ADDED SPACING */}
        <section
          style={{
            marginTop: "24px",   // ⭐ FIX: proper breathing room
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
              Recent Activity
            </h3>
            <p
              style={{
                fontSize: "13px",
                color: "#6B7280",
              }}
            >
              Activity feed will appear here once wired to events, nominations, and membership changes.
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
              System Notices
            </h3>
            <p
              style={{
                fontSize: "13px",
                color: "#6B7280",
              }}
            >
              Warnings about unpublished events, missing configuration, or expiring memberships will appear here.
            </p>
          </div>
        </section>

      </div>
    </div>
  );
}
