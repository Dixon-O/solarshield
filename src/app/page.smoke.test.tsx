/**
 * Cockpit render smoke test (headless, jsdom).
 *
 * This is the UI-render verification for M5: it mounts the *wired* page
 * exactly as a browser would, feeds it one seeded live snapshot, and drives
 * every tab. It fails if the page throws while rendering, if a child panel
 * crashes on the real data shapes, or if React logs a genuine console.error
 * (missing keys, invalid props, error boundaries, ...).
 *
 * React `act(...)` advisories are the only console.error class filtered out —
 * they are test-harness timing noise from the 1 s countdown interval, not an
 * application defect. Everything else must be empty for the test to pass.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { SpaceWeatherSnapshot } from "@/lib/data/types";
import Home from "./page";

// IndexedDB does not exist in jsdom — mock the cache module so the offline
// hook and the save/load paths resolve cleanly instead of throwing.
vi.mock("@/lib/cache/indexeddb", () => ({
  saveSnapshot: vi.fn().mockResolvedValue(undefined),
  loadSnapshot: vi.fn().mockResolvedValue(null),
  saveCorpus: vi.fn().mockResolvedValue(undefined),
  loadCorpus: vi.fn().mockResolvedValue(null),
}));

// A realistic, fully-sourced live snapshot. Start time = now, so the arrival
// physics always yields a live (future) countdown regardless of the run date.
const nowIso = new Date().toISOString();
const SEED: SpaceWeatherSnapshot = {
  snapshotUtc: nowIso,
  degraded: false,
  degradedSources: [],
  latestKp: {
    source: "NOAA-SWPC",
    fetchedAtUtc: nowIso,
    timeTagUtc: nowIso,
    kp: 7.0,
    aRunning: null,
    stationCount: null,
  },
  latestSolarWind: {
    source: "NOAA-SWPC",
    fetchedAtUtc: nowIso,
    timeTagUtc: nowIso,
    active: true,
    sensorSource: "SOLAR1",
    protonSpeedKmS: 650,
    protonDensityCm3: 5.2,
    protonTemperatureK: null,
    overallQuality: 0,
  },
  activeAlerts: [],
  recentCmes: [
    {
      source: "NASA-DONKI",
      fetchedAtUtc: nowIso,
      activityId: "2026-08-28T00:00:00-CME-001",
      startTimeUtc: nowIso,
      sourceLocation: "S20E10",
      activeRegionNum: null,
      primaryAnalysis: {
        time21_5Utc: null,
        speedKmS: 800,
        halfAngleDeg: null,
        isMostAccurate: true,
      },
      linkedEventIds: [],
      detailUrl: null,
    },
  ],
};

const consoleErrors: string[] = [];

function isActWarning(msg: string): boolean {
  return /not wrapped in act|inside a test was not wrapped|IS_REACT_ACT_ENVIRONMENT/i.test(
    msg,
  );
}

beforeEach(() => {
  consoleErrors.length = 0;
  vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    consoleErrors.push(args.map((a) => String(a)).join(" "));
  });
  // Serve the seeded snapshot to the page's /api/snapshot fetch.
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => SEED,
  }) as unknown as typeof fetch;
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("SolarShield cockpit — full render + tab navigation", () => {
  it("renders the shell, hydrates live data, and switches views without errors", async () => {
    const user = userEvent.setup();
    render(<Home />);

    // Shell chrome is present immediately.
    expect(screen.getByText("SolarShield")).toBeInTheDocument();
    expect(screen.getByText(/Space-weather early warning/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Live" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ask" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Replay" })).toBeInTheDocument();
    expect(screen.getByText(/NOAA SWPC/)).toBeInTheDocument();

    // Live data flows from the seeded snapshot through the deterministic core
    // into every live panel.
    expect(await screen.findByText("7.00")).toBeInTheDocument(); // Now: Kp
    expect(screen.getByText("800 km/s")).toBeInTheDocument(); // Inbound: CME speed
    expect(screen.getByRole("timer")).toBeInTheDocument(); // CountdownDial (arrival present)
    expect(screen.getByText("Current Conditions")).toBeInTheDocument(); // Now title
    expect(screen.getByText("Inbound")).toBeInTheDocument(); // Inbound title
    expect(screen.getByText("Impact & Actions")).toBeInTheDocument(); // ImpactActions title

    // Ask view.
    await user.click(screen.getByRole("button", { name: "Ask" }));
    expect(
      await screen.findByText(/Ask a question about current or forecast/i),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Question")).toBeInTheDocument();

    // Replay view.
    await user.click(screen.getByRole("button", { name: "Replay" }));
    expect(
      await screen.findByText(/Historical Replay — not live data/i),
    ).toBeInTheDocument();
    expect(screen.getByText("May 2024 Gannon G5 Storm")).toBeInTheDocument();

    // Back to Live — countdown timer is mounted again.
    await user.click(screen.getByRole("button", { name: "Live" }));
    expect(await screen.findByRole("timer")).toBeInTheDocument();

    // The headless "error list" must be empty (act advisories filtered out).
    const realErrors = consoleErrors.filter((m) => !isActWarning(m));
    expect(realErrors).toEqual([]);
  });
});
