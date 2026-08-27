/**
 * Geomagnetic severity classifier — pure, deterministic, client-safe.
 *
 * Maps Kp index values to NOAA G-scale levels using verbatim NOAA thresholds.
 * Source: https://www.swpc.noaa.gov/noaa-scales-explanation
 *
 * Thresholds (3-hour Kp index):
 *   G1: Kp = 5
 *   G2: Kp = 6
 *   G3: Kp = 7
 *   G4: Kp = 8
 *   G5: Kp ≥ 9
 *   G0: Kp < 5 (below storm threshold — not an official NOAA storm scale level)
 *
 * Returns null when input is null/undefined — never invents a classification.
 * No server imports — safe for client bundle and service worker.
 */

import type { GeomagneticScale } from "./types";

/**
 * Classify a Kp index value into a NOAA G-scale storm level.
 *
 * @param kp - 3-hour planetary Kp index (0–9, may be fractional)
 * @returns NOAA G-scale level, or null if input is null/undefined
 */
export function classifyGeomagnetic(kp: number | null | undefined): GeomagneticScale | null {
  if (kp === null || kp === undefined || !isFinite(kp) || isNaN(kp)) return null;

  // NOAA G-scale thresholds — verbatim from NOAA Space Weather Scales documentation
  if (kp >= 9) return "G5";
  if (kp >= 8) return "G4";
  if (kp >= 7) return "G3";
  if (kp >= 6) return "G2";
  if (kp >= 5) return "G1";
  return "G0"; // below storm threshold
}

/**
 * Human-readable name for a G-scale level.
 */
export function gScaleName(scale: GeomagneticScale): string {
  const names: Record<GeomagneticScale, string> = {
    G0: "Below Storm Threshold",
    G1: "Minor Storm",
    G2: "Moderate Storm",
    G3: "Strong Storm",
    G4: "Severe Storm",
    G5: "Extreme Storm",
  };
  return names[scale];
}

/**
 * Minimum Kp threshold for a given G-scale level.
 * Useful for displaying the threshold in the /judges panel.
 */
export function gScaleMinKp(scale: GeomagneticScale): number {
  const thresholds: Record<GeomagneticScale, number> = {
    G0: 0,
    G1: 5,
    G2: 6,
    G3: 7,
    G4: 8,
    G5: 9,
  };
  return thresholds[scale];
}
