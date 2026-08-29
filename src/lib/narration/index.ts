/**
 * Narration orchestrator — the single entry point for all narration.
 *
 * Pipeline (online):
 *   MCP tools → IBM Granite (watsonx cloud OR local Ollama) → Granite Guardian
 *   gate → UI
 *   No model configured, model fails, or Guardian blocks → grounded
 *   deterministic engine → UI
 * Pipeline (offline, isOffline=true, or run client-side from cache):
 *   grounded deterministic engine (real cached NOAA/NASA values) → UI
 *
 * Which model runs is decided by selectNarrationProvider (env-driven). With no
 * configuration — the keyless deploy default — no model runs and every answer
 * comes from the grounded engine. The grounded engine (./grounded) is pure and
 * fully sourced — it is the honest degradation path, not a stand-in for a model
 * that never runs. On insufficient evidence → abstention.
 */

import { callCloudNarration } from "./cloud";
import { gateWithGuardian } from "./guardian";
import { callOllamaNarration, gateWithOllamaGuardian } from "./ollama";
import { selectNarrationProvider } from "./provider";
import { renderAbstention } from "./template";
import {
  checkSufficientEvidence,
  assembleStructuredValues,
  narrateGrounded,
  buildSources,
  type NarrationSource,
} from "./grounded";
import type { SpaceWeatherSnapshot } from "@/lib/data/types";

/** Which engine produced the answer — surfaced to the user as a visible tag. */
export type NarrationEngine = "granite-cloud" | "granite-local" | "grounded";

export interface NarrationResult {
  answer: string;
  sources: NarrationSource[];
  abstained: boolean;
  /** Which engine produced this answer. */
  engine: NarrationEngine;
  /** Convenience flag: true iff engine === "granite-cloud" (cloud IBM Granite). */
  usedCloudModel: boolean;
}

/**
 * Generate a narration for the given question and snapshot.
 *
 * @param question  - The user's natural-language question
 * @param snapshot  - The current space-weather snapshot (from /api/snapshot)
 * @param isOffline - If true, skip the model and answer from the grounded
 *                    deterministic engine directly (used by the offline path).
 */
export async function narrate(
  question: string,
  snapshot: SpaceWeatherSnapshot,
  isOffline = false,
): Promise<NarrationResult> {
  // Abstain early when evidence is insufficient (skips the model entirely).
  const abstentionReason = checkSufficientEvidence(question, snapshot);
  if (abstentionReason) {
    return {
      answer: renderAbstention(abstentionReason),
      sources: [],
      abstained: true,
      engine: "grounded",
      usedCloudModel: false,
    };
  }

  // Online path: try an IBM Granite model (cloud or local), gated by Guardian.
  // With no provider configured (keyless deploy), skip straight to grounded.
  if (!isOffline) {
    const provider = selectNarrationProvider();
    if (provider) {
      const { structuredValues, scale } = assembleStructuredValues(question, snapshot);
      try {
        const modelResult =
          provider === "ollama"
            ? await callOllamaNarration({ question, structuredValues })
            : await callCloudNarration({ question, structuredValues });

        if (modelResult?.success) {
          const guardianResult =
            provider === "ollama"
              ? await gateWithOllamaGuardian(modelResult.text, structuredValues)
              : await gateWithGuardian(modelResult.text, structuredValues);

          if (guardianResult.passed && guardianResult.text) {
            return {
              answer: guardianResult.text,
              sources: buildSources(snapshot, scale),
              abstained: false,
              engine: provider === "ollama" ? "granite-local" : "granite-cloud",
              usedCloudModel: provider === "watsonx",
            };
          }
          // Guardian blocked — fall through to the grounded engine.
        }
      } catch {
        // Model narration failed — fall through to the grounded engine.
        // This is a designed degradation path, not a swallowed error state.
      }
    }
  }

  // Grounded deterministic engine: real, fully-sourced values, no model.
  const grounded = narrateGrounded(question, snapshot);
  return {
    answer: grounded.answer,
    sources: grounded.sources,
    abstained: grounded.abstained,
    engine: "grounded",
    usedCloudModel: false,
  };
}
