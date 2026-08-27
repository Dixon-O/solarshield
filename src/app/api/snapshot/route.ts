/**
 * GET /api/snapshot
 *
 * Returns the latest SpaceWeatherSnapshot assembled from NOAA SWPC and NASA DONKI.
 * - Server-side only: secrets loaded from env, allowlisted fetches only.
 * - In-memory cache (5-min TTL) to avoid hammering upstream APIs.
 * - On total failure: returns last cached snapshot with degraded=true.
 * - Never returns an empty 500 — always a JSON body.
 */

import { NextResponse } from "next/server";
import { assembleSnapshot } from "@/lib/data/snapshot";
import type { SpaceWeatherSnapshot } from "@/lib/data/types";

// ---------------------------------------------------------------------------
// Server-side in-memory cache (5-minute TTL)
// ---------------------------------------------------------------------------

const CACHE_TTL_MS = 5 * 60 * 1000;

let cachedSnapshot: SpaceWeatherSnapshot | null = null;
let cacheExpiresAt = 0;

export async function GET(): Promise<NextResponse> {
  // Return cache if still valid
  if (cachedSnapshot && Date.now() < cacheExpiresAt) {
    return NextResponse.json(cachedSnapshot);
  }

  let snapshot: SpaceWeatherSnapshot;
  try {
    snapshot = await assembleSnapshot();
    // Update cache on success
    cachedSnapshot = snapshot;
    cacheExpiresAt = Date.now() + CACHE_TTL_MS;
  } catch (err) {
    // assembleSnapshot itself should not throw (it uses allSettled internally),
    // but guard against unexpected errors
    console.error("[snapshot] Unexpected error assembling snapshot:", err);

    if (cachedSnapshot) {
      // Return stale cache with degraded flag
      return NextResponse.json(
        { ...cachedSnapshot, degraded: true, degradedSources: ["NOAA-SWPC", "NASA-DONKI"] },
        { status: 200 },
      );
    }

    // No cache at all — return minimal valid snapshot
    const fallback: SpaceWeatherSnapshot = {
      snapshotUtc: new Date().toISOString(),
      degraded: true,
      degradedSources: ["NOAA-SWPC", "NASA-DONKI"],
      latestKp: null,
      latestSolarWind: null,
      activeAlerts: [],
      recentCmes: [],
    };
    return NextResponse.json(fallback, { status: 200 });
  }

  return NextResponse.json(snapshot);
}
