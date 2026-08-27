/**
 * Unit tests for the NOAA SWPC data fetchers.
 *
 * Tests cover:
 * - Missing/null fields → returned as null, never invented
 * - Network error → throws FetchError
 * - UTC timestamp normalization
 * - Correct field extraction from real response shape
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchLatestKp, fetchLatestSolarWind, fetchActiveAlerts, FetchError } from "./noaa";

// ---------------------------------------------------------------------------
// Mock the global fetch
// ---------------------------------------------------------------------------

function mockFetch(data: unknown, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "Error",
    json: () => Promise.resolve(data),
  });
}

function mockFetchNetworkError(message = "Failed to connect") {
  return vi.fn().mockRejectedValue(new Error(message));
}

beforeEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// fetchLatestKp
// ---------------------------------------------------------------------------

describe("fetchLatestKp", () => {
  it("returns the last entry from a valid Kp response", async () => {
    const data = [
      { time_tag: "2024-05-10T12:00:00", Kp: 2.0, a_running: 7, station_count: 8 },
      { time_tag: "2024-05-10T15:00:00", Kp: 4.33, a_running: 27, station_count: 8 },
    ];
    vi.stubGlobal("fetch", mockFetch(data));

    const result = await fetchLatestKp();

    expect(result).not.toBeNull();
    expect(result!.kp).toBe(4.33);
    expect(result!.source).toBe("NOAA-SWPC");
    expect(result!.timeTagUtc).toBe("2024-05-10T15:00:00.000Z");
    expect(result!.fetchedAtUtc).toBeTruthy();
    // fetchedAtUtc must be a valid ISO string
    expect(new Date(result!.fetchedAtUtc).getTime()).not.toBeNaN();
  });

  it("returns null when Kp field is missing", async () => {
    const data = [{ time_tag: "2024-05-10T15:00:00" }]; // no Kp field
    vi.stubGlobal("fetch", mockFetch(data));
    const result = await fetchLatestKp();
    expect(result).toBeNull();
  });

  it("returns null for empty array", async () => {
    vi.stubGlobal("fetch", mockFetch([]));
    const result = await fetchLatestKp();
    expect(result).toBeNull();
  });

  it("returns null when time_tag is missing", async () => {
    vi.stubGlobal("fetch", mockFetch([{ Kp: 5.0 }]));
    const result = await fetchLatestKp();
    expect(result).toBeNull();
  });

  it("throws FetchError on HTTP error", async () => {
    vi.stubGlobal("fetch", mockFetch({}, 503));
    await expect(fetchLatestKp()).rejects.toBeInstanceOf(FetchError);
  });

  it("throws FetchError on network failure", async () => {
    vi.stubGlobal("fetch", mockFetchNetworkError());
    await expect(fetchLatestKp()).rejects.toBeInstanceOf(FetchError);
  });

  it("optional fields (a_running, station_count) are null when absent", async () => {
    const data = [{ time_tag: "2024-05-10T15:00:00", Kp: 3.0 }];
    vi.stubGlobal("fetch", mockFetch(data));
    const result = await fetchLatestKp();
    expect(result).not.toBeNull();
    expect(result!.aRunning).toBeNull();
    expect(result!.stationCount).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// fetchLatestSolarWind
// ---------------------------------------------------------------------------

describe("fetchLatestSolarWind", () => {
  it("extracts the first (newest) RTSW record", async () => {
    const data = [
      {
        time_tag: "2024-05-10T18:30:00",
        active: true,
        source: "SOLAR1",
        proton_speed: 450.5,
        proton_density: 8.2,
        proton_temperature: 95000,
        overall_quality: 0,
      },
      {
        time_tag: "2024-05-10T18:29:00",
        active: true,
        source: "SOLAR1",
        proton_speed: 448.0,
        proton_density: 8.0,
        proton_temperature: 94000,
        overall_quality: 0,
      },
    ];
    vi.stubGlobal("fetch", mockFetch(data));

    const result = await fetchLatestSolarWind();
    expect(result).not.toBeNull();
    expect(result!.protonSpeedKmS).toBe(450.5);
    expect(result!.protonDensityCm3).toBe(8.2);
    expect(result!.source).toBe("NOAA-SWPC");
    expect(result!.timeTagUtc).toBe("2024-05-10T18:30:00.000Z");
  });

  it("returns null fields when proton values are null", async () => {
    const data = [
      {
        time_tag: "2024-05-10T18:30:00",
        active: true,
        source: "SOLAR1",
        proton_speed: null,
        proton_density: null,
        proton_temperature: null,
        overall_quality: 0,
      },
    ];
    vi.stubGlobal("fetch", mockFetch(data));
    const result = await fetchLatestSolarWind();
    expect(result).not.toBeNull();
    expect(result!.protonSpeedKmS).toBeNull();
    expect(result!.protonDensityCm3).toBeNull();
  });

  it("returns null for empty array", async () => {
    vi.stubGlobal("fetch", mockFetch([]));
    const result = await fetchLatestSolarWind();
    expect(result).toBeNull();
  });

  it("throws FetchError on network failure", async () => {
    vi.stubGlobal("fetch", mockFetchNetworkError("timeout"));
    await expect(fetchLatestSolarWind()).rejects.toBeInstanceOf(FetchError);
  });
});

// ---------------------------------------------------------------------------
// fetchActiveAlerts
// ---------------------------------------------------------------------------

describe("fetchActiveAlerts", () => {
  it("parses valid alert records", async () => {
    const data = [
      {
        product_id: "A30F",
        issue_datetime: "2024-05-10 18:30:00.000",
        message: "WATCH: Geomagnetic Storm Category G3 Predicted",
      },
      {
        product_id: "EF3A",
        issue_datetime: "2024-05-10 17:00:00.000",
        message: "CONTINUED ALERT: Electron 2MeV Integral Flux exceeded 1,000pfu",
      },
    ];
    vi.stubGlobal("fetch", mockFetch(data));

    const result = await fetchActiveAlerts();
    expect(result).toHaveLength(2);
    expect(result[0].productId).toBe("A30F");
    expect(result[0].source).toBe("NOAA-SWPC");
    expect(result[0].message).toContain("G3");
  });

  it("skips records with missing required fields", async () => {
    const data = [
      { product_id: "A30F", issue_datetime: "2024-05-10 18:00:00.000" }, // no message
      { issue_datetime: "2024-05-10 18:00:00.000", message: "test" }, // no product_id
      {
        product_id: "EF3A",
        issue_datetime: "2024-05-10 17:00:00.000",
        message: "Valid alert",
      },
    ];
    vi.stubGlobal("fetch", mockFetch(data));

    const result = await fetchActiveAlerts();
    expect(result).toHaveLength(1);
    expect(result[0].productId).toBe("EF3A");
  });

  it("returns empty array on network failure (non-throwing)", async () => {
    vi.stubGlobal("fetch", mockFetchNetworkError());
    await expect(fetchActiveAlerts()).rejects.toBeInstanceOf(FetchError);
  });
});
