/**
 * Narration provider selection.
 *
 * Decides which model provider the ONLINE path should attempt, based purely on
 * environment configuration. Pure and synchronous, so it is trivially testable.
 *
 *   NARRATION_PROVIDER=ollama    → local IBM Granite via Ollama (localhost)
 *   NARRATION_PROVIDER=watsonx   → IBM Granite on watsonx.ai (cloud)
 *   NARRATION_PROVIDER=grounded  → force the grounded engine (skip any model)
 *   NARRATION_PROVIDER unset/auto → infer from what is configured:
 *       OLLAMA_BASE_URL present            → ollama
 *       WATSONX_API_KEY + WATSONX_PROJECT_ID set → watsonx
 *       otherwise                          → null (grounded)
 *
 * Returning null means "no model configured — use the grounded deterministic
 * engine." That is the default on a keyless deploy, so judges get the honest
 * grounded path with zero configuration and no keys.
 */

export type NarrationProvider = "ollama" | "watsonx";

type EnvLike = Record<string, string | undefined>;

export function selectNarrationProvider(
  env: EnvLike = typeof process !== "undefined" ? process.env : {},
): NarrationProvider | null {
  const explicit = (env["NARRATION_PROVIDER"] ?? "").trim().toLowerCase();

  if (explicit === "ollama") return "ollama";
  if (explicit === "watsonx") return "watsonx";
  if (explicit === "grounded" || explicit === "none" || explicit === "off") return null;

  // auto (default): infer from whatever endpoints/credentials are present.
  if (env["OLLAMA_BASE_URL"]) return "ollama";
  if (env["WATSONX_API_KEY"] && env["WATSONX_PROJECT_ID"]) return "watsonx";
  return null;
}
