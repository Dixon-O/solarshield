/**
 * Cloud narration via IBM Granite on watsonx.ai.
 *
 * Receives already-computed structured values from the MCP tools.
 * The model ONLY phrases these values — it never computes new ones.
 * Prompt explicitly forbids the model from deriving numbers or durations.
 *
 * API key and credentials loaded server-side from environment variables.
 * Never logs credentials. Never returns raw model text without Guardian gate.
 */

const WATSONX_URL =
  (typeof process !== "undefined" && process.env["WATSONX_URL"]) ||
  "https://us-south.ml.cloud.ibm.com";

const WATSONX_PROJECT_ID =
  (typeof process !== "undefined" && process.env["WATSONX_PROJECT_ID"]) || "";

const GRANITE_MODEL_ID = "ibm/granite-3-3-8b-instruct";
const MAX_NEW_TOKENS = 400;

export interface CloudNarrationInput {
  /** The user's question (validated, not used as a prompt injection vector) */
  question: string;
  /** Structured values from the deterministic core — what the model must phrase */
  structuredValues: Record<string, unknown>;
}

export interface CloudNarrationResult {
  text: string;
  modelId: string;
  /** Whether this came from the cloud model (true) or could not be generated (false) */
  success: boolean;
}

/**
 * Build the narration prompt.
 * The model is an explainer, not a calculator.
 */
export function buildPrompt(input: CloudNarrationInput): string {
  const valuesJson = JSON.stringify(input.structuredValues, null, 2);

  return `You are SolarShield's space-weather explainer. Your job is to turn the structured data values below into clear, plain-language guidance for the user. These values were produced by SolarShield's deterministic engine from real NOAA and NASA data.

STRICT RULES:
1. Do NOT compute any new values, derive any numbers, or use your own knowledge about space weather measurements.
2. Every number, time, or severity level you mention must come directly from the structured data below.
3. If a value is null or missing in the data, say it is unavailable — do not substitute or estimate.
4. Speak from the user's perspective. Write for a professional who needs clear, actionable guidance.
5. Keep the response under 150 words.
6. Do NOT repeat the raw JSON values — translate them into natural language.

STRUCTURED DATA:
${valuesJson}

USER QUESTION: ${input.question}

RESPONSE (plain language, citing values from the structured data above only):`;
}

/**
 * Call IBM Granite via watsonx.ai text generation API.
 * Returns null if credentials are missing or the API call fails.
 */
export async function callCloudNarration(
  input: CloudNarrationInput,
): Promise<CloudNarrationResult | null> {
  const apiKey = typeof process !== "undefined" ? process.env["WATSONX_API_KEY"] : undefined;

  if (!apiKey || !WATSONX_PROJECT_ID) {
    // Credentials not configured — caller falls back to template
    return null;
  }

  // Obtain IAM token
  let iamToken: string;
  try {
    iamToken = await getIamToken(apiKey);
  } catch {
    return null;
  }

  const url = `${WATSONX_URL}/ml/v1/text/generation?version=2023-05-29`;
  const body = {
    model_id: GRANITE_MODEL_ID,
    project_id: WATSONX_PROJECT_ID,
    input: buildPrompt(input),
    parameters: {
      decoding_method: "greedy",
      max_new_tokens: MAX_NEW_TOKENS,
      stop_sequences: ["\n\n", "USER QUESTION:"],
    },
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
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
    return null;
  }
  clearTimeout(timer);

  if (!response.ok) return null;

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    return null;
  }

  const text = extractGeneratedText(data);
  if (!text) return null;

  return { text: text.trim(), modelId: GRANITE_MODEL_ID, success: true };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

  if (!response.ok) throw new Error(`IAM token fetch failed: ${response.status}`);

  const json = (await response.json()) as Record<string, unknown>;
  const token = typeof json["access_token"] === "string" ? json["access_token"] : null;
  if (!token) throw new Error("IAM token missing in response");
  return token;
}

function extractGeneratedText(data: unknown): string | null {
  if (typeof data !== "object" || data === null) return null;
  const d = data as Record<string, unknown>;
  if (!Array.isArray(d["results"]) || d["results"].length === 0) return null;
  const first = d["results"][0] as Record<string, unknown>;
  return typeof first["generated_text"] === "string" ? first["generated_text"] : null;
}
