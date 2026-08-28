"use client";

/**
 * useOfflineStatus — React hook that tracks online/offline state.
 *
 * - Listens to browser online/offline events
 * - On going offline, reads the last-known snapshot from IndexedDB
 * - Returns: { isOffline, lastKnownUtc }
 */

import { useState, useEffect } from "react";
import { loadSnapshot } from "@/lib/cache/indexeddb";

export interface OfflineStatus {
  isOffline: boolean;
  /** UTC ISO-8601 timestamp of the last snapshot saved to IndexedDB, or null if none */
  lastKnownUtc: string | null;
}

export function useOfflineStatus(): OfflineStatus {
  // Start "online" on both server and first client paint so the server-rendered
  // HTML matches the first client render (no hydration mismatch). The real
  // navigator.onLine value is read in the effect below, after mount.
  const [isOffline, setIsOffline] = useState(false);
  const [lastKnownUtc, setLastKnownUtc] = useState<string | null>(null);

  useEffect(() => {
    // Correct the online/offline state now that we're on the client, post-hydration.
    if (typeof navigator !== "undefined") {
      setIsOffline(!navigator.onLine);
    }

    // Load the last-known timestamp from cache on mount
    loadSnapshot()
      .then((cached) => {
        if (cached) {
          setLastKnownUtc(cached.snapshot.snapshotUtc);
        }
      })
      .catch(() => {
        // IndexedDB unavailable — ignore
      });

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => {
      setIsOffline(true);
      // Refresh the last-known timestamp from cache
      loadSnapshot()
        .then((cached) => {
          if (cached) {
            setLastKnownUtc(cached.snapshot.snapshotUtc);
          }
        })
        .catch(() => {
          // Ignore — already offline
        });
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return { isOffline, lastKnownUtc };
}
