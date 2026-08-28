/**
 * Narration orchestrator — the single entry point for all narration.
 *
 * Pipeline (online):
 *   MCP tools → cloud Granite → Guardian gate → UI
 *   Guardian fail or cloud unavailable → Granite Nano (M4) → template fallback → UI
 * Pipeline (offline / isOffline=true):
 *   Granite Nano on-device → template fallback → UI
 *
 * On insufficient evidence → abstention response → UI
 */

import { callCloudNarration } from "./cloud";
import { gateWithGuardian } from "./guardian";
// nano is dynamically imported at call time to keep it out of the server bundle
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

export interface NarrationResult {
  answer: string;
  sources: Array<{ label: string; url?: string }>;
  abstained: boolean;
  /** true if narration came from cloud Granite; false if template or on-device */
  usedCloudModel: boolean;
  /** true if narration came from on-device Granite Nano (wired in M4) */
  usedOnDeviceModel: boolean;
}

/**
 * Determine if a question has sufficient evidence to answer.
 * Returns null if answerable, or an abstention reason string if not.
 */
function checkSufficientEvidence(
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
 * Generate a narration for the given question and snapshot.
 *
 * @param question  - The user's natural-language question
 * @param snapshot  - The current space-weather snapshot (from /api/snapshot)
 * @param isOffline - If true, skip cloud model and use template directly (Nano wired in M4)
 */
export async function narrate(
  question: string,
  snapshot: SpaceWeatherSnapshot,
  isOffline = false,
): Promise<NarrationResult> {
  // Check for sufficient evidence
  const abstentionReason = checkSufficientEvidence(question, snapshot);
  if (abstentionReason) {
    return {
      answer: renderAbstention(abstentionReason),
      sources: [],
      abstained: true,
      usedCloudModel: false,
      usedOnDeviceModel: false,
    };
  }

  // Assemble structured values via MCP tools
  const conditions = getCurrentConditions(snapshot);
  const forecast = getForecast(snapshot);
  const scale: GeomagneticScale | null = classifySeverityTool(conditions.kp);
  const arrival = estimateArrivalTool(forecast.mostRecentCme?.speedKmS);
  const impact = scale ? lookupImpactTool(scale) : null;

  const structuredValues: Record<string, unknown> = {
    conditions,
    forecast,
    scale,
    arrival,
    impact: impact
      ? { scale: impact.scale, scaleName: impact.scaleName, effects: impact.effects }
      : null,
    question,
  };

  // Online path: try cloud Granite + Guardian
  if (!isOffline) {
    try {
      const cloudResult = await callCloudNarration({ question, structuredValues });

      if (cloudResult?.success) {
        const guardianResult = await gateWithGuardian(cloudResult.text, structuredValues);

        if (guardianResult.passed && guardianResult.text) {
          return {
            answer: guardianResult.text,
            sources: buildSources(snapshot, scale),
            abstained: false,
            usedCloudModel: true,
            usedOnDeviceModel: false,
          };
        }
        // Guardian blocked — fall through to template
      }
    } catch {
      // Cloud narration failed — fall through to template (no silent catch:
      // the error is swallowed intentionally here because the template fallback
      // is a first-class designed degradation path, not an error state)
    }
  }

  // Offline / fallback: try Granite Nano first, then deterministic template
  // Dynamic import keeps nano.ts (and @huggingface/transformers) out of the server bundle
  try {
    const { callNanoNarration } = await import("./nano");
    const nanoResult = await callNanoNarration(question, structuredValues);
    if (nanoResult?.success) {
      return {
        answer: nanoResult.text,
        sources: buildSources(snapshot, scale),
        abstained: false,
        usedCloudModel: false,
        usedOnDeviceModel: true,
      };
    }
  } catch {
    // Nano unavailable — fall through to template (intentional degradation path)
  }

  const templateAnswer = buildTemplateAnswer(question, conditions, forecast, scale, arrival);

  return {
    answer: templateAnswer,
    sources: buildSources(snapshot, scale),
    abstained: false,
    usedCloudModel: false,
    usedOnDeviceModel: false,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildTemplateAnswer(
  _question: string,
  conditions: ReturnType<typeof getCurrentConditions>,
  forecast: ReturnType<typeof getForecast>,
  scale: GeomagneticScale | null,
  arrival: ReturnType<typeof estimateArrivalTool>,
): string {
  const parts: string[] = [];

  if (scale !== null) {
    parts.push(renderConditionsSummary(conditions, scale));
  } else {
    parts.push(renderConditionsSummary(conditions, null));
  }

  parts.push(renderArrivalSummary(arrival, forecast));

  if (scale && scale !== "G0") {
    parts.push(renderImpactSummary(scale));
  }

  return parts.join(" ");
}

function buildSources(
  snapshot: SpaceWeatherSnapshot,
  scale: GeomagneticScale | null,
): Array<{ label: string; url?: string }> {
  const sources: Array<{ label: string; url?: string }> = [];

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
