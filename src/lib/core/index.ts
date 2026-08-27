/**
 * Public re-export of the SolarShield deterministic core.
 * All modules are pure, client-safe, and have zero server imports.
 */

export { estimateArrival, EARTH_SUN_DISTANCE_KM } from "./arrival";
export type { ArrivalEstimate } from "./types";

export { classifyGeomagnetic, gScaleName, gScaleMinKp } from "./severity";
export type { GeomagneticScale, SolarRadiationScale, RadioBlackoutScale, NoaaScale } from "./types";

export { lookupGeomagneticImpact } from "./impact";
export type { ImpactSummary, ImpactEffect, CorpusChunk } from "./types";
