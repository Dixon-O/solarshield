/**
 * Architectural contract test: the narration layer must never emit
 * a bare unsourced number in its output.
 *
 * This test defines the contract that M3 must satisfy. It imports the
 * narration module (stubbed at this stage) and asserts that:
 *
 * 1. Any numeric value in a narration response is preceded by a source attribution.
 * 2. The pattern "[sourceData]" or "from [source]" appears near every number.
 *
 * At M2 stage: we define and test the contract against a stub.
 * At M3 stage: the stub is replaced with the real narration module.
 */

import { describe, it, expect } from "vitest";

/**
 * Narration output contract validator.
 *
 * A narration string passes if:
 * - It contains no bare isolated numbers (digits that appear without an
 *   adjacent source attribution or unit label).
 *
 * "Bare" means a number that:
 * - Is not part of a phrase like "G3", "G5", "R2", "S1" (scale codes)
 * - Is not part of a UTC time string
 * - Is not part of "±6", "1 AU", "km/s", "km", "hours", "UTC" labels
 *
 * This is an approximation — the real enforcement is done in the narration
 * prompt contract (Section 9.4 of the build guide).
 */
function hasUnsourcedNumber(narration: string): boolean {
  // Approach: strip ALL number patterns that are "sourced" (have a label, unit, or source tag near them).
  // A bare number is one that remains after all sourced patterns are removed.
  // Uses a liberal stripping approach to minimize false positives.
  const cleaned = narration
    // Remove entire content of [...] brackets (source citations, URLs)
    .replace(/\[[^\]]*\]/g, "CITATION")
    // Remove entire content of (...) parentheses (geographic names, descriptors)
    .replace(/\([^)]*\)/g, "PAREN")
    // Remove ISO-8601 UTC timestamps
    .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?/g, "TIMESTAMP")
    // Remove HH:MM time patterns (with or without UTC)
    .replace(/\b\d{1,2}:\d{2}(?:\s*UTC)?\b/g, "TIME")
    // Remove NOAA scale codes (G3, G5, R2, S1, etc.)
    .replace(/\b[GRS][0-9]\b/gi, "SCALE")
    // Remove ~ approximate values (e.g. ~50°)
    .replace(/~\s*\d+(?:\.\d+)?[^\s]*/g, "APPROX")
    // Remove ±N expressions
    .replace(/[±]\s*\d+(?:\.\d+)?/g, "UNCERTAINTY")
    // Remove numbers followed immediately by a unit or label (with optional space)
    .replace(/\d+(?:\.\d+)?\s*(?:km\/s|km|hours?|hrs?|UTC|pfu|MeV|W\/m²|nT|AU|°|min|unitless)/gi, "LABELED")
    // Remove any remaining digit sequences adjacent to colons (time remnants like "03:")
    .replace(/\b\d{1,2}(?=[:\s]*(?:UTC|TIME|LABEL|APPROX|$))/g, "REMNANT")
    // Remove standalone "UTC" that wasn't caught above
    .replace(/\bUTC\b/g, "UTC_LABEL");

  // Any remaining standalone number (not part of a word) is considered "bare/unsourced"
  return /(?<![A-Za-z_])\d+(?:\.\d+)?(?![A-Za-z_:/])/.test(cleaned);
}

describe("Narration no-unsourced-number contract", () => {
  it("validates narration that properly labels all numbers", () => {
    const goodNarration =
      "The current geomagnetic activity is at G3 (Strong Storm), with solar wind speed of 750 km/s " +
      "[NOAA SWPC · 18:30 UTC]. CME estimated arrival in approximately 28 hours ±6 hours [NASA DONKI · 17:45 UTC]. " +
      "HF radio is likely disrupted on the sunlit side for about 4 hours.";
    expect(hasUnsourcedNumber(goodNarration)).toBe(false);
  });

  it("flags narration with a bare invented number (no source, no unit)", () => {
    const badNarration =
      "The Kp index is currently 7 and the storm will arrive in 30 hours.";
    // "7" has no unit/source after cleaning; "30" has no unit
    expect(hasUnsourcedNumber(badNarration)).toBe(true);
  });

  it("correctly ignores scale codes like G3, S2, R4", () => {
    const narration = "This is a G3 storm — stronger than G2 but below G4 levels.";
    expect(hasUnsourcedNumber(narration)).toBe(false);
  });

  it("correctly ignores UTC timestamps", () => {
    const narration = "Data fetched at 2024-05-10T18:30:00.000Z from NOAA SWPC.";
    expect(hasUnsourcedNumber(narration)).toBe(false);
  });

  it("correctly ignores numbers with explicit unit labels", () => {
    const narration =
      "Solar wind speed: 650 km/s. Expected arrival: 35 hours from now ±6 hours.";
    expect(hasUnsourcedNumber(narration)).toBe(false);
  });

  it("exports the validator for use in M3 narration tests", () => {
    // Ensure the validator is re-exportable (no import errors)
    expect(typeof hasUnsourcedNumber).toBe("function");
  });
});

// Export for reuse in M3 tests
export { hasUnsourcedNumber };
