import {
  normalizeNotificationPreferences,
  shouldNotifyForEventTrack,
  shouldNotifyMembershipRenewal,
  shouldNotifyNominationsOpen,
} from "@/app/lib/notificationPreferences";

/**
 * Insert an in-app notification row. Shape must match your `notifications` table.
 * Adjust columns if your schema differs.
 */
export async function createInAppNotification(supabase, {
  userId,
  clubId,
  title,
  body,
  linkPath = null,
}) {
  if (!userId || !title) return { error: { message: "Missing notification target" } };
  const payload = {
    user_id: userId,
    club_id: clubId ?? null,
    title,
    body: body ?? "",
    read: false,
    metadata: linkPath ? { link_path: linkPath } : {},
  };
  return supabase.from("notifications").insert(payload);
}

/**
 * Queue email via Edge Function (implement server-side).
 * Client calls are no-ops until `send-club-email` function exists.
 */
export async function queueEmailNotification(supabase, { to, subject, html, template }) {
  if (!to || !subject) return { error: { message: "Missing email fields" } };
  return supabase.functions.invoke("send-club-email", {
    body: { to, subject, html, template },
  });
}

export function nominationsOpenChannelsForMember(membership, event) {
  const prefs = normalizeNotificationPreferences(membership?.notification_preferences);
  if (!shouldNotifyForEventTrack(prefs, event?.track)) {
    return { inApp: false, email: false, forced: false };
  }
  return shouldNotifyNominationsOpen(prefs, event);
}

export function membershipRenewalChannelsForMember(membership) {
  const prefs = normalizeNotificationPreferences(membership?.notification_preferences);
  return shouldNotifyMembershipRenewal(prefs);
}
