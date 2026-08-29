/**
 * Tests for narration provider selection (pure, env-driven).
 * Env is passed explicitly so no process.env mutation is needed.
 */

import { describe, it, expect } from "vitest";
import { selectNarrationProvider } from "./provider";

describe("selectNarrationProvider", () => {
  it("returns ollama when NARRATION_PROVIDER=ollama", () => {
    expect(selectNarrationProvider({ NARRATION_PROVIDER: "ollama" })).toBe("ollama");
  });

  it("returns watsonx when NARRATION_PROVIDER=watsonx", () => {
    expect(selectNarrationProvider({ NARRATION_PROVIDER: "watsonx" })).toBe("watsonx");
  });

  it("is case-insensitive and trims whitespace", () => {
    expect(selectNarrationProvider({ NARRATION_PROVIDER: "  Ollama " })).toBe("ollama");
    expect(selectNarrationProvider({ NARRATION_PROVIDER: "WATSONX" })).toBe("watsonx");
  });

  it("returns null when explicitly disabled (grounded/none/off)", () => {
    expect(selectNarrationProvider({ NARRATION_PROVIDER: "grounded" })).toBeNull();
    expect(selectNarrationProvider({ NARRATION_PROVIDER: "none" })).toBeNull();
    expect(selectNarrationProvider({ NARRATION_PROVIDER: "off" })).toBeNull();
  });

  it("auto-infers ollama from OLLAMA_BASE_URL", () => {
    expect(selectNarrationProvider({ OLLAMA_BASE_URL: "http://127.0.0.1:11434" })).toBe(
      "ollama",
    );
  });

  it("auto-infers watsonx from complete watsonx credentials", () => {
    expect(
      selectNarrationProvider({ WATSONX_API_KEY: "k", WATSONX_PROJECT_ID: "p" }),
    ).toBe("watsonx");
  });

  it("prefers ollama over watsonx in auto mode", () => {
    expect(
      selectNarrationProvider({
        OLLAMA_BASE_URL: "http://127.0.0.1:11434",
        WATSONX_API_KEY: "k",
        WATSONX_PROJECT_ID: "p",
      }),
    ).toBe("ollama");
  });

  it("returns null when nothing is configured (keyless default → grounded)", () => {
    expect(selectNarrationProvider({})).toBeNull();
  });

  it("returns null when watsonx credentials are incomplete", () => {
    expect(selectNarrationProvider({ WATSONX_API_KEY: "k" })).toBeNull();
    expect(selectNarrationProvider({ WATSONX_PROJECT_ID: "p" })).toBeNull();
  });

  it("explicit provider wins over auto-inference", () => {
    expect(
      selectNarrationProvider({
        NARRATION_PROVIDER: "watsonx",
        OLLAMA_BASE_URL: "http://127.0.0.1:11434",
      }),
    ).toBe("watsonx");
    // explicit "off" beats a present OLLAMA_BASE_URL
    expect(
      selectNarrationProvider({
        NARRATION_PROVIDER: "off",
        OLLAMA_BASE_URL: "http://127.0.0.1:11434",
      }),
    ).toBeNull();
  });
});
