/**
 * CME arrival-time estimator — pure, deterministic, client-safe.
 *
 * Formula:   travel_time_hours = distance_km / (speed_km_s * 3600)
 *            arrival_utc       = now_utc + travel_time_hours
 * Uncertainty: ±6 hours (per NOAA/CCMC standard guidance)
 *
 * Guard conditions — returns null when:
 *   - speed_km_s is null, undefined, zero, or negative
 *   - distance_km is null, undefined, or ≤ 0
 *
 * Never throws. Never produces NaN. All units are explicit.
 * No server imports — safe for client bundle and service worker.
 */

import type { ArrivalEstimate } from "./types";

/** Default uncertainty window in hours (NOAA/CCMC standard) */
const DEFAULT_UNCERTAINTY_HOURS = 6;

/**
 * Estimate CME arrival time.
 *
 * @param distanceKm  - Distance from Sun to Earth in km (typically ~149,597,870 km = 1 AU)
 * @param speedKmS    - CME speed in km/s (from DONKI analysis)
 * @param fromUtc     - Optional reference UTC time (defaults to now). ISO-8601 string.
 * @returns ArrivalEstimate or null if inputs are invalid (speed ≤ 0 or missing)
 */
export function estimateArrival(
  distanceKm: number | null | undefined,
  speedKmS: number | null | undefined,
  fromUtc?: string,
): ArrivalEstimate | null {
  // Guard: speed must be a positive number
  if (speedKmS === null || speedKmS === undefined || speedKmS <= 0 || !isFinite(speedKmS)) {
    return null;
  }

  // Guard: distance must be positive
  if (
    distanceKm === null ||
    distanceKm === undefined ||
    distanceKm <= 0 ||
    !isFinite(distanceKm)
  ) {
    return null;
  }

  // Compute travel time
  // distance_km / (speed_km_s * 3600 s/hr) = travel time in hours
  const travelTimeHours = distanceKm / (speedKmS * 3600);

  // Guard: result must be finite and reasonable (< 10 days = 240 hours)
  if (!isFinite(travelTimeHours) || travelTimeHours <= 0 || travelTimeHours > 240) {
    return null;
  }

  const referenceMs = fromUtc ? new Date(fromUtc).getTime() : Date.now();
  if (isNaN(referenceMs)) return null;

  const travelTimeMs = travelTimeHours * 3600 * 1000;
  const uncertaintyMs = DEFAULT_UNCERTAINTY_HOURS * 3600 * 1000;

  const arrivalMs = referenceMs + travelTimeMs;
  const earliestMs = arrivalMs - uncertaintyMs;
  const latestMs = arrivalMs + uncertaintyMs;

  return {
    arrivalUtc: new Date(arrivalMs).toISOString(),
    uncertaintyHours: DEFAULT_UNCERTAINTY_HOURS,
    earliestArrivalUtc: new Date(earliestMs).toISOString(),
    latestArrivalUtc: new Date(latestMs).toISOString(),
    distanceKm,
    speedKmS,
    travelTimeHours,
  };
}

/**
 * Standard Earth–Sun distance in km (1 Astronomical Unit).
 * Use as the default distance when no custom value is provided.
 */
export const EARTH_SUN_DISTANCE_KM = 149_597_870;
