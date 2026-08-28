"use client";

/**
 * OfflineBanner — shown when the app is offline, using last-known cached data.
 * Copy is direction, not apology (guide §7).
 * Visually distinct but not alarming — calm, informational.
 */

import { useOfflineStatus } from "@/hooks/useOfflineStatus";
import styles from "./OfflineBanner.module.css";

export function OfflineBanner() {
  const { isOffline, lastKnownUtc } = useOfflineStatus();

  if (!isOffline) return null;

  const timeLabel = lastKnownUtc
    ? formatUtcShort(lastKnownUtc)
    : "unknown";

  return (
    <div className={styles.banner} role="status" aria-live="polite">
      <span className={styles.icon} aria-hidden="true">⊘</span>
      <span>
        Offline — showing last known data (as of{" "}
        <time dateTime={lastKnownUtc ?? undefined}>{timeLabel} UTC</time>).
        Countdown still running.
      </span>
    </div>
  );
}

function formatUtcShort(isoStr: string): string {
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return isoStr;
  return `${d.getUTCHours().toString().padStart(2, "0")}:${d.getUTCMinutes().toString().padStart(2, "0")}`;
}
