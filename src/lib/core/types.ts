/**
 * Core domain types for the SolarShield deterministic engine.
 * All types are pure — no server dependencies.
 */

// ---------------------------------------------------------------------------
// NOAA Scale types
// ---------------------------------------------------------------------------

export type GeomagneticScale = "G0" | "G1" | "G2" | "G3" | "G4" | "G5";
export type SolarRadiationScale = "S0" | "S1" | "S2" | "S3" | "S4" | "S5";
export type RadioBlackoutScale = "R0" | "R1" | "R2" | "R3" | "R4" | "R5";
export type NoaaScale = GeomagneticScale | SolarRadiationScale | RadioBlackoutScale;

// ---------------------------------------------------------------------------
// Arrival estimate — produced by the deterministic arrival-time engine
// ---------------------------------------------------------------------------

export interface ArrivalEstimate {
  /** UTC ISO-8601 best-estimate arrival time */
  arrivalUtc: string;
  /** ±uncertainty window in hours (default ±6 h per NOAA/CCMC guidance) */
  uncertaintyHours: number;
  /** Earliest possible arrival (arrivalUtc − uncertaintyHours) */
  earliestArrivalUtc: string;
  /** Latest possible arrival (arrivalUtc + uncertaintyHours) */
  latestArrivalUtc: string;
  /** Input distance in km */
  distanceKm: number;
  /** Input speed in km/s */
  speedKmS: number;
  /** Computed travel time in hours */
  travelTimeHours: number;
}

// ---------------------------------------------------------------------------
// Impact summary — produced by corpus lookup
// ---------------------------------------------------------------------------

export interface ImpactEffect {
  /** Affected system (e.g. "HF Radio", "GPS", "Power Grid", "Satellite") */
  system: string;
  /** Verbatim effect description from NOAA corpus */
  description: string;
}

export interface ImpactSummary {
  /** The NOAA scale level this applies to */
  scale: NoaaScale;
  /** Human-readable scale name */
  scaleName: string;
  /** Effects on specific systems */
  effects: ImpactEffect[];
  /** Plain-language action checklist */
  actions: string[];
  /** Citation URL */
  citationUrl: string;
  /** Whether this is a "no data" fallback (scale not found in corpus) */
  noData: boolean;
}

// ---------------------------------------------------------------------------
// Corpus chunk — a parsed advisory document segment
// ---------------------------------------------------------------------------

export interface CorpusChunk {
  /** Unique chunk ID */
  id: string;
  /** Document section heading */
  section: string;
  /** NOAA scale this chunk applies to (if applicable) */
  scale: NoaaScale | null;
  /** Verbatim text from the NOAA source document */
  text: string;
  /** Citation URL for this chunk */
  citationUrl: string;
}
