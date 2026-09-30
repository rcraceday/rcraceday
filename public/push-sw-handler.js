/* Web Push handlers (imported by the Vite PWA / Workbox service worker). */

self.addEventListener("push", (event) => {
  let payload = { title: "RCRaceday", body: "", url: "/", tag: "rcraceday" };
  try {
    if (event.data) {
      const parsed = event.data.json();
      payload = { ...payload, ...parsed };
    }
  } catch {
    const text = event.data?.text?.();
    if (text) payload.body = text;
  }

  const options = {
    body: payload.body || "",
    icon: "/pwa/icon-192.png",
    badge: "/pwa/icon-192.png",
    tag: payload.tag || "rcraceday",
    data: {
      url: payload.url || "/",
    },
  };

  event.waitUntil(self.registration.showNotification(payload.title || "RCRaceday", options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const absolute =
        targetUrl.startsWith("http") ? targetUrl : new URL(targetUrl, self.location.origin).href;

      for (const client of clients) {
        if (client.url === absolute && "focus" in client) {
          return client.focus();
        }
      }
      for (const client of clients) {
        if (client.url.includes(targetUrl) && "focus" in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(absolute);
      }
      return undefined;
    })
  );
});
