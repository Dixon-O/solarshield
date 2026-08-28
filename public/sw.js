// SolarShield Service Worker — M4 Offline Survivability
// Caches the app shell on install; serves from cache when offline.
// Network-first for API routes; cache-first for static assets.

const CACHE_NAME = "solarsheild-v1";

// App shell files to pre-cache on install
const APP_SHELL = [
  "/",
  "/manifest.json",
];

// API routes that should never be served from cache (always fresh when online)
const API_ROUTES = ["/api/snapshot", "/api/ask"];

// ---------------------------------------------------------------------------
// Install — pre-cache the app shell
// ---------------------------------------------------------------------------

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)),
  );
  self.skipWaiting();
});

// ---------------------------------------------------------------------------
// Activate — clean up old caches
// ---------------------------------------------------------------------------

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))),
    ),
  );
  event.waitUntil(clients.claim());
});

// ---------------------------------------------------------------------------
// Fetch — strategy:
//   API routes: network-first, no cache fallback (app handles degraded state)
//   Static assets: cache-first, fall back to network
// ---------------------------------------------------------------------------

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // API routes: network-only (the app's own snapshot/narration APIs)
  if (API_ROUTES.some((route) => url.pathname.startsWith(route))) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Static assets: cache-first
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        // Cache successful GET responses for static assets
        if (
          event.request.method === "GET" &&
          response.status === 200 &&
          (url.origin === self.location.origin || response.type === "basic")
        ) {
          const toCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, toCache));
        }
        return response;
      });
    }),
  );
});
