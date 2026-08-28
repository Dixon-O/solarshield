/**
 * Granite Nano on-device narration via transformers.js (WebGPU).
 *
 * Used when offline or when cloud narration is unavailable.
 * Same interface as cloud.ts: receives structured values, phrases them — never computes.
 * Falls back to null if WebGPU unavailable or model fails to load.
 *
 * Model: ibm-granite/granite-3.0-2b-instruct (verified on HuggingFace)
 * Runtime: @huggingface/transformers (transformers.js v3 — the official successor to @xenova/transformers)
 */

const NANO_MODEL_ID = "ibm-granite/granite-3.0-2b-instruct";

export interface NanoNarrationResult {
  text: string;
  modelId: string;
  success: boolean;
}

// Lazy-loaded pipeline — only initialized when first needed
let pipelinePromise: Promise<unknown> | null = null;
let pipelineReady = false;

/**
 * Check if WebGPU is available in the current environment.
 */
function isWebGpuAvailable(): boolean {
  return typeof navigator !== "undefined" && "gpu" in navigator;
}

/**
 * Dynamically load the transformers.js pipeline.
 * Returns null if the environment doesn't support it or load fails.
 */
async function getOrCreatePipeline(): Promise<unknown | null> {
  if (!isWebGpuAvailable()) return null;
  if (pipelineReady && pipelinePromise) {
    return pipelinePromise;
  }

  try {
    // Dynamic import — keeps this out of the server bundle
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const transformers = await import("@huggingface/transformers" as any);
    const { pipeline } = transformers;
    pipelinePromise = pipeline("text-generation", NANO_MODEL_ID, {
      // Use WebGPU backend when available
      device: "webgpu",
    });
    const p = await pipelinePromise;
    pipelineReady = true;
    return p;
  } catch {
    pipelinePromise = null;
    pipelineReady = false;
    return null;
  }
}

/**
 * Build the on-device narration prompt.
 * Same contract as cloud: explain provided values, do not compute.
 */
function buildNanoPrompt(question: string, structuredValues: Record<string, unknown>): string {
  const valuesJson = JSON.stringify(structuredValues, null, 2);
  return (
    `<|system|>You are a space-weather explainer. Use ONLY the data below. Do not compute new values.\n` +
    `<|user|>DATA:\n${valuesJson}\nQUESTION: ${question}\n` +
    `<|assistant|>`
  );
}

/**
 * Generate on-device narration using Granite Nano.
 * Returns null if model is unavailable — caller falls back to template.
 */
export async function callNanoNarration(
  question: string,
  structuredValues: Record<string, unknown>,
): Promise<NanoNarrationResult | null> {
  const p = await getOrCreatePipeline();
  if (!p) return null;

  try {
    const prompt = buildNanoPrompt(question, structuredValues);
    // @ts-expect-error — transformers.js generator is loosely typed
    const output = await p(prompt, {
      max_new_tokens: 200,
      do_sample: false,
    });

    // Extract generated text from the output array
    if (
      Array.isArray(output) &&
      output.length > 0 &&
      typeof output[0]?.generated_text === "string"
    ) {
      const full = output[0].generated_text as string;
      // Strip the prompt from the generated text (transformers.js returns prompt + output)
      const assistantMarker = "<|assistant|>";
      const idx = full.lastIndexOf(assistantMarker);
      const text = idx >= 0 ? full.slice(idx + assistantMarker.length).trim() : full.trim();
      return { text, modelId: NANO_MODEL_ID, success: true };
    }
    return null;
  } catch {
    return null;
  }
}

/** Whether the Nano model is loaded and ready */
export function isNanoReady(): boolean {
  return pipelineReady;
}

/** For testing: reset the pipeline state */
export function resetNanoPipeline(): void {
  pipelinePromise = null;
  pipelineReady = false;
}
