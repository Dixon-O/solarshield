/**
 * Granite Guardian gate — checks narration output for grounding violations.
 *
 * Every narration string passes through this gate before reaching the UI.
 * If Guardian flags it, the caller must fall back to a deterministic template.
 *
 * Uses IBM Granite Guardian 3.0 8B via watsonx.ai.
 * On any API error, defaults to passed: false (fail-safe — never show ungated text).
 */

const GUARDIAN_MODEL_ID = "ibm/granite-guardian-3-8b";

export interface GuardianResult {
  /** true if narration passed Guardian review */
  passed: boolean;
  /** The narration text (same as input if passed; null if blocked) */
  text: string | null;
  /** Reason for blocking (if any) */
  reason?: string;
}

/**
 * Gate narration text through Granite Guardian.
 *
 * @param narration     - The generated narration text to check
 * @param sourceValues  - The structured values the narration was supposed to describe
 * @returns GuardianResult — if passed=false, the caller must use template fallback
 */
export async function gateWithGuardian(
  narration: string,
  sourceValues: Record<string, unknown>,
): Promise<GuardianResult> {
  const apiKey = typeof process !== "undefined" ? process.env["WATSONX_API_KEY"] : undefined;
  const projectId =
    typeof process !== "undefined" ? process.env["WATSONX_PROJECT_ID"] : undefined;
  const watsonxUrl =
    (typeof process !== "undefined" && process.env["WATSONX_URL"]) ||
    "https://us-south.ml.cloud.ibm.com";

  if (!apiKey || !projectId) {
    // No credentials — fail-safe: block (require template fallback)
    return { passed: false, text: null, reason: "Guardian credentials not configured" };
  }

  // Obtain IAM token
  let iamToken: string;
  try {
    iamToken = await getIamToken(apiKey);
  } catch {
    return { passed: false, text: null, reason: "IAM token fetch failed" };
  }

  // Build Guardian prompt — check for hallucinations and contradiction with source data
  const prompt = buildGuardianPrompt(narration, sourceValues);

  const url = `${watsonxUrl}/ml/v1/text/generation?version=2023-05-29`;
  const body = {
    model_id: GUARDIAN_MODEL_ID,
    project_id: projectId,
    input: prompt,
    parameters: {
      decoding_method: "greedy",
      max_new_tokens: 10,
    },
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${iamToken}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch {
    clearTimeout(timer);
    // Network error — fail-safe: block
    return { passed: false, text: null, reason: "Guardian API unreachable" };
  }
  clearTimeout(timer);

  if (!response.ok) {
    return { passed: false, text: null, reason: `Guardian API error: ${response.status}` };
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    return { passed: false, text: null, reason: "Guardian response parse failure" };
  }

  const verdict = extractVerdict(data);
  if (verdict === "safe") {
    return { passed: true, text: narration };
  }

  return { passed: false, text: null, reason: `Guardian flagged: ${verdict}` };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function buildGuardianPrompt(narration: string, sourceValues: Record<string, unknown>): string {
  const valuesJson = JSON.stringify(sourceValues, null, 2);

  return `<|system|>
You are a safety and grounding checker for a space-weather assistant. Your job is to verify that the following RESPONSE only contains claims that are directly supported by the SOURCE DATA provided. Do not allow any numbers, times, severity levels, or factual claims that contradict or are absent from the source data.

Respond with only one word: "safe" if the response is fully grounded in the source data, or "unsafe" if it contains any unsupported claim.
<|user|>
SOURCE DATA:
${valuesJson}

RESPONSE TO CHECK:
${narration}
<|assistant|>`;
}

function extractVerdict(data: unknown): string {
  if (typeof data !== "object" || data === null) return "unknown";
  const d = data as Record<string, unknown>;
  if (!Array.isArray(d["results"]) || d["results"].length === 0) return "unknown";
  const first = d["results"][0] as Record<string, unknown>;
  const text = typeof first["generated_text"] === "string" ? first["generated_text"].trim().toLowerCase() : "";
  return text || "unknown";
}

async function getIamToken(apiKey: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  let response: Response;
  try {
    response = await fetch("https://iam.cloud.ibm.com/identity/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `grant_type=urn:ibm:params:oauth:grant-type:apikey&apikey=${encodeURIComponent(apiKey)}`,
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
  clearTimeout(timer);

  if (!response.ok) throw new Error(`IAM: ${response.status}`);
  const json = (await response.json()) as Record<string, unknown>;
  const token = typeof json["access_token"] === "string" ? json["access_token"] : null;
  if (!token) throw new Error("no access_token");
  return token;
}
