/**
 * Tests for the snapshot assembler.
 * Verifies that partial/total failures still produce a valid snapshot with degraded flags.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// We'll mock the individual fetchers to test the assembler in isolation
vi.mock("./noaa", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./noaa")>();
  return {
    ...actual,
    fetchLatestKp: vi.fn(),
    fetchLatestSolarWind: vi.fn(),
    fetchActiveAlerts: vi.fn(),
  };
});
vi.mock("./donki", () => ({
  fetchRecentCmes: vi.fn(),
}));

import { assembleSnapshot } from "./snapshot";
import * as noaa from "./noaa";
import * as donki from "./donki";

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("assembleSnapshot", () => {
  it("assembles a full snapshot when all sources succeed", async () => {
    const kpRecord = {
      source: "NOAA-SWPC" as const,
      fetchedAtUtc: "2024-05-10T18:00:00.000Z",
      timeTagUtc: "2024-05-10T18:00:00.000Z",
      kp: 4.33,
      aRunning: 27,
      stationCount: 8,
    };
    vi.mocked(noaa.fetchLatestKp).mockResolvedValue(kpRecord);
    vi.mocked(noaa.fetchLatestSolarWind).mockResolvedValue(null);
    vi.mocked(noaa.fetchActiveAlerts).mockResolvedValue([]);
    vi.mocked(donki.fetchRecentCmes).mockResolvedValue([]);

    const snapshot = await assembleSnapshot();

    expect(snapshot.degraded).toBe(false);
    expect(snapshot.degradedSources).toHaveLength(0);
    expect(snapshot.latestKp).toEqual(kpRecord);
    expect(snapshot.snapshotUtc).toBeTruthy();
  });

  it("marks snapshot as degraded when NOAA fails", async () => {
    vi.mocked(noaa.fetchLatestKp).mockRejectedValue(
      new noaa.FetchError("NOAA-SWPC", "https://test", "timeout"),
    );
    vi.mocked(noaa.fetchLatestSolarWind).mockRejectedValue(
      new noaa.FetchError("NOAA-SWPC", "https://test2", "timeout"),
    );
    vi.mocked(noaa.fetchActiveAlerts).mockRejectedValue(
      new noaa.FetchError("NOAA-SWPC", "https://test3", "timeout"),
    );
    vi.mocked(donki.fetchRecentCmes).mockResolvedValue([]);

    const snapshot = await assembleSnapshot();

    expect(snapshot.degraded).toBe(true);
    expect(snapshot.degradedSources).toContain("NOAA-SWPC");
    expect(snapshot.latestKp).toBeNull();
    expect(snapshot.latestSolarWind).toBeNull();
    expect(snapshot.activeAlerts).toHaveLength(0);
    // DONKI succeeded, so recentCmes is still present
    expect(snapshot.recentCmes).toHaveLength(0);
  });

  it("marks snapshot as degraded when DONKI fails but still includes NOAA data", async () => {
    const kpRecord = {
      source: "NOAA-SWPC" as const,
      fetchedAtUtc: "2024-05-10T18:00:00.000Z",
      timeTagUtc: "2024-05-10T18:00:00.000Z",
      kp: 7.0,
      aRunning: null,
      stationCount: null,
    };
    vi.mocked(noaa.fetchLatestKp).mockResolvedValue(kpRecord);
    vi.mocked(noaa.fetchLatestSolarWind).mockResolvedValue(null);
    vi.mocked(noaa.fetchActiveAlerts).mockResolvedValue([]);
    vi.mocked(donki.fetchRecentCmes).mockRejectedValue(
      new noaa.FetchError("NASA-DONKI", "https://test", "503"),
    );

    const snapshot = await assembleSnapshot();

    expect(snapshot.degraded).toBe(true);
    expect(snapshot.degradedSources).toContain("NASA-DONKI");
    expect(snapshot.degradedSources).not.toContain("NOAA-SWPC");
    expect(snapshot.latestKp!.kp).toBe(7.0);
    expect(snapshot.recentCmes).toHaveLength(0);
  });

  it("snapshot always has a valid snapshotUtc ISO string", async () => {
    vi.mocked(noaa.fetchLatestKp).mockResolvedValue(null);
    vi.mocked(noaa.fetchLatestSolarWind).mockResolvedValue(null);
    vi.mocked(noaa.fetchActiveAlerts).mockResolvedValue([]);
    vi.mocked(donki.fetchRecentCmes).mockResolvedValue([]);

    const snapshot = await assembleSnapshot();
    expect(new Date(snapshot.snapshotUtc).getTime()).not.toBeNaN();
  });
});
