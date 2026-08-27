/**
 * Unit tests for the NASA DONKI fetcher.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchRecentCmes } from "./donki";
import { FetchError } from "./noaa";

function mockFetch(data: unknown, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "Error",
    json: () => Promise.resolve(data),
  });
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("fetchRecentCmes", () => {
  it("parses a valid CME response and picks the most-accurate analysis", async () => {
    const data = [
      {
        activityID: "2024-05-08T06:09:00-CME-001",
        startTime: "2024-05-08T06:09Z",
        sourceLocation: "S17E79",
        activeRegionNum: 13664,
        link: "https://kauai.ccmc.gsfc.nasa.gov/DONKI/view/CME/31134/-1",
        cmeAnalyses: [
          {
            time21_5: "2024-05-08T10:45Z",
            speed: 1437,
            halfAngle: 40,
            isMostAccurate: false,
          },
          {
            time21_5: "2024-05-08T11:00Z",
            speed: 1500,
            halfAngle: 42,
            isMostAccurate: true,
          },
        ],
        linkedEvents: [{ activityID: "2024-05-08T05:51:00-FLR-001" }],
      },
    ];
    vi.stubGlobal("fetch", mockFetch(data));

    const result = await fetchRecentCmes();
    expect(result).toHaveLength(1);

    const cme = result[0];
    expect(cme.activityId).toBe("2024-05-08T06:09:00-CME-001");
    expect(cme.startTimeUtc).toBe("2024-05-08T06:09:00.000Z");
    expect(cme.sourceLocation).toBe("S17E79");
    expect(cme.source).toBe("NASA-DONKI");

    // Should pick isMostAccurate = true
    expect(cme.primaryAnalysis).not.toBeNull();
    expect(cme.primaryAnalysis!.speedKmS).toBe(1500);
    expect(cme.primaryAnalysis!.isMostAccurate).toBe(true);

    expect(cme.linkedEventIds).toEqual(["2024-05-08T05:51:00-FLR-001"]);
  });

  it("returns primaryAnalysis = null when cmeAnalyses is missing", async () => {
    const data = [
      {
        activityID: "2024-05-08T06:09:00-CME-001",
        startTime: "2024-05-08T06:09Z",
      },
    ];
    vi.stubGlobal("fetch", mockFetch(data));

    const result = await fetchRecentCmes();
    expect(result).toHaveLength(1);
    expect(result[0].primaryAnalysis).toBeNull();
  });

  it("skips CME records missing activityID or startTime", async () => {
    const data = [
      { activityID: "2024-05-08T06:09:00-CME-001" }, // no startTime
      { startTime: "2024-05-08T06:09Z" }, // no activityID
      { activityID: "2024-05-09T00:00:00-CME-002", startTime: "2024-05-09T00:00Z" }, // valid
    ];
    vi.stubGlobal("fetch", mockFetch(data));

    const result = await fetchRecentCmes();
    expect(result).toHaveLength(1);
    expect(result[0].activityId).toBe("2024-05-09T00:00:00-CME-002");
  });

  it("returns empty array when API returns empty array", async () => {
    vi.stubGlobal("fetch", mockFetch([]));
    const result = await fetchRecentCmes();
    expect(result).toHaveLength(0);
  });

  it("throws FetchError on HTTP 503", async () => {
    vi.stubGlobal("fetch", mockFetch({}, 503));
    await expect(fetchRecentCmes()).rejects.toBeInstanceOf(FetchError);
  });

  it("speedKmS is null when speed field is missing from analysis", async () => {
    const data = [
      {
        activityID: "2024-05-08T06:09:00-CME-001",
        startTime: "2024-05-08T06:09Z",
        cmeAnalyses: [{ time21_5: "2024-05-08T10:45Z", isMostAccurate: true }],
      },
    ];
    vi.stubGlobal("fetch", mockFetch(data));

    const result = await fetchRecentCmes();
    expect(result[0].primaryAnalysis!.speedKmS).toBeNull();
  });
});
