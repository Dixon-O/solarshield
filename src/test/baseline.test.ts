import { describe, it, expect } from "vitest";

describe("M0 baseline", () => {
  it("passes — test runner is configured correctly", () => {
    expect(true).toBe(true);
  });

  it("UTC date parsing works correctly", () => {
    const iso = "2024-05-10T18:30:00.000Z";
    const d = new Date(iso);
    expect(d.getUTCFullYear()).toBe(2024);
    expect(d.getUTCMonth()).toBe(4); // May is 4 (0-indexed)
    expect(d.getUTCDate()).toBe(10);
  });
});
