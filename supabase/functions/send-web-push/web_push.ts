import webpush from "https://esm.sh/web-push@3.6.7";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export type WebPushNotification = {
  title: string;
  body?: string;
  url?: string;
  tag?: string;
  type?: string;
};

let vapidConfigured = false;

function ensureVapid() {
  if (vapidConfigured) return true;
  const publicKey = Deno.env.get("VAPID_PUBLIC_KEY");
  const privateKey = Deno.env.get("VAPID_PRIVATE_KEY");
  if (!publicKey || !privateKey) {
    return false;
  }
  webpush.setVapidDetails(
    Deno.env.get("VAPID_SUBJECT") || "mailto:support@rcraceday.com",
    publicKey,
    privateKey
  );
  vapidConfigured = true;
  return true;
}

export async function sendWebPushToUsers(
  supabase: SupabaseClient,
  userIds: string[],
  notification: WebPushNotification
): Promise<{ sent: number; failed: number; removed: number }> {
  const uniqueIds = [...new Set(userIds.filter(Boolean))];
  if (uniqueIds.length === 0) {
    return { sent: 0, failed: 0, removed: 0 };
  }

  if (!ensureVapid()) {
    console.warn("web push skipped: VAPID keys not configured");
    return { sent: 0, failed: 0, removed: 0 };
  }

  const { data: rows, error } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, subscription")
    .in("user_id", uniqueIds);

  if (error) {
    console.warn("push_subscriptions select", error);
    return { sent: 0, failed: 0, removed: 0 };
  }
  if (!rows?.length) {
    return { sent: 0, failed: 0, removed: 0 };
  }

  const payload = JSON.stringify({
    title: notification.title,
    body: notification.body ?? "",
    url: notification.url ?? "/",
    tag: notification.tag ?? notification.type ?? "rcraceday",
  });

  let sent = 0;
  let failed = 0;
  let removed = 0;

  for (const row of rows) {
    const sub = row.subscription as {
      endpoint?: string;
      keys?: { p256dh?: string; auth?: string };
    };
    if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) continue;

    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.keys.p256dh,
            auth: sub.keys.auth,
          },
        },
        payload
      );
      sent += 1;
    } catch (err: unknown) {
      failed += 1;
      const status = (err as { statusCode?: number })?.statusCode;
      if (status === 404 || status === 410) {
        await supabase.from("push_subscriptions").delete().eq("id", row.id);
        removed += 1;
      }
      console.warn("web push send failed", row.endpoint, err);
    }
  }

  return { sent, failed, removed };
}

