// 🚀 Always bump version on deploy
const CACHE_VERSION = "v" + Date.now();
const CACHE_NAME = "app-cache-" + CACHE_VERSION;

// 🚀 Install: skip waiting + pre-cache nothing (HTML must be fresh)
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

// 🚀 Activate: delete ALL old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (!key.includes(CACHE_VERSION)) {
            return caches.delete(key);
          }
        })
      )
    )
  );

  self.clients.claim();
});

// 🚀 Fetch: network-first for EVERYTHING
self.addEventListener("fetch", (event) => {
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        return response;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
