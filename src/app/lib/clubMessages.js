import { supabase } from "@/supabaseClient";

export const CLUB_MESSAGES_INBOX_CHANGED = "rcraceday:club-messages-inbox-changed";

export function notifyClubMessagesInboxChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(CLUB_MESSAGES_INBOX_CHANGED));
  }
}

export async function fetchClubMessageThread({ clubId, membershipId }) {
  if (!clubId || !membershipId) return { data: [], error: null };
  return supabase
    .from("club_messages")
    .select("id, club_id, membership_id, event_id, body, sender_role, sender_user_id, created_at, read_by_member_at, read_by_admin_at")
    .eq("club_id", clubId)
    .eq("membership_id", membershipId)
    .order("created_at", { ascending: true });
}

export async function fetchClubMessagesForClub(clubId) {
  if (!clubId) return { data: [], error: null };
  return supabase
    .from("club_messages")
    .select("id, club_id, membership_id, event_id, body, sender_role, sender_user_id, created_at, read_by_admin_at, read_by_member_at")
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

export async function countUnreadForAdmin(clubId) {
  if (!clubId) return 0;
  const { count, error } = await supabase
    .from("club_messages")
    .select("id", { count: "exact", head: true })
    .eq("club_id", clubId)
    .eq("sender_role", "member")
    .is("read_by_admin_at", null);
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
    .is("read_by_member_at", null);
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
