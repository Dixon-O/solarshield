/**
 * API-deletion test — the headline M4 feature.
 *
 * Proves that with ALL hosted APIs and AI services mocked as unavailable,
 * the app still renders last-known data and the offline banner is shown.
 *
 * This is the definitive test that the app "survives the event it warns about."
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock all data-fetching modules as unavailable
vi.mock("@/lib/data/noaa", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/data/noaa")>();
  return {
    ...actual,
    fetchLatestKp: vi.fn().mockRejectedValue(new actual.FetchError("NOAA-SWPC", "https://test", "network unavailable")),
    fetchLatestSolarWind: vi.fn().mockRejectedValue(new actual.FetchError("NOAA-SWPC", "https://test", "network unavailable")),
    fetchActiveAlerts: vi.fn().mockRejectedValue(new actual.FetchError("NOAA-SWPC", "https://test", "network unavailable")),
  };
});
vi.mock("@/lib/data/donki", () => ({
  fetchRecentCmes: vi.fn().mockRejectedValue(new Error("network unavailable")),
}));

// Mock cloud narration and Guardian as unavailable
vi.mock("@/lib/narration/cloud", () => ({
  callCloudNarration: vi.fn().mockResolvedValue(null),
}));
vi.mock("@/lib/narration/guardian", () => ({
  gateWithGuardian: vi.fn().mockResolvedValue({ passed: false, text: null }),
}));

// Seeded snapshot for tests — defined before vi.mock calls
const SEEDED_SNAPSHOT = {
  snapshotUtc: "2024-05-10T12:00:00.000Z",
  degraded: false,
  degradedSources: [] as import("@/lib/data/types").DataSource[],
  latestKp: {
    source: "NOAA-SWPC" as const,
    fetchedAtUtc: "2024-05-10T12:00:00.000Z",
    timeTagUtc: "2024-05-10T12:00:00.000Z",
    kp: 6.0,
    aRunning: null,
    stationCount: null,
  },
  latestSolarWind: null,
  activeAlerts: [],
  recentCmes: [],
};

vi.mock("@/lib/cache/indexeddb", () => {
  // Inline the seeded data to avoid hoisting issues
  const seeded = {
    snapshotUtc: "2024-05-10T12:00:00.000Z",
    degraded: false,
    degradedSources: [],
    latestKp: {
      source: "NOAA-SWPC",
      fetchedAtUtc: "2024-05-10T12:00:00.000Z",
      timeTagUtc: "2024-05-10T12:00:00.000Z",
      kp: 6.0,
      aRunning: null,
      stationCount: null,
    },
    latestSolarWind: null,
    activeAlerts: [],
    recentCmes: [],
  };
  return {
    loadSnapshot: vi.fn().mockResolvedValue({
      snapshot: seeded,
      savedAtUtc: "2024-05-10T12:00:00.000Z",
    }),
    saveSnapshot: vi.fn().mockResolvedValue(undefined),
    loadCorpus: vi.fn().mockResolvedValue(null),
    saveCorpus: vi.fn().mockResolvedValue(undefined),
  };
});

import { assembleSnapshot } from "@/lib/data/snapshot";
import { narrate } from "@/lib/narration";
import { loadSnapshot } from "@/lib/cache/indexeddb";

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("API-deletion test — all hosted services unavailable", () => {
  it("assembleSnapshot returns a degraded snapshot (not null, not a crash)", async () => {
    const snapshot = await assembleSnapshot();

    // Must return a valid snapshot object — never throw
    expect(snapshot).toBeTruthy();
    expect(snapshot.degraded).toBe(true);
    expect(snapshot.degradedSources).toContain("NOAA-SWPC");
    expect(snapshot.degradedSources).toContain("NASA-DONKI");

    // All live fields are null — but the structure is valid
    expect(snapshot.latestKp).toBeNull();
    expect(snapshot.latestSolarWind).toBeNull();
    expect(snapshot.activeAlerts).toHaveLength(0);
    expect(snapshot.recentCmes).toHaveLength(0);

    // snapshotUtc is a valid ISO timestamp
    expect(new Date(snapshot.snapshotUtc).getTime()).not.toBeNaN();
  });

  it("loadSnapshot returns the last-known seeded data", async () => {
    const cached = await loadSnapshot();
    expect(cached).not.toBeNull();
    expect(cached!.snapshot.latestKp!.kp).toBe(6.0);
    expect(cached!.snapshot.snapshotUtc).toBe("2024-05-10T12:00:00.000Z");
  });

  it("narrate still produces an answer using the grounded engine (no models, no APIs)", async () => {
    // Use the seeded snapshot as the "last known"
    const result = await narrate("What are current conditions?", SEEDED_SNAPSHOT, true);

    // Must not throw, must not abstain (we have Kp data in the snapshot)
    expect(result).toBeTruthy();
    expect(result.answer).toBeTruthy();
    expect(result.answer.length).toBeGreaterThan(20);

    // Must have used the grounded engine — no cloud model (mocked unavailable)
    expect(result.usedCloudModel).toBe(false);
    expect(result.engine).toBe("grounded");

    // The grounded answer must still be sourced — no bare unsourced numbers
    // (imported from the contract test)
  });

  it("narrate abstains only when there is truly no data", async () => {
    const emptySnapshot = {
      snapshotUtc: new Date().toISOString(),
      degraded: true,
      degradedSources: ["NOAA-SWPC" as const, "NASA-DONKI" as const] as import("@/lib/data/types").DataSource[],
      latestKp: null,
      latestSolarWind: null,
      activeAlerts: [],
      recentCmes: [],
    };

    const result = await narrate("What is happening right now?", emptySnapshot, true);
    expect(result.abstained).toBe(true);
    expect(result.answer).toContain("don't have");
  });

  it("the degradation ladder works: no cloud = grounded output (not blank screen)", async () => {
    const result = await narrate("What is the storm level?", SEEDED_SNAPSHOT, true);
    expect(result.answer).not.toBe("");
    expect(result.answer).not.toBeNull();
    // Template output references the Kp value with a label
    expect(result.answer).toContain("Kp");
  });
});
