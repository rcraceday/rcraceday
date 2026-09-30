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

export function isIosDevice() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return (
    /iphone|ipad|ipod/i.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

export function isStandaloneDisplay() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

async function waitForServiceWorkerRegistration(timeoutMs = 20000) {
  if (!isWebPushSupported()) return null;

  const existing = await navigator.serviceWorker.getRegistration();
  if (existing?.pushManager) return existing;
  if (import.meta.env.DEV) return existing || null;

  return new Promise((resolve) => {
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    const timer = setTimeout(() => {
      navigator.serviceWorker.getRegistration().then((reg) => finish(reg || null));
    }, timeoutMs);

    navigator.serviceWorker.ready
      .then((reg) => {
        clearTimeout(timer);
        finish(reg);
      })
      .catch(() => {
        clearTimeout(timer);
        finish(null);
      });
  });
}

export async function getPushServiceWorkerRegistration() {
  return waitForServiceWorkerRegistration();
}

export async function getCurrentPushSubscription() {
  const reg = await getPushServiceWorkerRegistration();
  if (!reg?.pushManager) return null;
  return reg.pushManager.getSubscription();
}

export async function getPushDeviceStatus() {
  const configured = isWebPushConfigured();
  const supported = isWebPushSupported();
  const iosNeedsHomeScreen = isIosDevice() && !isStandaloneDisplay();
  const permission = supported ? Notification.permission : "unsupported";
  let subscribed = false;
  if (supported && permission === "granted") {
    try {
      const sub = await getCurrentPushSubscription();
      subscribed = Boolean(sub?.endpoint);
    } catch {
      subscribed = false;
    }
  }
  return { configured, supported, permission, subscribed, iosNeedsHomeScreen };
}

/**
 * Request permission (user gesture), subscribe with VAPID, upsert row in push_subscriptions.
 */
export async function subscribeWebPush(
  supabase,
  { userId, clubId = null, requestPermission = true } = {}
) {
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
  if (isIosDevice() && !isStandaloneDisplay()) {
    return {
      error: {
        message:
          "On iPhone, add RCRaceday to the Home Screen, open it from there, then tap Enable push on this device.",
      },
    };
  }

  if (Notification.permission !== "granted") {
    if (!requestPermission) {
      return { error: { message: "Notification permission has not been granted yet." } };
    }
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      if (permission === "denied") {
        return {
          error: {
            message:
              "Notifications are blocked for RCRaceday. On the phone open Settings → Apps → RCRaceday (it may still say RaceDay) → Notifications, allow them, then return here and tap Enable push on this device.",
          },
        };
      }
      return { error: { message: "Notification permission was not granted." } };
    }
  }

  const reg = await getPushServiceWorkerRegistration();
  if (!reg?.pushManager) {
    return {
      error: {
        message:
          "The app is not ready for push yet. Open the installed RCRaceday app (not just the phone Settings app), wait a few seconds, and tap Enable push on this device again.",
      },
    };
  }

  let subscription = await reg.pushManager.getSubscription();
  if (!subscription) {
    try {
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
    } catch (err) {
      return {
        error: {
          message: err instanceof Error ? err.message : "Could not subscribe this device for push.",
        },
      };
    }
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

/** If the browser already allowed notifications, save this device without prompting. */
export async function syncWebPushIfPermitted(supabase, { userId, clubId = null } = {}) {
  if (!isWebPushConfigured() || !isWebPushSupported() || !userId) {
    return { error: null, skipped: true };
  }
  if (Notification.permission !== "granted") {
    return { error: null, skipped: true };
  }
  return subscribeWebPush(supabase, { userId, clubId, requestPermission: false });
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
