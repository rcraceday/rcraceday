import { supabase } from "@/supabaseClient";
import { richTextToPlainText } from "@/app/lib/richText";
import { getEventAnchorDate } from "@app/pages/admin/adminDashboardMetrics";

function daysUntil(date) {
  if (!date) return null;
  const ms = new Date(date).getTime() - Date.now();
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

export async function loadAdminSystemNotices(clubId, clubSlug) {
  if (!clubId) return { notices: [], error: null };

  const notices = [];
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const { data: events, error: eventsErr } = await supabase
    .from("events")
    .select("id, name, event_date, days, is_published, track, nominations_open")
    .eq("club_id", clubId);

  if (eventsErr) {
    return { notices: [], error: eventsErr };
  }

  (events || []).forEach((event) => {
    const anchor = getEventAnchorDate(event);
    if (!anchor || anchor < todayStart) return;

    const eventName = richTextToPlainText(event.name) || "Untitled event";
    const editPath = `/${clubSlug}/app/admin/events/${event.id}`;

    if (!event.is_published) {
      notices.push({
        id: `unpublished-${event.id}`,
        severity: "warning",
        messageKey: "admin.dashboard.noticeUnpublishedEvent",
        messageParams: { name: eventName },
        to: editPath,
      });
    }

    if (!event.track) {
      notices.push({
        id: `no-track-${event.id}`,
        severity: "warning",
        messageKey: "admin.dashboard.noticeEventNoTrack",
        messageParams: { name: eventName },
        to: editPath,
      });
    }

    if (event.nominations_open) {
      const openAt = new Date(event.nominations_open);
      const days = daysUntil(openAt);
      if (days != null && days >= 0 && days <= 7 && !event.is_published) {
        notices.push({
          id: `noms-soon-${event.id}`,
          severity: "info",
          messageKey: "admin.dashboard.noticeNominationsSoon",
          messageParams: { name: eventName, days },
          to: editPath,
        });
      }
    }
  });

  const { data: memberships, error: membershipErr } = await supabase
    .from("household_memberships")
    .select("id, email, primary_first_name, primary_last_name, status, end_date, membership_type")
    .eq("club_id", clubId);

  if (membershipErr) {
    return { notices, error: membershipErr };
  }

  (memberships || []).forEach((row) => {
    const label =
      [row.primary_first_name, row.primary_last_name].filter(Boolean).join(" ").trim() ||
      row.email ||
      "Member";
    const editPath = `/${clubSlug}/app/admin/membership/${row.id}`;

    if ((row.status || "").toLowerCase() === "expired") {
      notices.push({
        id: `expired-${row.id}`,
        severity: "warning",
        messageKey: "admin.dashboard.noticeMembershipExpired",
        messageParams: { name: label },
        to: editPath,
      });
      return;
    }

    if (row.end_date) {
      const days = daysUntil(row.end_date);
      if (days != null && days >= 0 && days <= 30) {
        notices.push({
          id: `expiring-${row.id}`,
          severity: days <= 7 ? "warning" : "info",
          messageKey: "admin.dashboard.noticeMembershipExpiring",
          messageParams: { name: label, days },
          to: editPath,
        });
      }
    }
  });

  const { data: tracks, error: tracksErr } = await supabase
    .from("club_tracks")
    .select("id")
    .eq("club_id", clubId)
    .limit(1);

  if (!tracksErr && !(tracks || []).length) {
    notices.push({
      id: "no-tracks",
      severity: "warning",
      messageKey: "admin.dashboard.noticeNoTracks",
      messageParams: {},
      to: `/${clubSlug}/app/admin/settings/tracks-and-classes`,
    });
  }

  return { notices, error: null };
}
