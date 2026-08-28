"use client";

/**
 * CountdownDial — the signature hero element.
 *
 * Shows a ticking countdown to CME arrival with an SVG arc dial
 * that fills as the CME approaches. The dial color tracks the G-scale state.
 * Respects prefers-reduced-motion (disables pulse animation, keeps counter).
 */

import { useState, useEffect, useRef } from "react";
import type { ArrivalEstimate } from "@/lib/core/types";
import type { GeomagneticScale } from "@/lib/core/types";
import styles from "./CountdownDial.module.css";

interface CountdownDialProps {
  arrival: ArrivalEstimate | null;
  scale: GeomagneticScale | null;
}

function getStateClass(scale: GeomagneticScale | null): string {
  if (!scale || scale === "G0") return styles.stateCalm;
  if (scale === "G1") return styles.stateCalm;
  if (scale === "G2") return styles.stateModerate;
  if (scale === "G3") return styles.stateElevated;
  return styles.stateAlarm; // G4, G5
}

function formatCountdown(msRemaining: number): string {
  if (msRemaining <= 0) return "Arriving now";
  const totalSecs = Math.floor(msRemaining / 1000);
  const hours = Math.floor(totalSecs / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;
  if (hours > 0) {
    return `${hours}h ${mins.toString().padStart(2, "0")}m ${secs.toString().padStart(2, "0")}s`;
  }
  return `${mins.toString().padStart(2, "0")}m ${secs.toString().padStart(2, "0")}s`;
}

/** Arc progress 0–1: how far through the journey the CME is */
function getArcProgress(arrival: ArrivalEstimate, nowMs: number): number {
  const totalMs = arrival.travelTimeHours * 3600 * 1000;
  const arrivalMs = new Date(arrival.arrivalUtc).getTime();
  const startMs = arrivalMs - totalMs;
  const elapsed = nowMs - startMs;
  return Math.max(0, Math.min(1, elapsed / totalMs));
}

/** SVG arc path for a partial circle */
function describeArc(cx: number, cy: number, r: number, progress: number): string {
  if (progress <= 0) return "";
  if (progress >= 1) {
    // Full circle
    return `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.01} ${cy - r} Z`;
  }
  const angle = progress * 2 * Math.PI - Math.PI / 2;
  const x = cx + r * Math.cos(angle);
  const y = cy + r * Math.sin(angle);
  const largeArc = progress > 0.5 ? 1 : 0;
  return `M ${cx} ${cy - r} A ${r} ${r} 0 ${largeArc} 1 ${x} ${y}`;
}

export function CountdownDial({ arrival, scale }: CountdownDialProps) {
  // Start null so the server-rendered HTML and the first client render are
  // identical (no hydration mismatch). The real clock is read only after mount.
  const [nowMs, setNowMs] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setNowMs(Date.now());
    intervalRef.current = setInterval(() => setNowMs(Date.now()), 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const stateClass = getStateClass(scale);

  if (!arrival) {
    return (
      <div className={`${styles.dial} ${styles.stateCalm}`}>
        <div className={styles.dialInner}>
          <svg className={styles.svg} viewBox="0 0 120 120" aria-hidden="true">
            <circle cx="60" cy="60" r="50" className={styles.track} />
          </svg>
          <div className={styles.countdownText}>
            <span className={styles.noEvent}>No active inbound events</span>
          </div>
        </div>
      </div>
    );
  }

  // Pre-hydration frame (before the effect sets the clock): render a stable
  // placeholder so the ticking value can't differ between server and client.
  if (nowMs === null) {
    return (
      <div className={`${styles.dial} ${stateClass}`}>
        <div className={styles.dialInner}>
          <svg className={styles.svg} viewBox="0 0 120 120" aria-hidden="true">
            <circle cx="60" cy="60" r="50" className={styles.track} />
          </svg>
          <div className={styles.countdownText}>
            <span className={styles.noEvent}>Synchronizing…</span>
          </div>
        </div>
      </div>
    );
  }

  const arrivalMs = new Date(arrival.arrivalUtc).getTime();
  const msRemaining = arrivalMs - nowMs;
  const progress = getArcProgress(arrival, nowMs);
  const arcPath = describeArc(60, 60, 50, progress);
  const countdownStr = formatCountdown(msRemaining);
  const arrivalTimeStr = new Date(arrival.arrivalUtc).toUTCString().slice(17, 22) + " UTC";

  return (
    <div className={`${styles.dial} ${stateClass}`} role="timer" aria-label={`CME arrival countdown: ${countdownStr}`}>
      <div className={styles.dialInner}>
        <svg className={styles.svg} viewBox="0 0 120 120" aria-hidden="true">
          <circle cx="60" cy="60" r="50" className={styles.track} />
          {arcPath && (
            <path d={arcPath} className={`${styles.arc} ${stateClass}`} strokeLinecap="round" fill="none" />
          )}
        </svg>
        <div className={styles.countdownText}>
          <span className={`${styles.countdown} data-mono`}>{countdownStr}</span>
          <span className={styles.label}>estimated arrival</span>
          <span className={styles.arrivalTime}>{arrivalTimeStr}</span>
          <span className={styles.uncertainty}>±{arrival.uncertaintyHours}h window</span>
        </div>
      </div>
    </div>
  );
}
