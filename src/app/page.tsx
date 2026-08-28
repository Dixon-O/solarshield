"use client";

/**
 * SolarShield — mission-control cockpit (single-viewport).
 *
 * Live-first: fetches /api/snapshot every 60s, caches last-known-good to
 * IndexedDB, and falls back to that cache through a blackout. Every number is
 * derived by the deterministic core (classifyGeomagnetic, estimateArrival) from
 * sourced snapshot values — nothing is invented here.
 *
 * What-if (judges): an optional switch swaps live data for a clearly-labelled
 * hypothetical snapshot so judges can watch the same panels escalate on demand.
 * It never masquerades as live — the pill reads "What-if" and a banner names it.
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiUrl } from "@/lib/config/api";
import type { SpaceWeatherSnapshot } from "@/lib/data/types";
import {
  classifyGeomagnetic,
  estimateArrival,
  EARTH_SUN_DISTANCE_KM,
} from "@/lib/core";
import { saveSnapshot, loadSnapshot } from "@/lib/cache/indexeddb";
import {
  SCENARIOS,
  buildScenarioSnapshot,
  type ScenarioId,
} from "@/lib/scenarios";
import { Now } from "@/components/Now";
import { Inbound } from "@/components/Inbound";
import { ImpactActions } from "@/components/ImpactActions";
import { Ask } from "@/components/Ask";
import { HistoricalReplay } from "@/components/HistoricalReplay";
import { ScaleReference } from "@/components/ScaleReference";
import { OfflineBanner } from "@/components/OfflineBanner";
import styles from "./page.module.css";

type Tab = "live" | "ask" | "replay" | "scales";

const TABS: [Tab, string][] = [
  ["live", "Live"],
  ["ask", "Ask"],
  ["replay", "Replay"],
  ["scales", "Scales"],
];

export default function Home() {
  const [snapshot, setSnapshot] = useState<SpaceWeatherSnapshot | null>(null);
  const [source, setSource] = useState<"live" | "cache" | null>(null);
  const [tab, setTab] = useState<Tab>("live");
  const [scenario, setScenario] = useState<ScenarioId | null>(null);

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        const resp = await fetch(apiUrl("/api/snapshot"), { cache: "no-store" });
        if (!resp.ok) throw new Error(`snapshot ${resp.status}`);
        const data = (await resp.json()) as SpaceWeatherSnapshot;
        if (!alive) return;
        setSnapshot(data);
        setSource("live");
        saveSnapshot(data).catch(() => {
          /* IndexedDB unavailable — offline survival degrades, app still runs */
        });
      } catch {
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

  // Build the hypothetical snapshot once per scenario selection so its
  // timestamps stay fixed and the countdown ticks down correctly.
  const scenarioSnapshot = useMemo(
    () => (scenario ? buildScenarioSnapshot(scenario) : null),
    [scenario],
  );

  // What the panels actually render: hypothetical when a scenario is active,
  // otherwise the live (or last-known) snapshot.
  const inWhatIf = scenario !== null && tab === "live";
  const displaySnapshot = scenarioSnapshot ?? snapshot;

  // Derived, grounded values — recomputed only when the shown snapshot changes.
  const { scale, arrival } = useMemo(() => {
    const kp = displaySnapshot?.latestKp?.kp ?? null;
    const s = classifyGeomagnetic(kp);
    const cme =
      displaySnapshot && displaySnapshot.recentCmes.length > 0
        ? displaySnapshot.recentCmes[displaySnapshot.recentCmes.length - 1]
        : null;
    const speed = cme?.primaryAnalysis?.speedKmS ?? null;
    const a = estimateArrival(EARTH_SUN_DISTANCE_KM, speed, cme?.startTimeUtc);
    return { scale: s, arrival: a };
  }, [displaySnapshot]);

  const activeScenario = SCENARIOS.find((s) => s.id === scenario) ?? null;

  const statusLabel = inWhatIf
    ? "What-if"
    : !snapshot
      ? "Connecting…"
      : source === "cache"
        ? "Last known"
        : snapshot.degraded
          ? "Degraded"
          : "Live";

  const statusState = inWhatIf
    ? "state-moderate"
    : !snapshot
      ? ""
      : source === "cache" || snapshot.degraded
        ? "state-moderate"
        : "state-calm";

  function onScenarioChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;
    setScenario(val ? (val as ScenarioId) : null);
    if (val) setTab("live"); // What-if applies to the Live instrument view
  }

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

        <div className={styles.headerControls}>
          <label className={styles.whatif}>
            <span className={styles.whatifLabel}>What-if</span>
            <select
              className={styles.whatifSelect}
              value={scenario ?? ""}
              onChange={onScenarioChange}
              aria-label="What-if scenario"
            >
              <option value="">Live conditions</option>
              {SCENARIOS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label} · {s.scaleHint}
                </option>
              ))}
            </select>
          </label>

          <span
            className={`${styles.statusPill} ${statusState} data-mono`}
            aria-live="polite"
          >
            {statusLabel}
          </span>
        </div>
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

      {inWhatIf && activeScenario && (
        <div className={styles.scenarioBanner} role="status">
          <span className={styles.scenarioTag}>What-if</span>
          <span className={styles.scenarioText}>
            <strong>{activeScenario.label} ({activeScenario.scaleHint})</strong> —
            hypothetical, not live data. {activeScenario.description}
          </span>
          <button
            type="button"
            className={styles.scenarioReset}
            onClick={() => setScenario(null)}
          >
            Return to live
          </button>
        </div>
      )}

      <main className={styles.main}>
        {tab === "live" && (
          <section className={styles.liveGrid} aria-label="Live conditions">
            <div className={styles.cell}>
              <Inbound snapshot={displaySnapshot} scale={scale} arrival={arrival} />
            </div>
            <div className={styles.cell}>
              <Now snapshot={displaySnapshot} scale={scale} />
            </div>
            <div className={styles.cell}>
              <ImpactActions scale={scale} onOpenScales={() => setTab("scales")} />
            </div>
          </section>
        )}

        {tab === "ask" && (
          <section className={styles.single} aria-label="Ask">
            <Ask />
          </section>
        )}

        {tab === "replay" && (
          <section className={styles.singleWide} aria-label="Historical replay">
            <HistoricalReplay />
          </section>
        )}

        {tab === "scales" && (
          <section className={styles.singleWide} aria-label="NOAA scale reference">
            <ScaleReference />
          </section>
        )}
      </main>

      <footer className={styles.footer}>
        <span className={styles.footerSources}>
          Sources: NOAA SWPC · NASA DONKI. Guidance:{" "}
          <button
            type="button"
            className={styles.footerLink}
            onClick={() => setTab("scales")}
          >
            NOAA Space Weather Scales
          </button>
          . Arrival estimates are physics-based with a ±6&nbsp;hour window.
        </span>
        <Link href="/judges" className={styles.judgesLink}>
          Judges’ demonstration ›
        </Link>
      </footer>
    </div>
  );
}
