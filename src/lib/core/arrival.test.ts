/**
 * Tests for the CME arrival-time estimator.
 *
 * Covers: known inputs → correct output; zero/null speed → null; unreasonable
 * travel times → null; correct uncertainty window; UTC handling.
 */

import { describe, it, expect } from "vitest";
import { estimateArrival, EARTH_SUN_DISTANCE_KM } from "./arrival";

/** Reference time for deterministic tests */
const REF_UTC = "2024-05-10T12:00:00.000Z";
const REF_MS = new Date(REF_UTC).getTime();

describe("estimateArrival", () => {
  it("computes correct travel time for a 1000 km/s CME over 1 AU", () => {
    const result = estimateArrival(EARTH_SUN_DISTANCE_KM, 1000, REF_UTC);
    expect(result).not.toBeNull();

    // Expected: 149,597,870 km / (1000 km/s * 3600 s/h) ≈ 41.554 hours
    expect(result!.travelTimeHours).toBeCloseTo(41.554, 2);
    expect(result!.speedKmS).toBe(1000);
    expect(result!.distanceKm).toBe(EARTH_SUN_DISTANCE_KM);

    // Arrival UTC must be REF + travel time
    const expectedArrivalMs = REF_MS + result!.travelTimeHours * 3600 * 1000;
    expect(new Date(result!.arrivalUtc).getTime()).toBeCloseTo(expectedArrivalMs, -3);
  });

  it("computes correct travel time for May 2024 Gannon storm CME (1437 km/s)", () => {
    const result = estimateArrival(EARTH_SUN_DISTANCE_KM, 1437, REF_UTC);
    expect(result).not.toBeNull();
    // 149,597,870 / (1437 * 3600) ≈ 28.93 hours
    expect(result!.travelTimeHours).toBeCloseTo(28.93, 1);
  });

  it("applies the standard ±6-hour uncertainty window", () => {
    const result = estimateArrival(EARTH_SUN_DISTANCE_KM, 800, REF_UTC);
    expect(result).not.toBeNull();
    expect(result!.uncertaintyHours).toBe(6);

    const arrivalMs = new Date(result!.arrivalUtc).getTime();
    const earliestMs = new Date(result!.earliestArrivalUtc).getTime();
    const latestMs = new Date(result!.latestArrivalUtc).getTime();

    expect(arrivalMs - earliestMs).toBe(6 * 3600 * 1000);
    expect(latestMs - arrivalMs).toBe(6 * 3600 * 1000);
  });

  it("returns null when speed is 0", () => {
    expect(estimateArrival(EARTH_SUN_DISTANCE_KM, 0, REF_UTC)).toBeNull();
  });

  it("returns null when speed is negative", () => {
    expect(estimateArrival(EARTH_SUN_DISTANCE_KM, -500, REF_UTC)).toBeNull();
  });

  it("returns null when speed is null", () => {
    expect(estimateArrival(EARTH_SUN_DISTANCE_KM, null, REF_UTC)).toBeNull();
  });

  it("returns null when speed is undefined", () => {
    expect(estimateArrival(EARTH_SUN_DISTANCE_KM, undefined, REF_UTC)).toBeNull();
  });

  it("returns null when speed is NaN", () => {
    expect(estimateArrival(EARTH_SUN_DISTANCE_KM, NaN, REF_UTC)).toBeNull();
  });

  it("returns null when distance is 0", () => {
    expect(estimateArrival(0, 800, REF_UTC)).toBeNull();
  });

  it("returns null when distance is null", () => {
    expect(estimateArrival(null, 800, REF_UTC)).toBeNull();
  });

  it("returns null when distance is undefined", () => {
    expect(estimateArrival(undefined, 800, REF_UTC)).toBeNull();
  });

  it("arrivalUtc is a valid ISO-8601 UTC string", () => {
    const result = estimateArrival(EARTH_SUN_DISTANCE_KM, 600, REF_UTC);
    expect(result).not.toBeNull();
    const d = new Date(result!.arrivalUtc);
    expect(isNaN(d.getTime())).toBe(false);
    expect(result!.arrivalUtc.endsWith("Z")).toBe(true);
  });

  it("works without explicit fromUtc (uses current time)", () => {
    const before = Date.now();
    const result = estimateArrival(EARTH_SUN_DISTANCE_KM, 800);
    const after = Date.now();
    expect(result).not.toBeNull();
    const arrivalMs = new Date(result!.arrivalUtc).getTime();
    // Arrival must be after now
    expect(arrivalMs).toBeGreaterThan(before);
    expect(arrivalMs).toBeLessThan(after + result!.travelTimeHours * 3600 * 1000 + 5000);
  });

  it("returns null for unreasonably long travel times (>240h)", () => {
    // A CME going at 1 km/s would take ~41554 hours — reject it
    expect(estimateArrival(EARTH_SUN_DISTANCE_KM, 1, REF_UTC)).toBeNull();
  });
});
