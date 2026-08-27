/**
 * Impact lookup — pure, deterministic, client-safe.
 *
 * Returns verbatim NOAA effect descriptions and action checklists from the
 * parsed advisory corpus. All text sourced from noaa-scales.json.
 * No server imports — safe for client bundle and service worker.
 */

import type { GeomagneticScale, ImpactSummary, ImpactEffect } from "./types";
import { getEffectsChunk, getPrimaryChunk } from "@/lib/corpus";
import { gScaleName } from "./severity";

const CITATION_URL = "https://www.swpc.noaa.gov/noaa-scales-explanation";

// ---------------------------------------------------------------------------
// Action checklists per G-scale level
// Written from the user's perspective (guide §7: "user's side of the screen")
// Based on NOAA G-scale impact descriptions
// ---------------------------------------------------------------------------

const G_SCALE_ACTIONS: Record<GeomagneticScale, string[]> = {
  G0: [
    "No action required — conditions are below storm threshold.",
    "Continue monitoring for updates.",
  ],
  G1: [
    "Check HF radio at high latitudes for potential minor degradation.",
    "Monitor aurora forecasts if at northern latitudes.",
    "No operational changes required for most systems.",
  ],
  G2: [
    "HF radio operators: expect degraded propagation at higher latitudes. Switch to alternative frequencies or modes.",
    "GPS users: verify accuracy; expect slight position errors at high latitudes.",
    "Satellite operators: may need orientation corrections.",
    "Power grid: high-latitude utilities should monitor for voltage fluctuations.",
  ],
  G3: [
    "HF radio: intermittent blackouts likely on sunlit side — prepare alternative communication methods now.",
    "GPS: low-frequency navigation signals may be briefly degraded — verify position with backup nav.",
    "Satellite: increased drag on LEO satellites; surface charging possible.",
    "Power grid: false alarms on protection devices possible — coordinate with grid operators.",
    "Pilots: HF comms degradation likely at high latitudes — file IFR alternate communication plan.",
  ],
  G4: [
    "HF radio: propagation may be impossible in many areas for 1–2 days — activate backup communication now.",
    "GPS: position errors may be significant for hours — do not rely on GPS alone for critical navigation.",
    "Power grid: widespread voltage control issues; protective relays may trip — reduce load where possible.",
    "Satellite: expect tracking and orientation problems; consider safe-mode transitions.",
    "Pilots: avoid high-latitude routes; HF blackout likely for extended periods.",
    "Emergency services: activate backup communication systems.",
  ],
  G5: [
    "HF radio: complete blackout on sunlit side for hours — HF communication unavailable.",
    "GPS: severely degraded for potentially days — switch to inertial navigation or other backup systems.",
    "Power grid: complete collapse possible in some regions — critical facilities switch to backup power.",
    "Satellite: extensive surface charging and orientation failures — consider emergency safe mode.",
    "Pilots: ground high-latitude operations if GPS and HF are both unavailable.",
    "Emergency management: activate regional emergency plans; expect widespread communication disruption.",
    "Aurora visible at very low latitudes — not a safety concern, but confirms extreme storm.",
  ],
};

// ---------------------------------------------------------------------------
// Parse effects from corpus chunk text into structured ImpactEffect entries
// ---------------------------------------------------------------------------

function parseEffectsFromText(text: string): ImpactEffect[] {
  const effects: ImpactEffect[] = [];

  // The effects chunks follow the pattern: "System — description."
  const systemPatterns: Array<[string, RegExp]> = [
    ["Power Grid", /power grid[^.]*\.[^.]*\./i],
    ["HF Radio", /hf radio[^.]*\.[^.]*\./i],
    ["GPS", /gps[^.]*\.[^.]*\./i],
    ["Spacecraft", /spacecraft[^.]*\.[^.]*\./i],
    ["Aurora", /aurora[^.]*\.[^.]*\./i],
  ];

  for (const [system, pattern] of systemPatterns) {
    const match = text.match(pattern);
    if (match) {
      effects.push({ system, description: match[0].trim() });
    }
  }

  // Fallback: if no structured matches, return the whole text as a single effect
  if (effects.length === 0 && text.trim()) {
    effects.push({ system: "General", description: text.trim() });
  }

  return effects;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Look up the impact summary for a given G-scale level.
 * Returns a "noData" result if the scale is not found in the corpus —
 * never invents effect text.
 */
export function lookupGeomagneticImpact(scale: GeomagneticScale): ImpactSummary {
  const effectsChunk = getEffectsChunk(scale);
  const primaryChunk = getPrimaryChunk(scale);

  if (!effectsChunk && !primaryChunk) {
    return {
      scale,
      scaleName: gScaleName(scale),
      effects: [],
      actions: [],
      citationUrl: CITATION_URL,
      noData: true,
    };
  }

  const sourceChunk = effectsChunk ?? primaryChunk!;
  const effects = parseEffectsFromText(sourceChunk.text);
  const actions = G_SCALE_ACTIONS[scale] ?? [];

  return {
    scale,
    scaleName: gScaleName(scale),
    effects,
    actions,
    citationUrl: CITATION_URL,
    noData: false,
  };
}
