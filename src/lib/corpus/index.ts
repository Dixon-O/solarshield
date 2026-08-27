/**
 * Corpus accessor — typed access to the parsed NOAA advisory corpus.
 * No server dependencies. Safe to import in service worker context.
 */

import type { CorpusChunk, NoaaScale } from "@/lib/core/types";
import rawChunks from "./noaa-scales.json";

// Cast the raw JSON to the typed interface
const CORPUS: CorpusChunk[] = rawChunks as CorpusChunk[];

/**
 * Get all corpus chunks for a specific scale level.
 * Returns an empty array if no chunks exist for that scale.
 */
export function getChunksByScale(scale: NoaaScale): CorpusChunk[] {
  return CORPUS.filter((chunk) => chunk.scale === scale);
}

/**
 * Get the primary description chunk for a scale (the first non-"-effects" chunk).
 */
export function getPrimaryChunk(scale: NoaaScale): CorpusChunk | null {
  return (
    CORPUS.find(
      (chunk) => chunk.scale === scale && !chunk.id.endsWith("-effects"),
    ) ?? null
  );
}

/**
 * Get the effects-detail chunk for a scale.
 */
export function getEffectsChunk(scale: NoaaScale): CorpusChunk | null {
  return CORPUS.find((chunk) => chunk.id === `${scale.toLowerCase()}-effects`) ?? null;
}

/**
 * Full-text search across the corpus.
 * Returns chunks whose text contains any of the query terms (case-insensitive).
 */
export function searchCorpus(query: string): CorpusChunk[] {
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 2);
  if (terms.length === 0) return [];
  return CORPUS.filter((chunk) =>
    terms.some((term) => chunk.text.toLowerCase().includes(term)),
  );
}

/** All corpus chunks (for /judges grounding evidence) */
export function getAllChunks(): CorpusChunk[] {
  return CORPUS;
}
