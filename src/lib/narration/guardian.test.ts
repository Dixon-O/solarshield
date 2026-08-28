/**
 * Tests for the Granite Guardian gate.
 * Verifies: hallucinated number → passed: false; no credentials → passed: false.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { gateWithGuardian } from "./guardian";

beforeEach(() => {
  vi.restoreAllMocks();
  // Ensure no real env vars leak into tests
  vi.stubEnv("WATSONX_API_KEY", "");
  vi.stubEnv("WATSONX_PROJECT_ID", "");
});

describe("gateWithGuardian", () => {
  it("returns passed: false when credentials are not configured", async () => {
    const result = await gateWithGuardian("The storm will arrive at 3 AM.", { kp: 7 });
    expect(result.passed).toBe(false);
    expect(result.text).toBeNull();
    expect(result.reason).toContain("credentials");
  });

  it("blocks when Guardian returns unsafe verdict (mocked API)", async () => {
    vi.stubEnv("WATSONX_API_KEY", "test-key");
    vi.stubEnv("WATSONX_PROJECT_ID", "test-project");

    // Mock the IAM token fetch and Guardian API
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ access_token: "mock-token" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({ results: [{ generated_text: "unsafe" }] }),
        }),
    );

    const result = await gateWithGuardian(
      "The Kp will definitely reach 9.5 and the storm is guaranteed to arrive at 02:00 UTC.",
      { kp: 7, arrivalUtc: "2024-05-10T18:00:00Z" },
    );
    expect(result.passed).toBe(false);
    expect(result.text).toBeNull();
  });

  it("passes when Guardian returns safe verdict (mocked API)", async () => {
    vi.stubEnv("WATSONX_API_KEY", "test-key");
    vi.stubEnv("WATSONX_PROJECT_ID", "test-project");

    const goodText = "G3 storm in progress. Kp 7.0 km/s [NOAA SWPC · 18:00 UTC].";
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ access_token: "mock-token" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({ results: [{ generated_text: "safe" }] }),
        }),
    );

    const result = await gateWithGuardian(goodText, { kp: 7.0, scale: "G3" });
    expect(result.passed).toBe(true);
    expect(result.text).toBe(goodText);
  });

  it("returns passed: false on network error (fail-safe)", async () => {
    vi.stubEnv("WATSONX_API_KEY", "test-key");
    vi.stubEnv("WATSONX_PROJECT_ID", "test-project");

    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    const result = await gateWithGuardian("Some narration.", { kp: 7 });
    expect(result.passed).toBe(false);
  });
});
