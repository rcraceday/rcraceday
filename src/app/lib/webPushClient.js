/**
 * Browser Web Push subscribe / unsubscribe (requires VITE_VAPID_PUBLIC_KEY).
 */

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

export function isWebPushConfigured() {
  return Boolean(import.meta.env.VITE_VAPID_PUBLIC_KEY);
}

export function isWebPushSupported() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export async function getPushServiceWorkerRegistration() {
  if (!isWebPushSupported()) return null;
  try {
    return await navigator.serviceWorker.ready;
  } catch {
    return null;
  }
}

export async function getCurrentPushSubscription() {
  const reg = await getPushServiceWorkerRegistration();
  if (!reg?.pushManager) return null;
  return reg.pushManager.getSubscription();
}

/**
 * Request permission, subscribe with VAPID, upsert row in push_subscriptions.
 */
export async function subscribeWebPush(supabase, { userId, clubId = null }) {
  const publicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  if (!publicKey) {
    return { error: { message: "Push is not configured on this site." } };
  }
  if (!userId) {
    return { error: { message: "Sign in to enable push notifications." } };
  }
  if (!isWebPushSupported()) {
    return { error: { message: "This browser does not support push notifications." } };
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return { error: { message: "Notification permission was not granted." } };
  }

  const reg = await getPushServiceWorkerRegistration();
  if (!reg?.pushManager) {
    return { error: { message: "Service worker is not ready. Try again after installing the app." } };
  }

  let subscription = await reg.pushManager.getSubscription();
  if (!subscription) {
    subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  }

  const json = subscription.toJSON();
  if (!json.endpoint) {
    return { error: { message: "Could not read push subscription." } };
  }

  const now = new Date().toISOString();
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: userId,
      club_id: clubId,
      endpoint: json.endpoint,
      subscription: json,
      user_agent: navigator.userAgent,
      updated_at: now,
    },
    { onConflict: "endpoint" }
  );

  if (error) return { error };
  return { data: { endpoint: json.endpoint } };
}

/** Unsubscribe device and remove DB row for this endpoint. */
export async function unsubscribeWebPush(supabase) {
  const subscription = await getCurrentPushSubscription();
  if (subscription) {
    const endpoint = subscription.endpoint;
    await subscription.unsubscribe();
    if (endpoint) {
      await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
    }
  }
  return { error: null };
}
