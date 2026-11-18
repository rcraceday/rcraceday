import { parseStoredTimestamp } from "@/app/lib/eventDatetime";
import { richTextToPlainText } from "@/app/lib/richText";
import {
  notifyClubMessagesInboxChanged,
  sendAdminClubMessageToMemberships,
} from "@/app/lib/clubMessages";
import {
  createInAppNotification,
  sendWebPushToUsers,
  triggerNominationsOpenProcessing,
} from "@/app/lib/userNotifications";
import { shouldNotifyClubNewsBroadcast } from "@/app/lib/notificationPreferences";

const MESSAGE_CHUNK_SIZE = 40;

/** @returns {'draft'|'scheduled'|'live'|'expired'} */
export function getClubNewsDisplayStatus(news, now = new Date()) {
  if (!news?.is_published) return "draft";
  const from = parseStoredTimestamp(news.display_from);
  const until = parseStoredTimestamp(news.display_until);
  if (from && from > now) return "scheduled";
  if (until && until <= now) return "expired";
  return "live";
}

export function isClubNewsVisible(news, now = new Date()) {
  if (news?.is_published === false) return false;
  const from = parseStoredTimestamp(news.display_from);
  const until = parseStoredTimestamp(news.display_until);
  if (from && from > now) return false;
  if (until && until <= now) return false;
  return true;
}

export function validateClubNewsDisplayDates(displayFromIso, displayUntilIso) {
  const from = parseStoredTimestamp(displayFromIso);
  const until = parseStoredTimestamp(displayUntilIso);
  if (from && until && until <= from) {
    return "Display end must be after display start.";
  }
  return null;
}

export function isClubNewsNotifyDue(news, now = new Date()) {
  if (!news?.notify_members || !news?.is_published) return false;
  if (news.notify_mode === "scheduled") {
    const at = parseStoredTimestamp(news.notify_at);
    return !!(at && at <= now);
  }
  return true;
}

/** Auto-send on save only when the item is newly published (not on later edits). */
export function shouldAutoSendClubNewsNotifications(
  { wasPublished, nowPublished, news },
  now = new Date()
) {
  if (!nowPublished || wasPublished) return false;
  return isClubNewsNotifyDue(news, now);
}

function deliveryNotice({ messagesSent, inApp, push, pushNote }) {
  const parts = [
    `Club messages: ${messagesSent}. In-app: ${inApp}. Push: ${push}.`,
    pushNote,
  ].filter(Boolean);
  return parts.join(" ");
}

async function sendClubNewsPush({
  supabase,
  club,
  news,
  clubSlug,
  title,
  pushBody,
  linkPath,
  userIds,
}) {
  if (!userIds.length) return { push: 0, pushNote: null };

  let push = 0;
  let pushNote = null;
  const pushResult = await sendWebPushToUsers(supabase, {
    userIds,
    title,
    body: pushBody,
    url: linkPath,
    clubId: club.id,
  });

  if (!pushResult.error) {
    const sent = Number(pushResult.data?.sent ?? pushResult.data?.push ?? userIds.length);
    return { push: Number.isFinite(sent) ? sent : userIds.length, pushNote: null };
  }

  const pushMsg = String(pushResult.error.message || "Push notification failed.");
  if (/unauthorized/i.test(pushMsg)) {
    const edge = await triggerNominationsOpenProcessing(supabase, null, {
      newsId: news.id,
      type: "club_news",
      force: true,
    });
    if (!edge.error && !edge.data?.error) {
      const row = Array.isArray(edge.data?.summary)
        ? edge.data.summary.find((item) => item?.type === "club_news") || edge.data.summary[0]
        : null;
      push = Number(row?.push ?? 0);
      if (push > 0) return { push, pushNote: null };
    }
    pushNote =
      "Mobile push was not sent (the send-web-push function rejected this account). Messages and in-app alerts were still delivered.";
    return { push: 0, pushNote };
  }

  pushNote = `Push failed: ${pushMsg}`;
  return { push: 0, pushNote };
}

async function deliverClubNewsViaRpc(supabase, news, force) {
  const { data, error } = await supabase.rpc("broadcast_club_news_notifications", {
    p_news_id: news.id,
    p_force: !!force,
  });
  if (error) {
    if (/function|schema cache|broadcast_club_news/i.test(error.message || "")) {
      return { unavailable: true };
    }
    return { ok: false, error: error.message || "Could not send news notifications." };
  }
  if (data?.skipped) {
    return { ok: true, skipped: true, reason: data.reason };
  }
  const userIds = Array.isArray(data?.user_ids)
    ? data.user_ids.filter(Boolean)
    : [];
  return {
    ok: true,
    messagesSent: Number(data?.messages_sent ?? 0),
    inApp: Number(data?.in_app ?? 0),
    userIds,
    markedNotified: true,
  };
}

export async function deliverClubNewsNotifications({
  supabase,
  club,
  clubSlug,
  news,
  senderUserId,
  force = false,
}) {
  if (!supabase) return { ok: false, error: "Supabase client is required." };
  if (!club?.id || !news?.id) return { ok: false, error: "Missing club or news item." };
  if (!news.notify_members && !force) {
    return { ok: true, skipped: true, reason: "notify_disabled" };
  }
  if (!force && news.notified_at) {
    return { ok: true, skipped: true, reason: "already_sent" };
  }
  if (!force && !isClubNewsNotifyDue(news)) {
    return { ok: true, skipped: true, reason: "not_due" };
  }

  const title = String(news.title || "").trim() || "Club news";
  const snippet = richTextToPlainText(news.body);
  const pushBody = snippet.length > 220 ? `${snippet.slice(0, 217)}…` : snippet || title;
  const linkPath = clubSlug ? `/${clubSlug}/app/news/${news.id}` : null;

  const rpcResult = await deliverClubNewsViaRpc(supabase, news, force);
  if (!rpcResult.unavailable) {
    if (!rpcResult.ok) {
      const err = rpcResult.error || "Could not send news notifications.";
      if (/unauthorized|permission/i.test(err)) {
        return {
          ok: false,
          error:
            "You do not have permission to send notifications. Run scripts/add-club-news-broadcast-rls.sql in Supabase.",
        };
      }
      return { ok: false, error: err };
    }
    if (rpcResult.skipped) {
      return { ok: true, skipped: true, reason: rpcResult.reason };
    }

    notifyClubMessagesInboxChanged();
    const { push, pushNote } = await sendClubNewsPush({
      supabase,
      club,
      news,
      clubSlug,
      title,
      pushBody,
      linkPath,
      userIds: rpcResult.userIds,
    });

    return {
      ok: true,
      messagesSent: rpcResult.messagesSent,
      inApp: rpcResult.inApp,
      push,
      households: rpcResult.messagesSent,
      notice: deliveryNotice({
        messagesSent: rpcResult.messagesSent,
        inApp: rpcResult.inApp,
        push,
        pushNote,
      }),
    };
  }

  const { data: memberships, error: membershipError } = await supabase
    .from("household_memberships")
    .select("id, user_id, notification_preferences")
    .eq("club_id", club.id)
    .eq("status", "active");

  if (membershipError) {
    return { ok: false, error: membershipError.message || "Could not load members." };
  }

  const rows = memberships || [];
  const membershipIds = rows.map((row) => row.id).filter(Boolean);
  if (!membershipIds.length) {
    return {
      ok: false,
      error:
        "No active memberships visible. Run scripts/add-club-news-broadcast-rls.sql in Supabase.",
    };
  }

  const messageBody = [
    `New club news: ${title}`,
    pushBody,
    linkPath ? `View in the app: ${linkPath}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  let messagesSent = 0;
  for (let i = 0; i < membershipIds.length; i += MESSAGE_CHUNK_SIZE) {
    const chunk = membershipIds.slice(i, i + MESSAGE_CHUNK_SIZE);
    const { error: messageError } = await sendAdminClubMessageToMemberships({
      clubId: club.id,
      membershipIds: chunk,
      body: messageBody,
      senderUserId,
    });
    if (messageError) {
      const msg = messageError.message || "Could not send club messages.";
      if (/row-level security|permission denied|42501/i.test(msg)) {
        return {
          ok: false,
          error:
            "Could not send club messages. Run scripts/add-club-news-broadcast-rls.sql in Supabase.",
          partial: { messagesSent },
        };
      }
      return { ok: false, error: msg, partial: { messagesSent } };
    }
    messagesSent += chunk.length;
  }
  notifyClubMessagesInboxChanged();

  const channels = shouldNotifyClubNewsBroadcast();
  const userIds = [...new Set(rows.map((row) => row.user_id).filter(Boolean))];
  let inApp = 0;
  if (channels.inApp) {
    const results = await Promise.all(
      userIds.map((userId) =>
        createInAppNotification(supabase, {
          userId,
          clubId: club.id,
          title,
          body: pushBody,
          linkPath,
        })
      )
    );
    inApp = results.filter((row) => !row.error).length;
  }

  const { push, pushNote } = channels.push
    ? await sendClubNewsPush({
        supabase,
        club,
        news,
        clubSlug,
        title,
        pushBody,
        linkPath,
        userIds,
      })
    : { push: 0, pushNote: null };

  const { error: markError } = await supabase
    .from("club_news")
    .update({ notified_at: new Date().toISOString() })
    .eq("id", news.id)
    .eq("club_id", club.id);

  if (markError) {
    return {
      ok: false,
      error: markError.message || "Sent alerts but could not mark notified.",
      partial: { messagesSent, inApp, push },
    };
  }

  return {
    ok: true,
    messagesSent,
    inApp,
    push,
    households: membershipIds.length,
    notice: deliveryNotice({ messagesSent, inApp, push, pushNote }),
  };
}
