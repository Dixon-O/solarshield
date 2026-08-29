/**
 * Local narration + Guardian gate via Ollama.
 *
 * Runs the EXACT two IBM Granite models the cloud path uses, but locally and
 * key-free through Ollama's HTTP API:
 *   - narration : granite3.3:8b              (same weights as ibm/granite-3-3-8b-instruct)
 *   - guardian  : ibm/granite3.3-guardian:8b (same family as ibm/granite-guardian-3-8b)
 *
 * It reuses the cloud path's prompt builders verbatim (buildPrompt,
 * buildGuardianPrompt), so local and cloud phrase the same structured values
 * through the same grounding contract — the only difference is where the model
 * runs. The same honesty guarantees apply: the model never computes values, and
 * every answer still passes the Guardian gate. Fail-safe: any error or
 * ambiguous verdict blocks, and the caller degrades to the grounded engine —
 * ungated text is never shown.
 *
 * Nothing here runs on the keyless public deploy. It activates only when the
 * operator sets NARRATION_PROVIDER=ollama (or OLLAMA_BASE_URL) locally, and a
 * serverless function cannot reach a user's localhost anyway.
 */

import { buildPrompt, type CloudNarrationInput, type CloudNarrationResult } from "./cloud";
import { buildGuardianPrompt, type GuardianResult } from "./guardian";

const NARRATION_MAX_TOKENS = 400;
// Granite 3.3 is 128K-capable, but Ollama defaults num_ctx low; set a comfortable
// window so the structured-values prompt is never silently truncated.
const NUM_CTX = 8192;

function baseUrl(): string {
  // 127.0.0.1 (not "localhost") avoids Node resolving to ::1 (IPv6) while Ollama
  // listens on IPv4 — a common Windows/Node ECONNREFUSED trap.
  const raw =
    (typeof process !== "undefined" && process.env["OLLAMA_BASE_URL"]) ||
    "http://127.0.0.1:11434";
  return raw.replace(/\/+$/, "");
}

function narrationModel(): string {
  return (typeof process !== "undefined" && process.env["OLLAMA_MODEL"]) || "granite3.3:8b";
}

function guardianModel(): string {
  return (
    (typeof process !== "undefined" && process.env["OLLAMA_GUARDIAN_MODEL"]) ||
    "ibm/granite3.3-guardian:8b"
  );
}

function timeoutMs(): number {
  const raw = typeof process !== "undefined" ? process.env["OLLAMA_TIMEOUT_MS"] : undefined;
  const n = raw ? Number(raw) : NaN;
  // Local models can be slow to load on first call — allow a generous default.
  return Number.isFinite(n) && n > 0 ? n : 120_000;
}

/**
 * Generate narration locally via Ollama. Returns null on any failure so the
 * caller degrades to the grounded deterministic engine.
 */
export async function callOllamaNarration(
  input: CloudNarrationInput,
): Promise<CloudNarrationResult | null> {
  const model = narrationModel();
  const data = await postGenerate({
    model,
    prompt: buildPrompt(input),
    // raw: pass our fully-formed prompt through untouched, matching the watsonx
    // text-generation call (no chat template re-wrapping).
    raw: true,
    stream: false,
    options: {
      temperature: 0, // greedy — deterministic, matches the cloud path
      num_predict: NARRATION_MAX_TOKENS,
      num_ctx: NUM_CTX,
      stop: ["\n\n", "USER QUESTION:"],
    },
  });
  if (!data) return null;

  const text = typeof data["response"] === "string" ? data["response"].trim() : "";
  if (!text) return null;

  return { text, modelId: model, success: true };
}

/**
 * Gate narration through the local Granite Guardian model. Fail-safe: any error
 * or ambiguous verdict returns passed:false so the caller uses the grounded
 * engine. Never returns ungated text.
 */
export async function gateWithOllamaGuardian(
  narration: string,
  sourceValues: Record<string, unknown>,
): Promise<GuardianResult> {
  const data = await postGenerate({
    model: guardianModel(),
    prompt: buildGuardianPrompt(narration, sourceValues),
    raw: true,
    stream: false,
    options: {
      temperature: 0,
      num_predict: 20,
      num_ctx: NUM_CTX,
    },
  });
  if (!data) {
    return { passed: false, text: null, reason: "Guardian (Ollama) unreachable" };
  }

  const verdict = typeof data["response"] === "string" ? data["response"].toLowerCase() : "";
  // Check "unsafe" before "safe" — "unsafe" contains "safe" as a substring.
  if (verdict.includes("unsafe")) {
    return { passed: false, text: null, reason: "Guardian flagged: unsafe" };
  }
  if (verdict.includes("safe")) {
    return { passed: true, text: narration };
  }
  return { passed: false, text: null, reason: "Guardian ambiguous verdict" };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** POST /api/generate (non-streaming). Returns the parsed object or null. */
async function postGenerate(
  body: Record<string, unknown>,
): Promise<Record<string, unknown> | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs());
  let response: Response;
  try {
    response = await fetch(`${baseUrl()}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch {
    clearTimeout(timer);
    return null;
  }
  clearTimeout(timer);

  if (!response.ok) return null;

  try {
    return (await response.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}
