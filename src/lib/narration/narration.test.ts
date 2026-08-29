/**
 * Tests for the narration orchestrator.
 * Verifies: Guardian fail → template returned; abstention when insufficient evidence;
 * no unsourced numbers in template output.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock cloud and guardian to isolate orchestrator logic
vi.mock("./cloud", () => ({
  callCloudNarration: vi.fn(),
}));
vi.mock("./guardian", () => ({
  gateWithGuardian: vi.fn(),
}));

import { narrate } from "./index";
import * as cloud from "./cloud";
import * as guardian from "./guardian";
import type { SpaceWeatherSnapshot } from "@/lib/data/types";
import { hasUnsourcedNumber } from "@/lib/core/no-unsourced-number.test";

const FULL_SNAPSHOT: SpaceWeatherSnapshot = {
  snapshotUtc: "2024-05-10T18:00:00.000Z",
  degraded: false,
  degradedSources: [],
  latestKp: {
    source: "NOAA-SWPC",
    fetchedAtUtc: "2024-05-10T18:00:00.000Z",
    timeTagUtc: "2024-05-10T18:00:00.000Z",
    kp: 7.0,
    aRunning: null,
    stationCount: null,
  },
  latestSolarWind: {
    source: "NOAA-SWPC",
    fetchedAtUtc: "2024-05-10T18:00:00.000Z",
    timeTagUtc: "2024-05-10T18:00:00.000Z",
    active: true,
    sensorSource: "SOLAR1",
    protonSpeedKmS: 750,
    protonDensityCm3: 10,
    protonTemperatureK: 100000,
    overallQuality: 0,
  },
  activeAlerts: [],
  recentCmes: [
    {
      source: "NASA-DONKI",
      fetchedAtUtc: "2024-05-10T16:00:00.000Z",
      activityId: "2024-05-08T06:09:00-CME-001",
      startTimeUtc: "2024-05-08T06:09:00.000Z",
      sourceLocation: "S17E79",
      activeRegionNum: 13664,
      primaryAnalysis: {
        time21_5Utc: "2024-05-08T10:45:00.000Z",
        speedKmS: 1437,
        halfAngleDeg: 40,
        isMostAccurate: true,
      },
      linkedEventIds: [],
      detailUrl: null,
    },
  ],
};

const EMPTY_SNAPSHOT: SpaceWeatherSnapshot = {
  snapshotUtc: "2024-05-10T18:00:00.000Z",
  degraded: true,
  degradedSources: ["NOAA-SWPC", "NASA-DONKI"],
  latestKp: null,
  latestSolarWind: null,
  activeAlerts: [],
  recentCmes: [],
};

beforeEach(() => {
  vi.restoreAllMocks();
  // Force the cloud (watsonx) provider so the online path exercises
  // callCloudNarration + gateWithGuardian (both mocked above). Without this, an
  // unconfigured env selects no provider and skips straight to the grounded
  // engine — which would defeat these online-path assertions.
  vi.stubEnv("NARRATION_PROVIDER", "watsonx");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("narrate — abstention", () => {
  it("abstains when asking about current conditions with no data", async () => {
    const result = await narrate("What is happening right now?", EMPTY_SNAPSHOT);
    expect(result.abstained).toBe(true);
    expect(result.answer).toContain("don't have");
  });

  it("abstains when asking about CME position with no CME data", async () => {
    const result = await narrate(
      "What is the exact position of the CME right now?",
      EMPTY_SNAPSHOT,
    );
    expect(result.abstained).toBe(true);
  });

  it("does not abstain when data is available", async () => {
    vi.mocked(cloud.callCloudNarration).mockResolvedValue(null); // no cloud
    const result = await narrate("What is the current storm level?", FULL_SNAPSHOT);
    expect(result.abstained).toBe(false);
  });
});

describe("narrate — Guardian fail → template fallback", () => {
  it("returns template when Guardian blocks the cloud narration", async () => {
    vi.mocked(cloud.callCloudNarration).mockResolvedValue({
      text: "The storm will definitely arrive at exactly 3:00 AM and Kp will be 8.5.",
      modelId: "ibm/granite-3-3-8b-instruct",
      success: true,
    });
    vi.mocked(guardian.gateWithGuardian).mockResolvedValue({
      passed: false,
      text: null,
      reason: "Contains unsupported claim",
    });

    const result = await narrate("When will the storm arrive?", FULL_SNAPSHOT);
    expect(result.abstained).toBe(false);
    expect(result.usedCloudModel).toBe(false);
    expect(result.answer).toBeTruthy();
    expect(result.answer.length).toBeGreaterThan(10);
  });

  it("returns cloud narration when Guardian passes", async () => {
    const cloudText =
      "The current G3 (Strong Storm) at Kp 7.0 km/s [NOAA SWPC · 18:00 UTC] means HF radio disruption is likely.";
    vi.mocked(cloud.callCloudNarration).mockResolvedValue({
      text: cloudText,
      modelId: "ibm/granite-3-3-8b-instruct",
      success: true,
    });
    vi.mocked(guardian.gateWithGuardian).mockResolvedValue({
      passed: true,
      text: cloudText,
    });

    const result = await narrate("What are the impacts?", FULL_SNAPSHOT);
    expect(result.usedCloudModel).toBe(true);
    expect(result.engine).toBe("granite-cloud");
    expect(result.answer).toBe(cloudText);
    expect(result.abstained).toBe(false);
  });
});

describe("narrate — template output contract", () => {
  it("template output passes the no-unsourced-number contract", async () => {
    vi.mocked(cloud.callCloudNarration).mockResolvedValue(null); // force template path

    const result = await narrate("What are current conditions?", FULL_SNAPSHOT);
    expect(result.abstained).toBe(false);
    expect(result.usedCloudModel).toBe(false);
    // Template output must not contain bare unsourced numbers
    expect(hasUnsourcedNumber(result.answer)).toBe(false);
  });

  it("offline flag bypasses cloud and uses the grounded engine", async () => {
    const result = await narrate("What is the storm level?", FULL_SNAPSHOT, true);
    expect(result.usedCloudModel).toBe(false);
    expect(result.engine).toBe("grounded");
    expect(result.answer).toBeTruthy();
  });
});

describe("narrate — sources", () => {
  it("returns sources array with NOAA attribution when data is available", async () => {
    vi.mocked(cloud.callCloudNarration).mockResolvedValue(null);

    const result = await narrate("What is the current Kp?", FULL_SNAPSHOT);
    expect(result.sources.length).toBeGreaterThan(0);
    expect(result.sources.some((s) => s.label.includes("NOAA"))).toBe(true);
  });
});
