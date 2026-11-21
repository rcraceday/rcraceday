import { supabase } from "@/supabaseClient";

export const CLUB_MESSAGES_INBOX_CHANGED = "rcraceday:club-messages-inbox-changed";

export function notifyClubMessagesInboxChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(CLUB_MESSAGES_INBOX_CHANGED));
  }
}

const MESSAGE_SELECT =
  "id, club_id, membership_id, event_id, body, sender_role, sender_user_id, created_at, read_by_member_at, read_by_admin_at, archived_by_member_at, archived_by_admin_at";

const MESSAGE_SELECT_LEGACY =
  "id, club_id, membership_id, event_id, body, sender_role, sender_user_id, created_at, read_by_member_at, read_by_admin_at";

function isMissingArchiveColumnError(error) {
  const message = String(error?.message || "");
  return /archived_by_|42703|column/i.test(message);
}

function archiveColumnForViewer(viewerRole) {
  return viewerRole === "admin" ? "archived_by_admin_at" : "archived_by_member_at";
}

export async function fetchClubMessageThread({ clubId, membershipId, viewerRole = "member" }) {
  if (!clubId || !membershipId) return { data: [], error: null };
  const archivedCol = archiveColumnForViewer(viewerRole);
  const withArchive = await supabase
    .from("club_messages")
    .select(MESSAGE_SELECT)
    .eq("club_id", clubId)
    .eq("membership_id", membershipId)
    .is(archivedCol, null)
    .order("created_at", { ascending: true });
  if (!withArchive.error) return withArchive;
  if (!isMissingArchiveColumnError(withArchive.error)) return withArchive;
  return supabase
    .from("club_messages")
    .select(MESSAGE_SELECT_LEGACY)
    .eq("club_id", clubId)
    .eq("membership_id", membershipId)
    .order("created_at", { ascending: true });
}

export async function fetchClubMessagesForClub(clubId) {
  if (!clubId) return { data: [], error: null };
  const withArchive = await supabase
    .from("club_messages")
    .select(MESSAGE_SELECT)
    .eq("club_id", clubId)
    .is("archived_by_admin_at", null)
    .order("created_at", { ascending: false })
    .limit(500);
  if (!withArchive.error) return withArchive;
  if (!isMissingArchiveColumnError(withArchive.error)) return withArchive;
  return supabase
    .from("club_messages")
    .select(MESSAGE_SELECT_LEGACY)
    .eq("club_id", clubId)
    .order("created_at", { ascending: false })
    .limit(500);
}

export async function sendMemberClubMessage({
  clubId,
  membershipId,
  eventId,
  body,
  senderUserId,
}) {
  const trimmed = String(body || "").trim();
  if (!clubId || !membershipId || !trimmed) {
    return { data: null, error: { message: "Message is empty." } };
  }
  return supabase.from("club_messages").insert({
    club_id: clubId,
    membership_id: membershipId,
    event_id: eventId || null,
    body: trimmed,
    sender_role: "member",
    sender_user_id: senderUserId || null,
  });
}

export async function sendAdminClubMessage({ clubId, membershipId, body, senderUserId }) {
  const trimmed = String(body || "").trim();
  if (!clubId || !membershipId || !trimmed) {
    return { data: null, error: { message: "Message is empty." } };
  }
  return supabase.from("club_messages").insert({
    club_id: clubId,
    membership_id: membershipId,
    event_id: null,
    body: trimmed,
    sender_role: "admin",
    sender_user_id: senderUserId || null,
  });
}

export async function sendAdminClubMessageToMemberships({
  clubId,
  membershipIds,
  body,
  senderUserId,
  eventId = null,
}) {
  const trimmed = String(body || "").trim();
  const ids = (membershipIds || []).filter(Boolean);
  if (!clubId || !trimmed || ids.length === 0) {
    return { data: null, error: { message: "Message is empty." } };
  }
  return supabase.from("club_messages").insert(
    ids.map((membershipId) => ({
      club_id: clubId,
      membership_id: membershipId,
      event_id: eventId || null,
      body: trimmed,
      sender_role: "admin",
      sender_user_id: senderUserId || null,
    }))
  );
}

async function markMemberMessagesReadForAdminDirect({ clubId, membershipId }) {
  const now = new Date().toISOString();
  return supabase
    .from("club_messages")
    .update({ read_by_admin_at: now })
    .eq("club_id", clubId)
    .eq("membership_id", membershipId)
    .eq("sender_role", "member")
    .is("read_by_admin_at", null);
}

async function markAdminMessagesReadForMemberDirect({ clubId, membershipId }) {
  const now = new Date().toISOString();
  return supabase
    .from("club_messages")
    .update({ read_by_member_at: now })
    .eq("club_id", clubId)
    .eq("membership_id", membershipId)
    .eq("sender_role", "admin")
    .is("read_by_member_at", null);
}

export async function markMemberMessagesReadForAdmin({ clubId, membershipId }) {
  if (!clubId || !membershipId) return { error: null };
  const rpc = await supabase.rpc("mark_club_messages_read_for_admin", {
    p_club_id: clubId,
    p_membership_id: membershipId,
  });
  let result = rpc;
  if (rpc.error && /function|schema cache/i.test(rpc.error.message || "")) {
    result = await markMemberMessagesReadForAdminDirect({ clubId, membershipId });
  }
  if (!result.error) notifyClubMessagesInboxChanged();
  return result;
}

export async function markAdminMessagesReadForMember({ clubId, membershipId }) {
  if (!clubId || !membershipId) return { error: null };
  const rpc = await supabase.rpc("mark_club_messages_read_for_member", {
    p_club_id: clubId,
    p_membership_id: membershipId,
  });
  let result = rpc;
  if (rpc.error && /function|schema cache/i.test(rpc.error.message || "")) {
    result = await markAdminMessagesReadForMemberDirect({ clubId, membershipId });
  }
  if (!result.error) notifyClubMessagesInboxChanged();
  return result;
}

async function markAllMemberMessagesReadForAdminDirect(clubId) {
  const now = new Date().toISOString();
  return supabase
    .from("club_messages")
    .update({ read_by_admin_at: now })
    .eq("club_id", clubId)
    .eq("sender_role", "member")
    .is("read_by_admin_at", null)
    .is("archived_by_admin_at", null);
}

async function markAllAdminMessagesReadForMemberDirect(clubId, membershipId) {
  const now = new Date().toISOString();
  let query = supabase
    .from("club_messages")
    .update({ read_by_member_at: now })
    .eq("club_id", clubId)
    .eq("membership_id", membershipId)
    .eq("sender_role", "admin")
    .is("read_by_member_at", null);
  const withArchive = await query.is("archived_by_member_at", null);
  if (withArchive.error && /archived_by_/i.test(withArchive.error.message || "")) {
    return markAdminMessagesReadForMemberDirect({ clubId, membershipId });
  }
  return withArchive;
}

export async function markAllMemberMessagesReadForAdmin(clubId) {
  if (!clubId) return { error: { message: "Missing club." } };
  const rpc = await supabase.rpc("mark_club_messages_read_all_for_admin", {
    p_club_id: clubId,
  });
  let result = rpc;
  if (rpc.error && /function|schema cache|mark_club_messages_read_all/i.test(rpc.error.message || "")) {
    result = await markAllMemberMessagesReadForAdminDirect(clubId);
    if (result.error && /archived_by_/i.test(result.error.message || "")) {
      const now = new Date().toISOString();
      result = await supabase
        .from("club_messages")
        .update({ read_by_admin_at: now })
        .eq("club_id", clubId)
        .eq("sender_role", "member")
        .is("read_by_admin_at", null);
    }
  }
  if (!result.error) notifyClubMessagesInboxChanged();
  return result;
}

export async function markAllAdminMessagesReadForMember({ clubId, membershipId }) {
  if (!clubId || !membershipId) return { error: null };
  const rpc = await supabase.rpc("mark_club_messages_read_all_for_member", {
    p_club_id: clubId,
    p_membership_id: membershipId,
  });
  let result = rpc;
  if (rpc.error && /function|schema cache|mark_club_messages_read_all/i.test(rpc.error.message || "")) {
    result = await markAllAdminMessagesReadForMemberDirect(clubId, membershipId);
  }
  if (!result.error) notifyClubMessagesInboxChanged();
  return result;
}

export async function manageClubMessages({
  clubId,
  membershipId,
  messageIds,
  action,
}) {
  const ids = Array.from(new Set((messageIds || []).filter(Boolean)));
  if (!clubId || !membershipId || !ids.length) {
    return { data: null, error: { message: "No messages selected." } };
  }
  const normalized = String(action || "").toLowerCase();
  if (normalized !== "archive" && normalized !== "delete") {
    return { data: null, error: { message: "Unknown action." } };
  }

  const rpc = await supabase.rpc("manage_club_messages", {
    p_club_id: clubId,
    p_membership_id: membershipId,
    p_message_ids: ids,
    p_action: normalized,
  });

  if (rpc.error) {
    if (/function|schema cache|manage_club_messages/i.test(rpc.error.message || "")) {
      return {
        data: null,
        error: {
          message:
            "Message archive/delete is not set up yet. Run scripts/add-club-messages-archive-delete.sql in Supabase.",
        },
      };
    }
    return { data: null, error: rpc.error };
  }

  notifyClubMessagesInboxChanged();
  return { data: rpc.data, error: null };
}

export function canDeleteClubMessage(message, viewerRole, senderUserId) {
  if (!message) return false;
  if (viewerRole === "admin") return true;
  return (
    message.sender_role === "member" &&
    senderUserId &&
    message.sender_user_id === senderUserId
  );
}

export async function countUnreadForAdmin(clubId) {
  if (!clubId) return 0;
  const { count, error } = await supabase
    .from("club_messages")
    .select("id", { count: "exact", head: true })
    .eq("club_id", clubId)
    .eq("sender_role", "member")
    .is("read_by_admin_at", null)
    .is("archived_by_admin_at", null);
  if (error) {
    console.warn("countUnreadForAdmin", error);
    return 0;
  }
  return count || 0;
}

export async function countUnreadForMember(clubId, membershipId) {
  if (!clubId || !membershipId) return 0;
  const { count, error } = await supabase
    .from("club_messages")
    .select("id", { count: "exact", head: true })
    .eq("club_id", clubId)
    .eq("membership_id", membershipId)
    .eq("sender_role", "admin")
    .is("read_by_member_at", null)
    .is("archived_by_member_at", null);
  if (error) {
    console.warn("countUnreadForMember", error);
    return 0;
  }
  return count || 0;
}

export function groupMessagesByMembership(rows) {
  const map = new Map();
  (rows || []).forEach((row) => {
    const key = row.membership_id;
    if (!key) return;
    if (!map.has(key)) {
      map.set(key, {
        membershipId: key,
        lastMessage: row,
        unreadCount: 0,
      });
    } else {
      const thread = map.get(key);
      const rowAt = new Date(row.created_at || 0).getTime();
      const lastAt = new Date(thread.lastMessage?.created_at || 0).getTime();
      if (rowAt >= lastAt) {
        thread.lastMessage = row;
      }
    }
    if (row.sender_role === "member" && !row.read_by_admin_at) {
      map.get(key).unreadCount += 1;
    }
  });
  return Array.from(map.values()).sort(
    (a, b) =>
      new Date(b.lastMessage?.created_at || 0).getTime() -
      new Date(a.lastMessage?.created_at || 0).getTime()
  );
}
