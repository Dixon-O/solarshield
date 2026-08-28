"use client";

/**
 * SolarShield — main cockpit.
 *
 * Client-side flow:
 *   1. Fetch the latest snapshot from /api/snapshot.
 *   2. Save each good snapshot to IndexedDB (last-known-good).
 *   3. If the network is gone, reload the last-known snapshot from IndexedDB
 *      so the countdown keeps running through a blackout — the core promise.
 *
 * Every number shown is derived by the deterministic core
 * (classifyGeomagnetic, estimateArrival) from sourced snapshot values.
 * Nothing is invented in this file.
 */

import { useEffect, useMemo, useState } from "react";
import type { SpaceWeatherSnapshot } from "@/lib/data/types";
import {
  classifyGeomagnetic,
  estimateArrival,
  EARTH_SUN_DISTANCE_KM,
} from "@/lib/core";
import { saveSnapshot, loadSnapshot } from "@/lib/cache/indexeddb";
import { Now } from "@/components/Now";
import { Inbound } from "@/components/Inbound";
import { ImpactActions } from "@/components/ImpactActions";
import { Ask } from "@/components/Ask";
import { HistoricalReplay } from "@/components/HistoricalReplay";
import { OfflineBanner } from "@/components/OfflineBanner";
import styles from "./page.module.css";

type Tab = "live" | "ask" | "replay";

const TABS: [Tab, string][] = [
  ["live", "Live"],
  ["ask", "Ask"],
  ["replay", "Replay"],
];

export default function Home() {
  const [snapshot, setSnapshot] = useState<SpaceWeatherSnapshot | null>(null);
  const [source, setSource] = useState<"live" | "cache" | null>(null);
  const [tab, setTab] = useState<Tab>("live");

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        const resp = await fetch("/api/snapshot", { cache: "no-store" });
        if (!resp.ok) throw new Error(`snapshot ${resp.status}`);
        const data = (await resp.json()) as SpaceWeatherSnapshot;
        if (!alive) return;
        setSnapshot(data);
        setSource("live");
        // Persist last-known-good for offline survival.
        saveSnapshot(data).catch(() => {
          /* IndexedDB unavailable — offline survival degrades, app still runs */
        });
      } catch {
        // Network gone — fall back to the last snapshot we saved.
        const cached = await loadSnapshot();
        if (!alive) return;
        if (cached) {
          setSnapshot(cached.snapshot);
          setSource("cache");
        }
      }
    }

    load();
    const id = setInterval(load, 60_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  // Derived, grounded values — recomputed only when the snapshot changes.
  const { scale, arrival } = useMemo(() => {
    const kp = snapshot?.latestKp?.kp ?? null;
    const s = classifyGeomagnetic(kp);
    const cme =
      snapshot && snapshot.recentCmes.length > 0
        ? snapshot.recentCmes[snapshot.recentCmes.length - 1]
        : null;
    const speed = cme?.primaryAnalysis?.speedKmS ?? null;
    const a = estimateArrival(EARTH_SUN_DISTANCE_KM, speed, cme?.startTimeUtc);
    return { scale: s, arrival: a };
  }, [snapshot]);

  const statusLabel = !snapshot
    ? "Connecting…"
    : source === "cache"
      ? "Last known"
      : snapshot.degraded
        ? "Degraded"
        : "Live";

  const statusState = !snapshot
    ? ""
    : source === "cache" || snapshot.degraded
      ? "state-moderate"
      : "state-calm";

  return (
    <div className={styles.app}>
      <OfflineBanner />

      <header className={styles.header}>
        <div className={styles.brand}>
          <span className={styles.mark} aria-hidden="true" />
          <span className={styles.brandText}>
            <span className={styles.wordmark}>SolarShield</span>
            <span className={styles.tagline}>Space-weather early warning</span>
          </span>
        </div>
        <span
          className={`${styles.statusPill} ${statusState} data-mono`}
          aria-live="polite"
        >
          {statusLabel}
        </span>
      </header>

      <nav className={styles.tabs} aria-label="Views">
        {TABS.map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`${styles.tab} ${tab === id ? styles.tabActive : ""}`}
            aria-current={tab === id ? "page" : undefined}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </nav>

      <main className={styles.main}>
        {tab === "live" && (
          <section className={styles.liveGrid} aria-label="Live conditions">
            <div className={styles.hero}>
              <Inbound snapshot={snapshot} scale={scale} arrival={arrival} />
            </div>
            <div className={styles.side}>
              <Now snapshot={snapshot} scale={scale} />
            </div>
            <div className={styles.full}>
              <ImpactActions scale={scale} />
            </div>
          </section>
        )}

        {tab === "ask" && (
          <section className={styles.single} aria-label="Ask">
            <Ask />
          </section>
        )}

        {tab === "replay" && (
          <section className={styles.single} aria-label="Historical replay">
            <HistoricalReplay />
          </section>
        )}
      </main>

      <footer className={styles.footer}>
        <span>
          Sources: NOAA SWPC · NASA DONKI. Guidance: NOAA Space Weather Scales.
          Arrival estimates are physics-based with a ±6&nbsp;hour window.
        </span>
      </footer>
    </div>
  );
}
