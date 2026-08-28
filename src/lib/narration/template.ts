/**
 * Deterministic narration templates — the fallback when cloud LLM is unavailable
 * or when Granite Guardian blocks the cloud narration.
 *
 * Templates are written from the user's side of the screen (guide §7).
 * Every placeholder is replaced with a value from the deterministic core.
 * No LLM required.
 */

import type { GeomagneticScale } from "@/lib/core/types";
import { lookupGeomagneticImpact, gScaleName } from "@/lib/core";
import type { CurrentConditionsResult, ForecastResult } from "@/lib/mcp/tools";
import type { ArrivalEstimate } from "@/lib/core/types";

// ---------------------------------------------------------------------------
// Condition summary template
// ---------------------------------------------------------------------------

export function renderConditionsSummary(
  conditions: CurrentConditionsResult,
  scale: GeomagneticScale | null,
): string {
  const kpStr =
    conditions.kp !== null
      ? `Kp: ${conditions.kp.toFixed(2)}unitless [NOAA SWPC · ${formatUtcShort(conditions.kpTimeUtc)}]`
      : "Kp: not available [NOAA SWPC]";

  const scaleStr = scale ? `${scale} — ${gScaleName(scale)}` : "G-scale not available";

  const windStr =
    conditions.solarWindSpeedKmS !== null
      ? `Solar wind speed: ${conditions.solarWindSpeedKmS.toFixed(0)} km/s [NOAA SWPC · ${formatUtcShort(conditions.solarWindTimeUtc)}]`
      : "Solar wind speed: not available [NOAA SWPC]";

  const alertStr =
    conditions.activeAlertCount > 0
      ? `${conditions.activeAlertCount} active NOAA alert(s): ${conditions.alertSummaries[0] ?? ""}`
      : "No active NOAA alerts.";

  const degradedNote = conditions.degraded
    ? " Note: some data sources are currently unavailable — showing last known values."
    : "";

  return `Current space-weather conditions: ${kpStr}. Storm level: ${scaleStr}. ${windStr}. ${alertStr}${degradedNote}`;
}

// ---------------------------------------------------------------------------
// Arrival estimate template
// ---------------------------------------------------------------------------

export function renderArrivalSummary(
  arrival: ArrivalEstimate | null,
  forecast: ForecastResult,
): string {
  if (!forecast.hasCmeInbound || !forecast.mostRecentCme) {
    return "No CME inbound events detected in the current data window. [NASA DONKI]";
  }

  if (!arrival) {
    return (
      `A CME was recorded at ${forecast.mostRecentCme.startTimeUtc} [NASA DONKI], ` +
      `but arrival time cannot be estimated — CME speed data is unavailable. ` +
      `Monitor NOAA SWPC for updates.`
    );
  }

  const speedStr = `${arrival.speedKmS.toFixed(0)} km/s`;
  const travelStr = `${arrival.travelTimeHours.toFixed(1)} hours`;
  const uncertaintyStr = `±${arrival.uncertaintyHours} hours`;

  return (
    `CME inbound: speed ${speedStr} [NASA DONKI · ${formatUtcShort(forecast.mostRecentCme.startTimeUtc)}]. ` +
    `Estimated travel time: ${travelStr} ${uncertaintyStr}. ` +
    `Expected arrival: ${formatUtcShort(arrival.arrivalUtc)} ` +
    `(earliest ${formatUtcShort(arrival.earliestArrivalUtc)}, latest ${formatUtcShort(arrival.latestArrivalUtc)}).`
  );
}

// ---------------------------------------------------------------------------
// Impact summary template
// ---------------------------------------------------------------------------

export function renderImpactSummary(scale: GeomagneticScale): string {
  const impact = lookupGeomagneticImpact(scale);
  if (impact.noData) {
    return `Impact data for ${scale} is not available in the current corpus. [NOAA SWPC]`;
  }

  const effectsStr = impact.effects
    .map((e) => `${e.system}: ${e.description}`)
    .join(" ");

  return `At ${scale} (${impact.scaleName}): ${effectsStr} [${impact.citationUrl}]`;
}

// ---------------------------------------------------------------------------
// Abstention template
// ---------------------------------------------------------------------------

export function renderAbstention(reason?: string): string {
  const base = "I don't have sufficient data to answer that question.";
  if (reason) return `${base} ${reason}`;
  return base;
}

// ---------------------------------------------------------------------------
// Offline banner template
// ---------------------------------------------------------------------------

export function renderOfflineBanner(lastKnownUtc: string): string {
  return `Offline — showing last known data (as of ${formatUtcShort(lastKnownUtc)} UTC). Countdown still running.`;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatUtcShort(isoStr: string | null | undefined): string {
  if (!isoStr) return "unknown UTC";
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return isoStr;
  // Format as "HH:MM UTC" for conciseness in narration
  return `${d.getUTCHours().toString().padStart(2, "0")}:${d.getUTCMinutes().toString().padStart(2, "0")} UTC`;
}
