import { clientsClaim } from "workbox-core";
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";

self.skipWaiting();
clientsClaim();
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

try {
  registerRoute(new NavigationRoute(createHandlerBoundToURL("/index.html")));
} catch {
  // index.html missing from precache in some builds
}

self.addEventListener("push", (event) => {
  let payload = { title: "RC RaceDay", body: "", url: "/", tag: "rcraceday" };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch {
    const text = event.data?.text?.();
    if (text) payload.body = text;
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || "RC RaceDay", {
      body: payload.body || "",
      icon: "/pwa/icon-192.png",
      badge: "/pwa/icon-192.png",
      tag: payload.tag || "rcraceday",
      data: { url: payload.url || "/" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      const absolute = targetUrl.startsWith("http")
        ? targetUrl
        : new URL(targetUrl, self.location.origin).href;
      for (const client of clientList) {
        if ("focus" in client && (client.url === absolute || client.url.includes(targetUrl))) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(absolute);
      return undefined;
    })
  );
});
