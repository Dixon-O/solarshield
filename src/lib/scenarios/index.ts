/**
 * What-if scenarios — synthetic space-weather snapshots for the judges' demo.
 *
 * HONESTY CONTRACT
 * ----------------
 * These snapshots are hypothetical. They are NEVER shown without an unmissable
 * "What-if — hypothetical, not live data" banner and a "What-if" status pill,
 * exactly like the app's existing Historical Replay. The synthetic alert text
 * is prefixed "[HYPOTHETICAL]" so even the raw message reads as non-live.
 *
 * The snapshots feed the *same* deterministic core (classifyGeomagnetic,
 * estimateArrival) and the *same* panels as live data — so what a judge sees in
 * a scenario is exactly what the app would show if NOAA/NASA reported these
 * values for real. Nothing here fabricates a data path; it fabricates inputs,
 * clearly labelled.
 *
 * Timestamps are computed at call time from Date.now() so the countdown always
 * ticks toward a sensible future arrival regardless of when the demo is run.
 */

import { EARTH_SUN_DISTANCE_KM } from "@/lib/core";
import type {
  SpaceWeatherSnapshot,
  KpRecord,
  SolarWindRecord,
  CmeRecord,
  AlertRecord,
} from "@/lib/data/types";

export type ScenarioId = "calm" | "minor" | "storm" | "severe" | "extreme";

export interface ScenarioDef {
  id: ScenarioId;
  /** Short label for the picker */
  label: string;
  /** The NOAA G-scale this scenario lands on (for the picker only) */
  scaleHint: string;
  /** One-line description */
  description: string;
}

/** Ordered list for the What-if picker (calm → extreme). */
export const SCENARIOS: ScenarioDef[] = [
  { id: "calm",    label: "Calm",             scaleHint: "G0", description: "Quiet Sun — no active storming." },
  { id: "minor",   label: "Minor storm",      scaleHint: "G1", description: "A slow CME and minor geomagnetic activity." },
  { id: "storm",   label: "Strong storm",     scaleHint: "G3", description: "A fast CME inbound; strong geomagnetic storm." },
  { id: "severe",  label: "Severe storm",     scaleHint: "G4", description: "Severe storm — grid and GPS impacts likely." },
  { id: "extreme", label: "Extreme (Gannon)", scaleHint: "G5", description: "Extreme G5, the May-2024 class of event." },
];

interface ScenarioSpec {
  kp: number;
  windSpeedKmS: number;
  densityCm3: number;
  /** CME speed; null = no CME in this scenario */
  cmeSpeedKmS: number | null;
  /** Desired hours until arrival (used to back-solve the CME start time) */
  hoursUntilArrival: number;
  sourceLocation: string | null;
  /** NOAA alert lines (already hypothetical-prefixed at build time) */
  alertMessages: string[];
}

const SPECS: Record<ScenarioId, ScenarioSpec> = {
  calm: {
    kp: 2.0, windSpeedKmS: 380, densityCm3: 3.0,
    cmeSpeedKmS: null, hoursUntilArrival: 0, sourceLocation: null,
    alertMessages: [],
  },
  minor: {
    kp: 5.0, windSpeedKmS: 450, densityCm3: 4.5,
    cmeSpeedKmS: 650, hoursUntilArrival: 20, sourceLocation: "N12W05",
    alertMessages: ["Geomagnetic K-index of 5 (G1 — Minor) Watch."],
  },
  storm: {
    kp: 7.0, windSpeedKmS: 620, densityCm3: 9.0,
    cmeSpeedKmS: 1000, hoursUntilArrival: 12, sourceLocation: "S18E22",
    alertMessages: ["Geomagnetic K-index of 7 (G3 — Strong) Warning."],
  },
  severe: {
    kp: 8.33, windSpeedKmS: 760, densityCm3: 14.0,
    cmeSpeedKmS: 1500, hoursUntilArrival: 6, sourceLocation: "S22W10",
    alertMessages: ["Geomagnetic K-index of 8 (G4 — Severe) Warning."],
  },
  extreme: {
    kp: 9.0, windSpeedKmS: 900, densityCm3: 28.0,
    cmeSpeedKmS: 1950, hoursUntilArrival: 3, sourceLocation: "S17E08",
    alertMessages: [
      "Geomagnetic K-index of 9 (G5 — Extreme) Warning.",
      "Widespread voltage-control problems and grid protective-system issues possible.",
    ],
  },
};

const HYPOTHETICAL = "[HYPOTHETICAL] ";

function isoNow(offsetHours = 0): string {
  return new Date(Date.now() + offsetHours * 3600 * 1000).toISOString();
}

/**
 * Build a fully-typed, clearly-hypothetical snapshot for a scenario.
 * Timestamps are fresh on every call so the countdown ticks correctly.
 */
export function buildScenarioSnapshot(id: ScenarioId): SpaceWeatherSnapshot {
  const spec = SPECS[id];
  const now = isoNow(0);

  const latestKp: KpRecord = {
    source: "NOAA-SWPC",
    fetchedAtUtc: now,
    timeTagUtc: now,
    kp: spec.kp,
    aRunning: null,
    stationCount: null,
  };

  const latestSolarWind: SolarWindRecord = {
    source: "NOAA-SWPC",
    fetchedAtUtc: now,
    timeTagUtc: now,
    active: true,
    sensorSource: "SIM-DSCOVR",
    protonSpeedKmS: spec.windSpeedKmS,
    protonDensityCm3: spec.densityCm3,
    protonTemperatureK: null,
    overallQuality: 0,
  };

  const activeAlerts: AlertRecord[] = spec.alertMessages.map((m, i) => ({
    source: "NOAA-SWPC",
    fetchedAtUtc: now,
    productId: `SIM-${id.toUpperCase()}-${i + 1}`,
    issueDatetimeUtc: now,
    message: HYPOTHETICAL + m,
  }));

  const recentCmes: CmeRecord[] = [];
  if (spec.cmeSpeedKmS != null) {
    // Back-solve the CME start time so arrival lands hoursUntilArrival from now.
    const travelHours = EARTH_SUN_DISTANCE_KM / spec.cmeSpeedKmS / 3600;
    const startOffsetHours = spec.hoursUntilArrival - travelHours;
    recentCmes.push({
      source: "NASA-DONKI",
      fetchedAtUtc: now,
      activityId: `SIM-${id.toUpperCase()}-CME-001`,
      startTimeUtc: isoNow(startOffsetHours),
      sourceLocation: spec.sourceLocation,
      activeRegionNum: null,
      primaryAnalysis: {
        time21_5Utc: null,
        speedKmS: spec.cmeSpeedKmS,
        halfAngleDeg: null,
        isMostAccurate: true,
      },
      linkedEventIds: [],
      detailUrl: null,
    });
  }

  return {
    snapshotUtc: now,
    degraded: false,
    degradedSources: [],
    latestKp,
    latestSolarWind,
    activeAlerts,
    recentCmes,
  };
}
