"use client";

/**
 * HistoricalReplay — replays the May 2024 Gannon G5 storm.
 * Prominently labeled "Historical Replay — not live data."
 */

import { useState } from "react";
import replayData from "@/lib/corpus/gannon-2024-replay.json";
import { classifyGeomagnetic } from "@/lib/core";
import { Now } from "./Now";
import { Inbound } from "./Inbound";
import { ImpactActions } from "./ImpactActions";
import { estimateArrival, EARTH_SUN_DISTANCE_KM } from "@/lib/core";
import type { SpaceWeatherSnapshot } from "@/lib/data/types";
import styles from "./HistoricalReplay.module.css";

// Cast the replay data to the expected snapshot type
const REPLAY_SNAPSHOT = replayData.replaySnapshot as unknown as SpaceWeatherSnapshot;
const REPLAY_CME = REPLAY_SNAPSHOT.recentCmes[0];
const REPLAY_SPEED = REPLAY_CME?.primaryAnalysis?.speedKmS ?? null;

// Pre-compute arrival estimate from the replay CME
const REPLAY_ARRIVAL = estimateArrival(
  EARTH_SUN_DISTANCE_KM,
  REPLAY_SPEED,
  // Use the CME start time as the reference for the historical calculation
  REPLAY_CME?.startTimeUtc,
);

type TimelineEntry = { timeUtc: string; event: string; kp: number };

export function HistoricalReplay() {
  const [activeStep, setActiveStep] = useState(0);
  const timeline: TimelineEntry[] = replayData.timeline as TimelineEntry[];
  const scale = classifyGeomagnetic(REPLAY_SNAPSHOT.latestKp?.kp ?? null);

  return (
    <div className={styles.panel}>
      <div className={styles.replayBanner} role="alert">
        <span className={styles.replayIcon} aria-hidden="true">⏪</span>
        <span>
          <strong>Historical Replay — not live data.</strong>{" "}
          {replayData.eventName}: {replayData.description}
        </span>
      </div>

      <h2 className={styles.title}>May 2024 Gannon G5 Storm</h2>

      {/* Timeline scrubber */}
      <div className={styles.timeline}>
        {timeline.map((entry, i) => (
          <button
            key={i}
            className={`${styles.step} ${activeStep === i ? styles.stepActive : ""}`}
            onClick={() => setActiveStep(i)}
            aria-pressed={activeStep === i}
          >
            <span className={styles.stepTime}>
              {new Date(entry.timeUtc).toUTCString().slice(8, 17)}
            </span>
            <span className={styles.stepEvent}>{entry.event}</span>
            <span className={styles.stepKp}>Kp {entry.kp}</span>
          </button>
        ))}
      </div>

      {/* Show the peak snapshot (G5 conditions) for all steps — the replay shows "the worst" */}
      <div className={styles.panels}>
        <Now snapshot={REPLAY_SNAPSHOT} scale={scale} />
        <Inbound snapshot={REPLAY_SNAPSHOT} scale={scale} arrival={REPLAY_ARRIVAL} />
        <ImpactActions scale={scale} />
      </div>
    </div>
  );
}
