/**
 * NOAA SWPC data fetchers.
 *
 * Fetches from an explicit allowlist of NOAA endpoints — never user-supplied URLs (SSRF prevention).
 * All timestamps normalized to UTC ISO-8601.
 * Every field guarded for absence: missing → null, never invented.
 * On network/parse error: throws a typed FetchError.
 */

import type { KpRecord, SolarWindRecord, AlertRecord, DataSource } from "./types";

// ---------------------------------------------------------------------------
// Allowlisted NOAA endpoints — only these may be fetched server-side
// ---------------------------------------------------------------------------

const NOAA_ALLOWLIST = {
  kpIndex:
    "https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json",
  rtswWind:
    "https://services.swpc.noaa.gov/json/rtsw/rtsw_wind_1m.json",
  alerts:
    "https://services.swpc.noaa.gov/products/alerts.json",
} as const;

const SOURCE: DataSource = "NOAA-SWPC";
/** Server-side fetch timeout in milliseconds */
const FETCH_TIMEOUT_MS = 8_000;

// ---------------------------------------------------------------------------
// Typed fetch error
// ---------------------------------------------------------------------------

export class FetchError extends Error {
  constructor(
    public readonly source: DataSource,
    public readonly endpoint: string,
    message: string,
  ) {
    super(`[${source}] ${endpoint}: ${message}`);
    this.name = "FetchError";
  }
}

// ---------------------------------------------------------------------------
// Internal helper: fetch with timeout from an allowlisted URL
// ---------------------------------------------------------------------------

async function fetchAllowlisted(url: string, source: DataSource): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(url, { signal: controller.signal });
  } catch (err) {
    clearTimeout(timer);
    const msg = err instanceof Error ? err.message : String(err);
    throw new FetchError(source, url, `Network error: ${msg}`);
  }
  clearTimeout(timer);

  if (!response.ok) {
    throw new FetchError(source, url, `HTTP ${response.status} ${response.statusText}`);
  }

  try {
    return await response.json();
  } catch {
    throw new FetchError(source, url, "Failed to parse JSON response");
  }
}

// ---------------------------------------------------------------------------
// Normalize NOAA time_tag to UTC ISO-8601
// NOAA timestamps come as "2024-05-08T06:09:00" (no Z) — they are UTC per NOAA docs.
// ---------------------------------------------------------------------------

function noaaTimeToUtc(timeTag: unknown): string | null {
  if (typeof timeTag !== "string" || !timeTag) return null;
  // Append Z if missing to make it unambiguously UTC
  const normalized = timeTag.endsWith("Z") ? timeTag : `${timeTag}Z`;
  const d = new Date(normalized);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}

// ---------------------------------------------------------------------------
// Safe number extractor — returns null instead of NaN/undefined
// ---------------------------------------------------------------------------

function safeNum(val: unknown): number | null {
  if (val === null || val === undefined) return null;
  const n = Number(val);
  return isNaN(n) ? null : n;
}

// ---------------------------------------------------------------------------
// Fetch latest Kp reading
// ---------------------------------------------------------------------------

export async function fetchLatestKp(): Promise<KpRecord | null> {
  const fetchedAtUtc = new Date().toISOString();
  const raw = await fetchAllowlisted(NOAA_ALLOWLIST.kpIndex, SOURCE);

  if (!Array.isArray(raw) || raw.length === 0) return null;

  // Array is ordered oldest-first; take the last entry for the latest reading
  const last = raw[raw.length - 1];
  if (typeof last !== "object" || last === null) return null;

  const record = last as Record<string, unknown>;
  const timeTagUtc = noaaTimeToUtc(record["time_tag"]);
  if (!timeTagUtc) return null;

  const kp = safeNum(record["Kp"]);
  if (kp === null) return null;

  return {
    source: SOURCE,
    fetchedAtUtc,
    timeTagUtc,
    kp,
    aRunning: safeNum(record["a_running"]),
    stationCount: safeNum(record["station_count"]),
  };
}

// ---------------------------------------------------------------------------
// Fetch latest real-time solar wind
// ---------------------------------------------------------------------------

export async function fetchLatestSolarWind(): Promise<SolarWindRecord | null> {
  const fetchedAtUtc = new Date().toISOString();
  const raw = await fetchAllowlisted(NOAA_ALLOWLIST.rtswWind, SOURCE);

  if (!Array.isArray(raw) || raw.length === 0) return null;

  // RTSW array is ordered newest-first; take the first entry
  const first = raw[0];
  if (typeof first !== "object" || first === null) return null;

  const record = first as Record<string, unknown>;
  const timeTagUtc = noaaTimeToUtc(record["time_tag"]);
  if (!timeTagUtc) return null;

  return {
    source: SOURCE,
    fetchedAtUtc,
    timeTagUtc,
    active: record["active"] === true,
    sensorSource: typeof record["source"] === "string" ? record["source"] : null,
    protonSpeedKmS: safeNum(record["proton_speed"]),
    protonDensityCm3: safeNum(record["proton_density"]),
    protonTemperatureK: safeNum(record["proton_temperature"]),
    overallQuality: safeNum(record["overall_quality"]),
  };
}

// ---------------------------------------------------------------------------
// Fetch active alerts / watches / warnings
// ---------------------------------------------------------------------------

export async function fetchActiveAlerts(): Promise<AlertRecord[]> {
  const fetchedAtUtc = new Date().toISOString();
  const raw = await fetchAllowlisted(NOAA_ALLOWLIST.alerts, SOURCE);

  if (!Array.isArray(raw)) return [];

  const results: AlertRecord[] = [];

  for (const item of raw) {
    if (typeof item !== "object" || item === null) continue;
    const record = item as Record<string, unknown>;

    const productId = typeof record["product_id"] === "string" ? record["product_id"] : null;
    const issueDatetimeUtc =
      typeof record["issue_datetime"] === "string" ? record["issue_datetime"] : null;
    const message = typeof record["message"] === "string" ? record["message"] : null;

    // Skip records missing required fields
    if (!productId || !issueDatetimeUtc || !message) continue;

    results.push({
      source: SOURCE,
      fetchedAtUtc,
      productId,
      issueDatetimeUtc,
      message,
    });
  }

  return results;
}
