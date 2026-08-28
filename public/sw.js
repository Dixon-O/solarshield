// SolarShield Service Worker — M4/M7: offline survivability + installability.
// Precaches the app shell on install and serves it through a network blackout.
//   API routes  → network-only (the app falls back to its IndexedDB snapshot)
//   Navigations → cache-first, with the cached app shell as the offline fallback
//   Assets      → cache-first, filling the cache as they load

const CACHE_NAME = "solarshield-v2";

// App shell to pre-cache on install. Pre-caching is resilient (allSettled), so
// a single missing entry never aborts the whole install.
const APP_SHELL = [
  "/",
  "/judges",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
];

// API routes that must always be fresh when online (never served from cache).
const API_ROUTES = ["/api/snapshot", "/api/ask"];

// ---------------------------------------------------------------------------
// Install — pre-cache the app shell
// ---------------------------------------------------------------------------

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.allSettled(APP_SHELL.map((url) => cache.add(url))),
    ),
  );
  self.skipWaiting();
});

// ---------------------------------------------------------------------------
// Activate — drop old caches, take control of open clients
// ---------------------------------------------------------------------------

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// ---------------------------------------------------------------------------
// Fetch — strategy:
//   API routes: network-only. Offline failure is intentional — the app reads
//     its last-known snapshot from IndexedDB and keeps counting down.
//   Navigations: cache-first, falling back to the cached app shell when the
//     network is gone, so the app still boots during a blackout.
//   Other GETs: cache-first, filling the cache as assets load.
// ---------------------------------------------------------------------------

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin GETs; everything else goes straight to the network.
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  if (API_ROUTES.some((route) => url.pathname.startsWith(route))) {
    event.respondWith(fetch(request));
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          // Cache successful same-origin GETs on the way through.
          if (response.status === 200 && response.type === "basic") {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () => {
          // Offline: for a page navigation, serve the cached app shell so the
          // SPA can still boot and hydrate from its last-known snapshot.
          if (request.mode === "navigate") {
            const shell = await caches.match("/");
            if (shell) return shell;
          }
          throw new Error("offline and resource not cached");
        });
    }),
  );
});
