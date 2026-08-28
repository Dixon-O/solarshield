/**
 * Typed MCP tools — the SolarShield deterministic engine exposed as MCP-callable tools.
 *
 * Each tool wraps the client-safe deterministic core and returns structured data.
 * The LLM calls these tools to get grounded values rather than computing them itself.
 * No tool ever invents a value — they return null when data is unavailable.
 */

import {
  estimateArrival,
  classifyGeomagnetic,
  lookupGeomagneticImpact,
  EARTH_SUN_DISTANCE_KM,
} from "@/lib/core";
import { searchCorpus, getAllChunks } from "@/lib/corpus";
import type { SpaceWeatherSnapshot } from "@/lib/data/types";
import type { ArrivalEstimate, ImpactSummary, CorpusChunk, GeomagneticScale } from "@/lib/core/types";

// ---------------------------------------------------------------------------
// Tool return types
// ---------------------------------------------------------------------------

export interface CurrentConditionsResult {
  kp: number | null;
  kpTimeUtc: string | null;
  kpSource: string;
  solarWindSpeedKmS: number | null;
  solarWindTimeUtc: string | null;
  activeAlertCount: number;
  alertSummaries: string[];
  snapshotUtc: string;
  degraded: boolean;
}

export interface ForecastResult {
  hasCmeInbound: boolean;
  cmeCount: number;
  mostRecentCme: {
    activityId: string;
    startTimeUtc: string;
    speedKmS: number | null;
    sourceLocation: string | null;
  } | null;
}

export interface AdvisoryResult {
  chunks: CorpusChunk[];
  query: string;
}

// ---------------------------------------------------------------------------
// Tool implementations
// ---------------------------------------------------------------------------

/**
 * get_current_conditions: returns the latest normalized snapshot values.
 * Used by the narration model to get what to describe.
 */
export function getCurrentConditions(snapshot: SpaceWeatherSnapshot): CurrentConditionsResult {
  const alertSummaries = snapshot.activeAlerts
    .slice(0, 3)
    .map((a) => a.message.split("\n")[0].trim())
    .filter(Boolean);

  return {
    kp: snapshot.latestKp?.kp ?? null,
    kpTimeUtc: snapshot.latestKp?.timeTagUtc ?? null,
    kpSource: snapshot.latestKp?.source ?? "NOAA-SWPC",
    solarWindSpeedKmS: snapshot.latestSolarWind?.protonSpeedKmS ?? null,
    solarWindTimeUtc: snapshot.latestSolarWind?.timeTagUtc ?? null,
    activeAlertCount: snapshot.activeAlerts.length,
    alertSummaries,
    snapshotUtc: snapshot.snapshotUtc,
    degraded: snapshot.degraded,
  };
}

/**
 * get_forecast: returns CME event data from the snapshot.
 */
export function getForecast(snapshot: SpaceWeatherSnapshot): ForecastResult {
  const cmes = snapshot.recentCmes;
  const mostRecent = cmes.length > 0 ? cmes[cmes.length - 1] : null;

  return {
    hasCmeInbound: cmes.length > 0,
    cmeCount: cmes.length,
    mostRecentCme: mostRecent
      ? {
          activityId: mostRecent.activityId,
          startTimeUtc: mostRecent.startTimeUtc,
          speedKmS: mostRecent.primaryAnalysis?.speedKmS ?? null,
          sourceLocation: mostRecent.sourceLocation,
        }
      : null,
  };
}

/**
 * estimate_arrival: compute CME arrival time from the most recent CME.
 * Returns null if speed is missing or invalid (abstain, not guess).
 */
export function estimateArrivalTool(
  speedKmS: number | null | undefined,
  distanceKm?: number,
): ArrivalEstimate | null {
  return estimateArrival(distanceKm ?? EARTH_SUN_DISTANCE_KM, speedKmS);
}

/**
 * classify_severity: classify Kp into a G-scale level.
 */
export function classifySeverityTool(
  kp: number | null | undefined,
): GeomagneticScale | null {
  return classifyGeomagnetic(kp);
}

/**
 * lookup_impact: get verbatim NOAA effect text for a G-scale level.
 */
export function lookupImpactTool(scale: GeomagneticScale): ImpactSummary {
  return lookupGeomagneticImpact(scale);
}

/**
 * cite_advisory: search the advisory corpus for relevant passages.
 */
export function citeAdvisoryTool(query: string): AdvisoryResult {
  const chunks = searchCorpus(query);
  return { chunks, query };
}

/**
 * All MCP tools bundled for the MCP server registration.
 */
export const MCP_TOOLS = {
  get_current_conditions: getCurrentConditions,
  get_forecast: getForecast,
  estimate_arrival: estimateArrivalTool,
  classify_severity: classifySeverityTool,
  lookup_impact: lookupImpactTool,
  cite_advisory: citeAdvisoryTool,
};

/** For the /judges panel — expose all corpus chunks */
export { getAllChunks };
