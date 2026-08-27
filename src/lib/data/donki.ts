/**
 * NASA DONKI data fetchers.
 *
 * Fetches CME, GST, and FLR events from NASA's DONKI API.
 * API key loaded from environment variable NASA_API_KEY (server-side only, never NEXT_PUBLIC_).
 * Falls back to DEMO_KEY for light testing — rate-limited, never used in production.
 *
 * DONKI is treated as optional enrichment: if unavailable, returns empty arrays
 * rather than throwing, so the snapshot can still be assembled from NOAA data.
 */

import type { CmeRecord, CmeAnalysis, DataSource } from "./types";
import { FetchError } from "./noaa";

// ---------------------------------------------------------------------------
// Allowlisted DONKI base URL — only this domain may be fetched server-side
// ---------------------------------------------------------------------------

const DONKI_BASE = "https://api.nasa.gov/DONKI";
const SOURCE: DataSource = "NASA-DONKI";
const FETCH_TIMEOUT_MS = 10_000; // DONKI can be slow

// ---------------------------------------------------------------------------
// Internal helper: fetch with timeout from the DONKI allowlisted domain
// ---------------------------------------------------------------------------

async function fetchDonki(path: string): Promise<unknown> {
  // API key loaded server-side from env — never from NEXT_PUBLIC_ or hardcoded
  const apiKey =
    typeof process !== "undefined" && process.env["NASA_API_KEY"]
      ? process.env["NASA_API_KEY"]
      : "DEMO_KEY";

  const url = `${DONKI_BASE}${path}&api_key=${apiKey}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(url, { signal: controller.signal });
  } catch (err) {
    clearTimeout(timer);
    const msg = err instanceof Error ? err.message : String(err);
    throw new FetchError(SOURCE, url, `Network error: ${msg}`);
  }
  clearTimeout(timer);

  if (!response.ok) {
    throw new FetchError(SOURCE, url, `HTTP ${response.status} ${response.statusText}`);
  }

  try {
    return await response.json();
  } catch {
    throw new FetchError(SOURCE, url, "Failed to parse JSON response");
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function safeNum(val: unknown): number | null {
  if (val === null || val === undefined) return null;
  const n = Number(val);
  return isNaN(n) ? null : n;
}

function safeStr(val: unknown): string | null {
  return typeof val === "string" && val.length > 0 ? val : null;
}

function toUtcIso(val: unknown): string | null {
  if (typeof val !== "string" || !val) return null;
  // DONKI times come as "2024-05-08T06:09Z" — already UTC, ensure ISO format
  const normalized = val.endsWith("Z") ? val : `${val}Z`;
  const d = new Date(normalized);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

// ---------------------------------------------------------------------------
// Parse a single CME analysis entry
// ---------------------------------------------------------------------------

function parseCmeAnalysis(item: unknown): CmeAnalysis | null {
  if (typeof item !== "object" || item === null) return null;
  const a = item as Record<string, unknown>;
  return {
    time21_5Utc: toUtcIso(a["time21_5"]),
    speedKmS: safeNum(a["speed"]),
    halfAngleDeg: safeNum(a["halfAngle"]),
    isMostAccurate: a["isMostAccurate"] === true,
  };
}

// ---------------------------------------------------------------------------
// Fetch recent CME events
// ---------------------------------------------------------------------------

export async function fetchRecentCmes(lookbackDays = 7): Promise<CmeRecord[]> {
  const fetchedAtUtc = new Date().toISOString();
  const end = new Date();
  const start = new Date(end.getTime() - lookbackDays * 24 * 60 * 60 * 1000);
  const startStr = start.toISOString().split("T")[0];
  const endStr = end.toISOString().split("T")[0];

  const raw = await fetchDonki(`/CME?startDate=${startStr}&endDate=${endStr}`);

  if (!Array.isArray(raw)) return [];

  const results: CmeRecord[] = [];

  for (const item of raw) {
    if (typeof item !== "object" || item === null) continue;
    const record = item as Record<string, unknown>;

    const activityId = safeStr(record["activityID"]);
    const startTimeUtc = toUtcIso(record["startTime"]);
    if (!activityId || !startTimeUtc) continue;

    // Find the most-accurate CME analysis
    let primaryAnalysis: CmeAnalysis | null = null;
    if (Array.isArray(record["cmeAnalyses"])) {
      const analyses = record["cmeAnalyses"]
        .map(parseCmeAnalysis)
        .filter((a): a is CmeAnalysis => a !== null);
      // Prefer isMostAccurate = true; fall back to the last entry
      primaryAnalysis =
        analyses.find((a) => a.isMostAccurate) ?? analyses[analyses.length - 1] ?? null;
    }

    // Extract linked event IDs
    const linkedEventIds: string[] = [];
    if (Array.isArray(record["linkedEvents"])) {
      for (const ev of record["linkedEvents"]) {
        if (typeof ev === "object" && ev !== null) {
          const id = safeStr((ev as Record<string, unknown>)["activityID"]);
          if (id) linkedEventIds.push(id);
        }
      }
    }

    results.push({
      source: SOURCE,
      fetchedAtUtc,
      activityId,
      startTimeUtc,
      sourceLocation: safeStr(record["sourceLocation"]),
      activeRegionNum: safeNum(record["activeRegionNum"]),
      primaryAnalysis,
      linkedEventIds,
      detailUrl: safeStr(record["link"]),
    });
  }

  return results;
}
