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

function CurrentNominationsPanel({ events, totalCount }) {
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
          Current Nominations
        </span>
        <span style={{ fontSize: "14px", fontWeight: 600, color: "#111827" }}>
          {totalCount} total
        </span>
      </div>
      {events.length === 0 ? (
        <p style={{ fontSize: "13px", color: "#6B7280", margin: 0 }}>
          No nominations yet for upcoming events.
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
              <span style={{ fontSize: "14px", fontWeight: 500, color: "#111827" }}>{event.name}</span>
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
  const { clubSlug } = useParams();

  const [stats, setStats] = useState({
    totalEvents: 0,
    upcomingEvents: 0,
    activeMembers: 0,
    drivers: 0,
  });
  const [nominationsByEvent, setNominationsByEvent] = useState([]);

  useEffect(() => {
    async function loadMetrics() {
      // Load club ID first
      const { data: club, error: clubErr } = await supabase
        .from("clubs")
        .select("id")
        .eq("slug", clubSlug)
        .single();

      if (clubErr || !club?.id) {
        console.error("Failed to load club:", clubErr);
        return;
      }

      const clubId = club.id;

      // Fetch all metrics safely
      const nowIso = new Date().toISOString();

      const [
        totalEventsRes,
        upcomingEventsRes,
        activeMembersRes,
        driversRes,
      ] = await Promise.all([
        supabase
          .from("events")
          .select("id", { count: "exact" })
          .eq("club_id", clubId),

        supabase
          .from("events")
          .select("id, name, event_date")
          .eq("club_id", clubId)
          .gte("event_date", nowIso)
          .order("event_date", { ascending: true }),

        supabase
          .from("club_members")
          .select("id", { count: "exact" }),

        supabase
          .from("drivers")
          .select("id", { count: "exact" }),
      ]);

      const upcomingEvents = upcomingEventsRes.data || [];
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
          name: event.name || "Untitled event",
          nominationCount: nominationCounts[event.id],
        }));

      setNominationsByEvent(eventsWithNominations);
      setStats({
        totalEvents: totalEventsRes.count || 0,
        upcomingEvents: upcomingEventIds.length,
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
              gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 160px), 1fr))",
              gap: "12px",
              width: "100%",
              minWidth: 0,
            }}
          >
            <StatCard label="Total Events" value={stats.totalEvents} />
            <StatCard label="Upcoming Events" value={stats.upcomingEvents} />
            <StatCard label="Drivers" value={stats.drivers} />
            <StatCard label="Active Members" value={stats.activeMembers} />
          </div>

          <div style={{ width: "100%", marginTop: "12px" }}>
            <CurrentNominationsPanel
              events={nominationsByEvent}
              totalCount={nominationsByEvent.reduce((sum, event) => sum + event.nominationCount, 0)}
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
