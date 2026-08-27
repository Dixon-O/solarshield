/**
 * Assembles and merges the full SpaceWeatherSnapshot from NOAA + DONKI sources.
 *
 * Each source is fetched independently; failure of one does not block the other.
 * The snapshot records which sources degraded so the UI can show honest source badges.
 */

import { fetchLatestKp, fetchLatestSolarWind, fetchActiveAlerts, FetchError } from "./noaa";
import { fetchRecentCmes } from "./donki";
import type { SpaceWeatherSnapshot, DataSource } from "./types";

export async function assembleSnapshot(): Promise<SpaceWeatherSnapshot> {
  const snapshotUtc = new Date().toISOString();
  const degradedSources: DataSource[] = [];

  // Fetch all sources concurrently; catch each independently
  const [kpResult, swResult, alertsResult, cmesResult] = await Promise.allSettled([
    fetchLatestKp(),
    fetchLatestSolarWind(),
    fetchActiveAlerts(),
    fetchRecentCmes(),
  ]);

  // Extract values, recording which sources failed
  const latestKp =
    kpResult.status === "fulfilled" ? kpResult.value : null;
  if (kpResult.status === "rejected") {
    const source = extractSource(kpResult.reason, "NOAA-SWPC");
    if (!degradedSources.includes(source)) degradedSources.push(source);
  }

  const latestSolarWind =
    swResult.status === "fulfilled" ? swResult.value : null;
  if (swResult.status === "rejected") {
    const source = extractSource(swResult.reason, "NOAA-SWPC");
    if (!degradedSources.includes(source)) degradedSources.push(source);
  }

  const activeAlerts =
    alertsResult.status === "fulfilled" ? alertsResult.value : [];
  if (alertsResult.status === "rejected") {
    const source = extractSource(alertsResult.reason, "NOAA-SWPC");
    if (!degradedSources.includes(source)) degradedSources.push(source);
  }

  const recentCmes =
    cmesResult.status === "fulfilled" ? cmesResult.value : [];
  if (cmesResult.status === "rejected") {
    const source = extractSource(cmesResult.reason, "NASA-DONKI");
    if (!degradedSources.includes(source)) degradedSources.push(source);
  }

  return {
    snapshotUtc,
    degraded: degradedSources.length > 0,
    degradedSources,
    latestKp,
    latestSolarWind,
    activeAlerts,
    recentCmes,
  };
}

function extractSource(err: unknown, fallback: DataSource): DataSource {
  if (err instanceof FetchError) return err.source;
  return fallback;
}
