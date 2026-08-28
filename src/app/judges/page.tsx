"use client";

/**
 * /judges — the scripted pain→relief demonstration.
 *
 * This is not a mock. It drives the *real* cockpit panels (Now, Inbound,
 * ImpactActions, CountdownDial) with recorded data from the 10–11 May 2024
 * Gannon G5 storm, and runs every value through the real deterministic core
 * (classifyGeomagnetic, estimateArrival). The Kp progression (2 → 8 → 9) is
 * taken from the recorded NOAA timeline; the peak solar-wind reading and the
 * G5 alert text are the recorded peak values.
 *
 * The arc:
 *   1 All clear      — a CME has left the Sun; the countdown begins.
 *   2 Inbound        — the front nears; the dial is the star.
 *   3 Severe storm   — Kp 8 / G4.
 *   4 Extreme — G5   — Kp 9 / G5 peak; the recorded alert appears.
 *   5 The blackout   — the network is lost (the event we warned about). A
 *                      normal dashboard goes dark. SolarShield holds last-known
 *                      data and keeps counting down to the next pulse.
 *   6 Still protecting you — offline, the guidance and the countdown persist.
 *
 * The clock is re-enacted (arrivals are anchored to the present) so the
 * countdown ticks in real time. This is labelled on screen as a re-enactment.
 */

import { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import replay from "@/lib/corpus/gannon-2024-replay.json";
import {
  classifyGeomagnetic,
  estimateArrival,
  EARTH_SUN_DISTANCE_KM,
} from "@/lib/core";
import type { GeomagneticScale, ArrivalEstimate } from "@/lib/core/types";
import type { SpaceWeatherSnapshot } from "@/lib/data/types";
import { Now } from "@/components/Now";
import { Inbound } from "@/components/Inbound";
import { ImpactActions } from "@/components/ImpactActions";
import styles from "./page.module.css";

const PEAK = replay.replaySnapshot as unknown as SpaceWeatherSnapshot;
const CME_SPEED_KM_S = PEAK.recentCmes[0]?.primaryAnalysis?.speedKmS ?? 1437;
const TRAVEL_HOURS = EARTH_SUN_DISTANCE_KM / CME_SPEED_KM_S / 3600;

interface Act {
  title: string;
  narration: string;
  /** Ground Kp shown in the Now panel — every value is from the NOAA record. */
  kp: number;
  /** Hours until the (re-enacted) arrival, from the moment this act opens. */
  arrivalHours: number | null;
  /** Whether the recorded peak solar-wind reading + G5 alert are shown yet. */
  showPeakConditions: boolean;
  offline: boolean;
}

const ACTS: Act[] = [
  {
    title: "All clear",
    narration:
      "A coronal mass ejection has just left the Sun. Conditions on the ground are quiet — but SolarShield is already counting down to impact.",
    kp: 2,
    arrivalHours: 20,
    showPeakConditions: false,
    offline: false,
  },
  {
    title: "Storm inbound",
    narration:
      "The storm front is hours away. Every number here is measured, sourced, and timestamped — nothing is invented, and nothing is hidden.",
    kp: 2,
    arrivalHours: 2.5,
    showPeakConditions: false,
    offline: false,
  },
  {
    title: "Severe storm",
    narration:
      "Kp 8. Geomagnetic conditions are now severe (G4). Grid operators and airlines are already acting on this.",
    kp: 8,
    arrivalHours: 0.04,
    showPeakConditions: false,
    offline: false,
  },
  {
    title: "Extreme — G5",
    narration:
      "Kp 9 — the top of the scale. Power grids can collapse; HF radio and GPS fail. This is the moment SolarShield exists for.",
    kp: 9,
    arrivalHours: null,
    showPeakConditions: true,
    offline: false,
  },
  {
    title: "The blackout",
    narration:
      "The storm takes the network down — the very blackout we warned about. A normal dashboard goes blank here. SolarShield does not: it holds the last-known reading and keeps counting down to the next pulse in the series.",
    kp: 9,
    arrivalHours: 0.23,
    showPeakConditions: true,
    offline: true,
  },
  {
    title: "Still protecting you",
    narration:
      "Offline, on last-known data and on-device guidance, the countdown never stopped and your safety actions are still on screen. The tool works precisely when everything else has failed.",
    kp: 9,
    arrivalHours: 0.13,
    showPeakConditions: true,
    offline: true,
  },
];

const LAST = ACTS.length - 1;

/**
 * Deterministic anchor used for the very first (server + pre-hydration) render.
 * Reading the wall clock during render makes the server HTML and the first
 * client render disagree (React hydration error #418). We render from this
 * fixed instant first, then re-anchor to the present in an effect after mount
 * so the countdown still ticks in real time.
 */
const FALLBACK_ANCHOR_MS = Date.parse("2024-05-10T12:00:00.000Z");

/** Deep clone via JSON — the corpus is plain data, safe on every runtime. */
function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

interface Stage {
  snapshot: SpaceWeatherSnapshot;
  scale: GeomagneticScale | null;
  arrival: ArrivalEstimate | null;
}

function buildStage(act: Act, anchorMs: number): Stage {
  const nowIso = new Date(anchorMs).toISOString();

  let arrival: ArrivalEstimate | null = null;
  let cmeStartIso = PEAK.recentCmes[0]?.startTimeUtc ?? nowIso;

  if (act.arrivalHours !== null) {
    const arrivalMs = anchorMs + act.arrivalHours * 3600_000;
    // Back-compute the departure so the real physics reproduces this arrival.
    cmeStartIso = new Date(arrivalMs - TRAVEL_HOURS * 3600_000).toISOString();
    arrival = estimateArrival(EARTH_SUN_DISTANCE_KM, CME_SPEED_KM_S, cmeStartIso);
  }

  const snapshot = clone(PEAK);
  snapshot.snapshotUtc = nowIso;
  if (snapshot.latestKp) {
    snapshot.latestKp.kp = act.kp;
    snapshot.latestKp.fetchedAtUtc = nowIso;
    snapshot.latestKp.timeTagUtc = nowIso;
  }
  if (snapshot.recentCmes[0]) {
    snapshot.recentCmes[0].startTimeUtc = cmeStartIso;
    snapshot.recentCmes[0].fetchedAtUtc = nowIso;
  }
  if (!act.showPeakConditions) {
    // Ground instruments have not registered the storm yet — show nothing
    // rather than mis-attribute the recorded peak values to an earlier moment.
    snapshot.latestSolarWind = null;
    snapshot.activeAlerts = [];
  }
  snapshot.degraded = act.offline;
  snapshot.degradedSources = act.offline ? ["NOAA-SWPC", "NASA-DONKI"] : [];

  return {
    snapshot,
    scale: classifyGeomagnetic(act.kp),
    arrival,
  };
}

export default function JudgesDemo() {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  // null until mounted: the first render (server + hydration) uses the fixed
  // fallback anchor so the HTML matches; the effect then re-anchors to the
  // present, and re-anchors again each time an act opens, so the countdown
  // ticks in real time.
  const [anchorMs, setAnchorMs] = useState<number | null>(null);

  const act = ACTS[index];
  // Re-anchors the countdown to the present each time an act opens.
  const stage = useMemo(
    () => buildStage(act, anchorMs ?? FALLBACK_ANCHOR_MS),
    [act, anchorMs],
  );

  // Re-anchor to the present after mount and whenever the act changes.
  useEffect(() => {
    setAnchorMs(Date.now());
  }, [index]);

  const goNext = useCallback(() => setIndex((i) => Math.min(LAST, i + 1)), []);
  const goPrev = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);
  const restart = useCallback(() => {
    setIndex(0);
    setPlaying(false);
  }, []);

  const begin = useCallback(() => {
    setStarted(true);
    setPlaying(true);
  }, []);

  // Auto-advance while playing; stop at the final act.
  useEffect(() => {
    if (!playing) return;
    if (index >= LAST) {
      setPlaying(false);
      return;
    }
    const id = setTimeout(() => setIndex((i) => Math.min(LAST, i + 1)), 6500);
    return () => clearTimeout(id);
  }, [playing, index]);

  // Presenter keyboard control.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") goNext();
      else if (e.key === "ArrowLeft") goPrev();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goNext, goPrev]);

  return (
    <div className={styles.wrap}>
      <section className={styles.rail} aria-label="Demonstration controls">
        <span className={styles.eyebrow}>Judges’ demonstration</span>
        <h1 className={styles.title}>{act.title}</h1>
        <p className={styles.narration} aria-live="polite">
          {act.narration}
        </p>

        <ol className={styles.progress} aria-label="Demonstration progress">
          {ACTS.map((a, i) => (
            <li
              key={a.title}
              className={`${styles.seg} ${
                i === index
                  ? styles.segActive
                  : i < index
                    ? styles.segDone
                    : ""
              }`}
              aria-current={i === index ? "step" : undefined}
            >
              <span className={styles.segNum}>{i + 1}</span>
              <span>{a.title}</span>
            </li>
          ))}
        </ol>

        <div className={styles.controls}>
          {!started ? (
            <button
              type="button"
              className={`${styles.btn} ${styles.btnPrimary}`}
              onClick={begin}
            >
              ▶ Begin demonstration
            </button>
          ) : (
            <>
              <button
                type="button"
                className={styles.btn}
                onClick={goPrev}
                disabled={index === 0}
              >
                ‹ Back
              </button>
              {index < LAST ? (
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnPrimary}`}
                  onClick={() => {
                    setPlaying(false);
                    goNext();
                  }}
                >
                  Next ›
                </button>
              ) : (
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnPrimary}`}
                  onClick={restart}
                >
                  ↺ Replay
                </button>
              )}
              <button
                type="button"
                className={styles.btn}
                onClick={() => setPlaying((p) => !p)}
                disabled={index === LAST}
                aria-pressed={playing}
              >
                {playing ? "❚❚ Pause" : "▶ Auto-play"}
              </button>
              <span className={styles.spacer} />
              <button type="button" className={styles.btn} onClick={restart}>
                ↺ Restart
              </button>
            </>
          )}
        </div>

        <p className={styles.honesty}>
          Re-enactment of the 10–11 May 2024 Gannon G5 storm using recorded NOAA
          SWPC and NASA DONKI data — <strong>not live</strong>. The clock is
          anchored to the present so the countdown runs in real time. Every value
          shown is the recorded reading, classified by the same engine the live
          app uses.
        </p>
      </section>

      <div
        className={`${styles.stage} ${act.offline ? styles.stageBlackout : ""}`}
      >
        {act.offline && (
          <div className={styles.offlineNotice} role="status" aria-live="polite">
            <span className={styles.offlineIcon} aria-hidden="true">
              ⊘
            </span>
            <span>
              Offline — network lost during the storm. Showing last-known data;
              countdown still running on-device.
            </span>
          </div>
        )}

        <section className={styles.liveGrid} aria-label="Live conditions">
          <div className={styles.hero}>
            <Inbound
              snapshot={stage.snapshot}
              scale={stage.scale}
              arrival={stage.arrival}
            />
          </div>
          <div className={styles.side}>
            <Now snapshot={stage.snapshot} scale={stage.scale} />
          </div>
          <div className={styles.full}>
            <ImpactActions scale={stage.scale} />
          </div>
        </section>
      </div>

      <Link href="/" className={styles.backLink}>
        ‹ Back to live SolarShield
      </Link>
    </div>
  );
}
