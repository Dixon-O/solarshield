// SolarShield Service Worker
// Phase M0: placeholder — full caching logic added in M4 (Offline Survivability milestone)

const CACHE_NAME = "solarsheild-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener("fetch", (event) => {
  // M0: pass-through — full offline strategy implemented in M4
  event.respondWith(fetch(event.request));
});
