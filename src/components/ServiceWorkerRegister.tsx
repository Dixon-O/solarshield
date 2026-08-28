"use client";

/**
 * Registers the service worker that makes SolarShield installable and lets the
 * app shell open through a network blackout. Renders nothing.
 *
 * The registration is deliberately skipped in development so the dev server is
 * never served stale, pre-cached chunks. In production (and under test) it
 * registers `/sw.js` once, after hydration, so service-worker install never
 * competes with first paint. Registration is best-effort: if it fails, the app
 * still runs — it simply loses the installable/offline-shell affordance.
 */

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV === "development") return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* best-effort — the app runs fine without the service worker */
    });
  }, []);

  return null;
}
