/**
 * Grounded narration — SolarShield's deterministic, fully-sourced answer engine.
 *
 * Pure and client-safe: no network, no server-only APIs, no ML model.
 * It turns a space-weather snapshot into plain-language guidance built ONLY
 * from real NOAA/NASA values (via the typed MCP tools) and the deterministic
 * template renderers. Every number carries a source; missing data abstains.
 *
 * It runs in two places so the answer is identical online and offline:
 *   - Server (narration/index.ts): the grounded path when cloud Granite is
 *     unavailable or Granite Guardian blocks the model's phrasing.
 *   - Client (components/Ask.tsx): the offline path, computed in the browser
 *     from the last snapshot cached in IndexedDB — real data, no server.
 *
 * This is the honest degradation path, not a stand-in for a model that never
 * runs. There are no invented values here — ever.
 */

import {
  renderConditionsSummary,
  renderArrivalSummary,
  renderImpactSummary,
  renderAbstention,
} from "./template";
import {
  getCurrentConditions,
  getForecast,
  estimateArrivalTool,
  classifySeverityTool,
  lookupImpactTool,
} from "@/lib/mcp/tools";
import type { SpaceWeatherSnapshot } from "@/lib/data/types";
import type { GeomagneticScale } from "@/lib/core/types";

/** A source attribution shown beneath an answer. */
export interface NarrationSource {
  label: string;
  url?: string;
}

/** A grounded (deterministic, sourced) answer — no model involved. */
export interface GroundedResult {
  answer: string;
  sources: NarrationSource[];
  abstained: boolean;
}

/** The structured values the cloud model is allowed to phrase (never compute). */
export interface StructuredValuesResult {
  structuredValues: Record<string, unknown>;
  scale: GeomagneticScale | null;
}

/**
 * Determine if a question has sufficient evidence to answer.
 * Returns null if answerable, or an abstention reason string if not.
 */
export function checkSufficientEvidence(
  question: string,
  snapshot: SpaceWeatherSnapshot,
): string | null {
  const q = question.toLowerCase();

  // Questions about specific CME positions/trajectories require real-time data
  if (
    (q.includes("position") || q.includes("trajectory") || q.includes("exact location")) &&
    snapshot.recentCmes.length === 0
  ) {
    return "No CME event data is currently available.";
  }

  // Questions about current conditions require live data
  if (
    (q.includes("current") || q.includes("right now") || q.includes("happening")) &&
    snapshot.latestKp === null &&
    snapshot.latestSolarWind === null
  ) {
    return "Current space-weather data is unavailable.";
  }

  return null; // sufficient evidence
}

/**
 * Assemble the structured values via the MCP tools.
 * Shared by the cloud prompt (what the model is asked to phrase) and by the
 * grounded answer, so both describe exactly the same computed values.
 */
export function assembleStructuredValues(
  question: string,
  snapshot: SpaceWeatherSnapshot,
): StructuredValuesResult {
  const conditions = getCurrentConditions(snapshot);
  const forecast = getForecast(snapshot);
  const scale: GeomagneticScale | null = classifySeverityTool(conditions.kp);
  const arrival = estimateArrivalTool(forecast.mostRecentCme?.speedKmS);
  const impact = scale ? lookupImpact(scale) : null;

  const structuredValues: Record<string, unknown> = {
    conditions,
    forecast,
    scale,
    arrival,
    impact,
    question,
  };

  return { structuredValues, scale };
}

/**
 * Produce a fully-grounded, deterministic answer for a question + snapshot.
 * Abstains when evidence is insufficient. No network, no model — safe to run
 * in the browser while offline.
 */
export function narrateGrounded(
  question: string,
  snapshot: SpaceWeatherSnapshot,
): GroundedResult {
  const abstentionReason = checkSufficientEvidence(question, snapshot);
  if (abstentionReason) {
    return {
      answer: renderAbstention(abstentionReason),
      sources: [],
      abstained: true,
    };
  }

  const conditions = getCurrentConditions(snapshot);
  const forecast = getForecast(snapshot);
  const scale: GeomagneticScale | null = classifySeverityTool(conditions.kp);
  const arrival = estimateArrivalTool(forecast.mostRecentCme?.speedKmS);

  const answer = buildTemplateAnswer(conditions, forecast, scale, arrival);

  return {
    answer,
    sources: buildSources(snapshot, scale),
    abstained: false,
  };
}

/**
 * Build the source-attribution list for an answer. Exported so the cloud path
 * (which returns model-phrased text) can attach the same real citations.
 */
export function buildSources(
  snapshot: SpaceWeatherSnapshot,
  scale: GeomagneticScale | null,
): NarrationSource[] {
  const sources: NarrationSource[] = [];

  if (snapshot.latestKp) {
    sources.push({ label: `NOAA SWPC · ${snapshot.latestKp.timeTagUtc}` });
  }
  if (snapshot.latestSolarWind) {
    sources.push({ label: `NOAA SWPC RTSW · ${snapshot.latestSolarWind.timeTagUtc}` });
  }
  if (snapshot.recentCmes.length > 0) {
    sources.push({ label: `NASA DONKI · ${snapshot.recentCmes[0].fetchedAtUtc}` });
  }
  if (scale && scale !== "G0") {
    sources.push({
      label: "NOAA Space Weather Scales",
      url: "https://www.swpc.noaa.gov/noaa-scales-explanation",
    });
  }

  return sources;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Impact lookup shaped for the structured-values payload the model phrases. */
function lookupImpact(scale: GeomagneticScale) {
  const impact = lookupImpactTool(scale);
  return { scale: impact.scale, scaleName: impact.scaleName, effects: impact.effects };
}

function buildTemplateAnswer(
  conditions: ReturnType<typeof getCurrentConditions>,
  forecast: ReturnType<typeof getForecast>,
  scale: GeomagneticScale | null,
  arrival: ReturnType<typeof estimateArrivalTool>,
): string {
  const parts: string[] = [];

  parts.push(renderConditionsSummary(conditions, scale));
  parts.push(renderArrivalSummary(arrival, forecast));

  if (scale && scale !== "G0") {
    parts.push(renderImpactSummary(scale));
  }

  return parts.join(" ");
}
