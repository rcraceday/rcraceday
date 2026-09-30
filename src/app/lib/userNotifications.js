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
    is_read: false,
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
    return { inApp: false, email: false, push: false, forced: false };
  }
  return shouldNotifyNominationsOpen(prefs, event);
}

export function membershipRenewalChannelsForMember(membership) {
  const prefs = normalizeNotificationPreferences(membership?.notification_preferences);
  return shouldNotifyMembershipRenewal(prefs);
}

/**
 * Ask the server to send scheduled alerts (nominations open, reminders, club news).
 * @param {object} [options]
 * @param {boolean} [options.force] - Re-send even if already marked notified (admin retry).
 * @param {string} [options.type] - nominations_open | nominations_reminder | club_news
 * @param {string} [options.newsId]
 */
export async function triggerNominationsOpenProcessing(supabase, eventId = null, options = {}) {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) {
    return {
      data: null,
      error: { message: "VITE_SUPABASE_URL is not set in the app environment." },
    };
  }

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session?.access_token) {
    return {
      data: null,
      error: { message: "Sign in again, then retry sending notifications." },
    };
  }

  await supabase.auth.refreshSession();

  const body = {
    ...(eventId ? { eventId } : {}),
    ...(options.newsId ? { newsId: options.newsId } : {}),
    ...(options.force ? { force: true } : {}),
    ...(options.type ? { type: options.type } : {}),
  };

  // Raw fetch avoids global Supabase client `Prefer` header (breaks Edge Function CORS).
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const url = `${supabaseUrl.replace(/\/$/, "")}/functions/v1/process-nominations-open`;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: anonKey,
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        data: null,
        error: {
          message: data?.error || `Edge Function returned ${response.status}`,
        },
      };
    }
    return { data, error: null };
  } catch (err) {
    return {
      data: null,
      error: {
        message: err instanceof Error ? err.message : "Failed to reach Edge Function",
      },
    };
  }
}
