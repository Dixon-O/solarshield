/**
 * Tests for the geomagnetic severity classifier.
 * Verifies NOAA G-scale thresholds are applied verbatim.
 */

import { describe, it, expect } from "vitest";
import { classifyGeomagnetic, gScaleName, gScaleMinKp } from "./severity";

describe("classifyGeomagnetic", () => {
  it("Kp < 5 → G0 (below storm threshold)", () => {
    expect(classifyGeomagnetic(0)).toBe("G0");
    expect(classifyGeomagnetic(2.67)).toBe("G0");
    expect(classifyGeomagnetic(4.99)).toBe("G0");
  });

  it("Kp = 5 → G1 (Minor)", () => {
    expect(classifyGeomagnetic(5)).toBe("G1");
    expect(classifyGeomagnetic(5.33)).toBe("G1");
  });

  it("Kp = 6 → G2 (Moderate)", () => {
    expect(classifyGeomagnetic(6)).toBe("G2");
    expect(classifyGeomagnetic(6.67)).toBe("G2");
  });

  it("Kp = 7 → G3 (Strong)", () => {
    expect(classifyGeomagnetic(7)).toBe("G3");
    expect(classifyGeomagnetic(7.33)).toBe("G3");
  });

  it("Kp = 8 → G4 (Severe)", () => {
    expect(classifyGeomagnetic(8)).toBe("G4");
    expect(classifyGeomagnetic(8.67)).toBe("G4");
  });

  it("Kp ≥ 9 → G5 (Extreme)", () => {
    expect(classifyGeomagnetic(9)).toBe("G5");
    expect(classifyGeomagnetic(9.0)).toBe("G5");
  });

  it("May 2024 Gannon storm peak Kp = 9 → G5", () => {
    // The Gannon storm reached Kp = 9 (G5) — confirm the classifier matches
    expect(classifyGeomagnetic(9)).toBe("G5");
  });

  it("returns null when Kp is null", () => {
    expect(classifyGeomagnetic(null)).toBeNull();
  });

  it("returns null when Kp is undefined", () => {
    expect(classifyGeomagnetic(undefined)).toBeNull();
  });

  it("returns null when Kp is NaN", () => {
    expect(classifyGeomagnetic(NaN)).toBeNull();
  });

  it("returns null when Kp is Infinity", () => {
    expect(classifyGeomagnetic(Infinity)).toBeNull();
  });
});

describe("gScaleName", () => {
  it("returns the correct human-readable name for each level", () => {
    expect(gScaleName("G0")).toBe("Below Storm Threshold");
    expect(gScaleName("G1")).toBe("Minor Storm");
    expect(gScaleName("G2")).toBe("Moderate Storm");
    expect(gScaleName("G3")).toBe("Strong Storm");
    expect(gScaleName("G4")).toBe("Severe Storm");
    expect(gScaleName("G5")).toBe("Extreme Storm");
  });
});

describe("gScaleMinKp", () => {
  it("returns the correct Kp threshold for each level", () => {
    expect(gScaleMinKp("G0")).toBe(0);
    expect(gScaleMinKp("G1")).toBe(5);
    expect(gScaleMinKp("G2")).toBe(6);
    expect(gScaleMinKp("G3")).toBe(7);
    expect(gScaleMinKp("G4")).toBe(8);
    expect(gScaleMinKp("G5")).toBe(9);
  });
});
