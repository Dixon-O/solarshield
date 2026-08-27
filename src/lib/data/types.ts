/**
 * Shared data types for the SolarShield data layer.
 *
 * Rules:
 * - Every sourced value carries `source` and `fetchedAtUtc` (ISO-8601 UTC string).
 * - Optional/missing fields are `| null` — never invented.
 * - Units are explicit in field names and JSDoc.
 */

// ---------------------------------------------------------------------------
// Source attribution — attached to every value shown in the UI
// ---------------------------------------------------------------------------

export type DataSource = "NOAA-SWPC" | "NASA-DONKI";

export interface SourceTag {
  /** Which data feed this value came from */
  source: DataSource;
  /** UTC ISO-8601 timestamp of when this value was fetched from the upstream API */
  fetchedAtUtc: string;
}

// ---------------------------------------------------------------------------
// NOAA SWPC — Planetary K-index
// Shape observed from: https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json
// ---------------------------------------------------------------------------

export interface KpRecord extends SourceTag {
  /** 3-hour interval start time — UTC ISO-8601 (as returned by NOAA, no trailing Z) */
  timeTagUtc: string;
  /** 3-hour Kp index (0–9, may be fractional e.g. 2.67) */
  kp: number;
  /** Running a-index */
  aRunning: number | null;
  /** Number of contributing stations */
  stationCount: number | null;
}

// ---------------------------------------------------------------------------
// NOAA SWPC — Real-Time Solar Wind (RTSW)
// Shape observed from: https://services.swpc.noaa.gov/json/rtsw/rtsw_wind_1m.json
// ---------------------------------------------------------------------------

export interface SolarWindRecord extends SourceTag {
  /** UTC ISO-8601 timestamp */
  timeTagUtc: string;
  /** Whether this record is from the active sensor */
  active: boolean;
  /** Sensor source identifier (e.g. "SOLAR1") */
  sensorSource: string | null;
  /** Proton bulk speed in km/s */
  protonSpeedKmS: number | null;
  /** Proton number density in cm⁻³ */
  protonDensityCm3: number | null;
  /** Proton temperature in Kelvin */
  protonTemperatureK: number | null;
  /** Overall data quality flag (0 = best) */
  overallQuality: number | null;
}

// ---------------------------------------------------------------------------
// NOAA SWPC — Alerts / Watches / Warnings
// Shape observed from: https://services.swpc.noaa.gov/products/alerts.json
// ---------------------------------------------------------------------------

export interface AlertRecord extends SourceTag {
  /** NOAA product code (e.g. "A30F", "EF3A") */
  productId: string;
  /** UTC issue datetime string from NOAA (format: "YYYY-MM-DD HH:mm:ss.SSS") */
  issueDatetimeUtc: string;
  /** Raw message text from NOAA */
  message: string;
}

// ---------------------------------------------------------------------------
// NASA DONKI — CME (Coronal Mass Ejection)
// Shape observed from: https://api.nasa.gov/DONKI/CME
// ---------------------------------------------------------------------------

export interface CmeAnalysis {
  /** Time the CME reached 21.5 solar radii — UTC ISO-8601 */
  time21_5Utc: string | null;
  /** CME speed in km/s (from the most-accurate analysis) */
  speedKmS: number | null;
  /** Half-angle of the CME cone in degrees */
  halfAngleDeg: number | null;
  /** Whether this is the most accurate analysis for this event */
  isMostAccurate: boolean;
}

export interface CmeRecord extends SourceTag {
  /** DONKI activity ID (e.g. "2024-05-08T06:09:00-CME-001") */
  activityId: string;
  /** CME start time — UTC ISO-8601 */
  startTimeUtc: string;
  /** Source location on the solar disk (e.g. "S17E79") */
  sourceLocation: string | null;
  /** Active region number (NOAA) */
  activeRegionNum: number | null;
  /** Most-accurate analysis for this CME, if available */
  primaryAnalysis: CmeAnalysis | null;
  /** IDs of linked events (flares, etc.) */
  linkedEventIds: string[];
  /** DONKI detail URL */
  detailUrl: string | null;
}

// ---------------------------------------------------------------------------
// Merged snapshot — the full picture at a point in time
// ---------------------------------------------------------------------------

export interface SpaceWeatherSnapshot {
  /** UTC ISO-8601 timestamp when this snapshot was assembled */
  snapshotUtc: string;
  /** Whether any upstream source was unavailable (degraded = true means partial data) */
  degraded: boolean;
  /** Source(s) that were unavailable, if any */
  degradedSources: DataSource[];
  /** Most recent Kp reading (null if NOAA unavailable) */
  latestKp: KpRecord | null;
  /** Most recent real-time solar wind reading (null if unavailable) */
  latestSolarWind: SolarWindRecord | null;
  /** Active alerts/watches/warnings (empty array if none or unavailable) */
  activeAlerts: AlertRecord[];
  /** Recent CME events from DONKI (empty array if unavailable) */
  recentCmes: CmeRecord[];
}
