/**
 * Tests for the local Ollama narration + Guardian gate.
 * fetch is stubbed; no Ollama server or models are required.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { callOllamaNarration, gateWithOllamaGuardian } from "./ollama";

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("callOllamaNarration", () => {
  it("returns trimmed text and default model on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ response: "  A grounded answer.  ", done: true }),
      }),
    );

    const result = await callOllamaNarration({
      question: "What is the storm level?",
      structuredValues: { kp: 3.33, scale: "G0" },
    });

    expect(result).not.toBeNull();
    expect(result!.text).toBe("A grounded answer.");
    expect(result!.modelId).toBe("granite3.3:8b");
    expect(result!.success).toBe(true);
  });

  it("POSTs /api/generate with raw:true, stream:false, temperature 0, model, and a prompt", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ response: "ok" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await callOllamaNarration({ question: "q", structuredValues: { kp: 1 } });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://127.0.0.1:11434/api/generate");
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.raw).toBe(true);
    expect(body.stream).toBe(false);
    expect(body.model).toBe("granite3.3:8b");
    expect(body.options.temperature).toBe(0);
    expect(typeof body.prompt).toBe("string");
    expect(body.prompt.length).toBeGreaterThan(0);
  });

  it("returns null on a non-ok response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({ ok: false, status: 500, json: () => Promise.resolve({}) }),
    );
    const result = await callOllamaNarration({ question: "q", structuredValues: {} });
    expect(result).toBeNull();
  });

  it("returns null when fetch throws (server not running)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ECONNREFUSED")));
    const result = await callOllamaNarration({ question: "q", structuredValues: {} });
    expect(result).toBeNull();
  });

  it("returns null on an empty response string", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ response: "" }) }),
    );
    const result = await callOllamaNarration({ question: "q", structuredValues: {} });
    expect(result).toBeNull();
  });

  it("honors OLLAMA_MODEL and OLLAMA_BASE_URL overrides (trailing slash stripped)", async () => {
    vi.stubEnv("OLLAMA_MODEL", "granite3.3:2b");
    vi.stubEnv("OLLAMA_BASE_URL", "http://localhost:9999/");
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ response: "text" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await callOllamaNarration({ question: "q", structuredValues: {} });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://localhost:9999/api/generate");
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.model).toBe("granite3.3:2b");
    expect(result!.modelId).toBe("granite3.3:2b");
  });
});

describe("gateWithOllamaGuardian", () => {
  const NARRATION = "G0 (Quiet) at Kp 3.33 [NOAA SWPC].";

  it("passes when the verdict is 'safe'", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ response: "safe" }) }),
    );
    const result = await gateWithOllamaGuardian(NARRATION, { kp: 3.33 });
    expect(result.passed).toBe(true);
    expect(result.text).toBe(NARRATION);
  });

  it("blocks when the verdict is 'unsafe'", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ response: "unsafe" }) }),
    );
    const result = await gateWithOllamaGuardian(NARRATION, { kp: 3.33 });
    expect(result.passed).toBe(false);
    expect(result.text).toBeNull();
  });

  it("blocks when 'unsafe' appears as a substring (checked before 'safe')", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ response: "This response is unsafe." }),
      }),
    );
    const result = await gateWithOllamaGuardian(NARRATION, { kp: 3.33 });
    expect(result.passed).toBe(false);
    expect(result.text).toBeNull();
  });

  it("blocks on an ambiguous verdict (fail-safe)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ response: "maybe" }) }),
    );
    const result = await gateWithOllamaGuardian(NARRATION, { kp: 3.33 });
    expect(result.passed).toBe(false);
    expect(result.text).toBeNull();
  });

  it("blocks on a fetch error (fail-safe)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    const result = await gateWithOllamaGuardian(NARRATION, { kp: 3.33 });
    expect(result.passed).toBe(false);
    expect(result.text).toBeNull();
  });
});
