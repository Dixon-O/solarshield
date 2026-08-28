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
  const [isOffline, setIsOffline] = useState(
    typeof navigator !== "undefined" ? !navigator.onLine : false,
  );
  const [lastKnownUtc, setLastKnownUtc] = useState<string | null>(null);

  useEffect(() => {
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
