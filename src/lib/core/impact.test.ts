/**
 * Tests for the impact lookup module.
 * Verifies that:
 * - G3 returns corpus-sourced effect text and citation URL
 * - G5 returns the extreme-storm actions checklist
 * - G0 returns the no-action response
 * - noData flag is false for known scales
 */

import { describe, it, expect } from "vitest";
import { lookupGeomagneticImpact } from "./impact";

describe("lookupGeomagneticImpact", () => {
  it("G3 impact includes corpus text and citation URL", () => {
    const impact = lookupGeomagneticImpact("G3");
    expect(impact.noData).toBe(false);
    expect(impact.citationUrl).toBe("https://www.swpc.noaa.gov/noaa-scales-explanation");
    expect(impact.scale).toBe("G3");
    expect(impact.scaleName).toBe("Strong Storm");

    // At least some effects should be present
    expect(impact.effects.length).toBeGreaterThan(0);

    // One of the effects should mention HF radio (verbatim from NOAA corpus)
    const hfEffect = impact.effects.find(
      (e) => e.system === "HF Radio" || e.description.toLowerCase().includes("hf"),
    );
    expect(hfEffect).toBeDefined();
  });

  it("G5 impact includes the full action checklist", () => {
    const impact = lookupGeomagneticImpact("G5");
    expect(impact.noData).toBe(false);
    expect(impact.actions.length).toBeGreaterThan(3);
    // Must mention GPS
    expect(impact.actions.some((a) => a.toLowerCase().includes("gps"))).toBe(true);
    // Must mention HF
    expect(impact.actions.some((a) => a.toLowerCase().includes("hf"))).toBe(true);
  });

  it("G0 returns no-action response without noData flag", () => {
    const impact = lookupGeomagneticImpact("G0");
    expect(impact.noData).toBe(false);
    expect(impact.actions.length).toBeGreaterThan(0);
    expect(impact.actions[0]).toContain("No action required");
  });

  it("G1 returns minor-impact actions", () => {
    const impact = lookupGeomagneticImpact("G1");
    expect(impact.noData).toBe(false);
    expect(impact.scale).toBe("G1");
    expect(impact.citationUrl).toContain("swpc.noaa.gov");
  });

  it("G4 has power grid action item", () => {
    const impact = lookupGeomagneticImpact("G4");
    expect(impact.actions.some((a) => a.toLowerCase().includes("power grid"))).toBe(true);
  });

  it("all G-scale levels return a citationUrl pointing to NOAA", () => {
    for (const scale of ["G0", "G1", "G2", "G3", "G4", "G5"] as const) {
      const impact = lookupGeomagneticImpact(scale);
      expect(impact.citationUrl).toContain("swpc.noaa.gov");
    }
  });
});
