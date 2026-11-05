import { supabase } from "@/supabaseClient";
import { richTextToPlainText } from "@/app/lib/richText";

/** How far back the dashboard queries source tables (not a stored log). */
export const ADMIN_ACTIVITY_RETENTION_DAYS = 90;

export const ADMIN_ACTIVITY_DISPLAY_LIMIT = 30;

function sinceIso(days = ADMIN_ACTIVITY_RETENTION_DAYS) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

function membershipLabel(row) {
  const name = [row.primary_first_name, row.primary_last_name].filter(Boolean).join(" ").trim();
  return name || row.email || "Member";
}

function sortNewestFirst(items) {
  return items.sort(
    (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
  );
}

/**
 * Builds a recent-activity feed from club-scoped rows (memberships, nominations, drivers, events).
 * Nothing is persisted; older rows simply fall outside the retention window.
 */
export async function loadAdminRecentActivity(clubId) {
  if (!clubId) return { items: [], error: null };

  const since = sinceIso();
  const items = [];

  const { data: events, error: eventsErr } = await supabase
    .from("events")
    .select("id, name, is_published, track, created_at, updated_at")
    .eq("club_id", clubId);

  if (eventsErr) {
    return { items: [], error: eventsErr };
  }

  const eventList = events || [];
  const eventIds = eventList.map((event) => event.id);
  const eventNameById = new Map(
    eventList.map((event) => [event.id, richTextToPlainText(event.name) || "Event"])
  );

  const { data: memberships, error: membershipErr } = await supabase
    .from("household_memberships")
    .select(
      "id, email, primary_first_name, primary_last_name, membership_type, user_id, status, created_at, updated_at"
    )
    .eq("club_id", clubId)
    .or(`created_at.gte.${since},updated_at.gte.${since}`);

  if (membershipErr) {
    return { items: [], error: membershipErr };
  }

  (memberships || []).forEach((row) => {
    const created = row.created_at ? new Date(row.created_at).getTime() : 0;
    const updated = row.updated_at ? new Date(row.updated_at).getTime() : 0;
    const label = membershipLabel(row);
    const type = row.membership_type || "member";

    if (row.created_at && row.created_at >= since) {
      if (row.user_id && type === "non_member") {
        items.push({
          id: `signup-${row.id}`,
          kind: "signup",
          occurredAt: row.created_at,
          label,
          meta: { membershipType: type },
        });
      } else {
        items.push({
          id: `membership-new-${row.id}`,
          kind: "membership_new",
          occurredAt: row.created_at,
          label,
          meta: { membershipType: type },
        });
      }
    } else if (
      row.user_id &&
      row.updated_at &&
      row.updated_at >= since &&
      updated - created > 60_000
    ) {
      items.push({
        id: `account-linked-${row.id}-${row.updated_at}`,
        kind: "account_linked",
        occurredAt: row.updated_at,
        label,
        meta: { membershipType: type },
      });
    }
  });

  if (eventIds.length > 0) {
    const { data: nominations, error: nomErr } = await supabase
      .from("nominations")
      .select("id, event_id, group_id, created_at, status")
      .in("event_id", eventIds)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(80);

    if (nomErr) {
      return { items: [], error: nomErr };
    }

    const groupIds = [...new Set((nominations || []).map((row) => row.group_id).filter(Boolean))];
    let householdById = new Map();
    if (groupIds.length > 0) {
      const { data: groups } = await supabase
        .from("household_memberships")
        .select("id, email, primary_first_name, primary_last_name")
        .in("id", groupIds);
      householdById = new Map((groups || []).map((row) => [row.id, row]));
    }

    (nominations || []).forEach((row) => {
      const household = householdById.get(row.group_id);
      items.push({
        id: `nomination-${row.id}`,
        kind: "nomination",
        occurredAt: row.created_at,
        label: household ? membershipLabel(household) : "Household",
        meta: {
          eventName: eventNameById.get(row.event_id) || "Event",
          status: row.status,
        },
      });
    });
  }

  const { data: drivers, error: driversErr } = await supabase
    .from("drivers")
    .select("id, first_name, last_name, created_at")
    .eq("club_id", clubId)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(40);

  if (driversErr) {
    return { items: [], error: driversErr };
  }

  (drivers || []).forEach((row) => {
    items.push({
      id: `driver-${row.id}`,
      kind: "driver_added",
      occurredAt: row.created_at,
      label: [row.first_name, row.last_name].filter(Boolean).join(" ").trim() || "Driver",
      meta: {},
    });
  });

  eventList.forEach((event) => {
    const stamp = event.updated_at || event.created_at;
    if (!stamp || stamp < since) return;
    const created = event.created_at ? new Date(event.created_at).getTime() : 0;
    const updated = event.updated_at ? new Date(event.updated_at).getTime() : 0;
    if (updated - created <= 60_000 && event.created_at >= since) {
      items.push({
        id: `event-new-${event.id}`,
        kind: "event_created",
        occurredAt: event.created_at,
        label: richTextToPlainText(event.name) || "Event",
        meta: { published: !!event.is_published },
      });
      return;
    }
    if (event.updated_at && event.updated_at >= since) {
      items.push({
        id: `event-updated-${event.id}-${event.updated_at}`,
        kind: "event_updated",
        occurredAt: event.updated_at,
        label: richTextToPlainText(event.name) || "Event",
        meta: { published: !!event.is_published },
      });
    }
  });

  const deduped = [];
  const seen = new Set();
  sortNewestFirst(items).forEach((item) => {
    if (seen.has(item.id)) return;
    seen.add(item.id);
    deduped.push(item);
  });

  return {
    items: deduped.slice(0, ADMIN_ACTIVITY_DISPLAY_LIMIT),
    error: null,
  };
}
