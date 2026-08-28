/**
 * IndexedDB cache for the SolarShield offline layer.
 *
 * Stores:
 *   - SpaceWeatherSnapshot (last-known data)
 *   - CorpusChunk[] (parsed NOAA advisory corpus for offline lookup)
 *
 * Uses raw IndexedDB API (no additional package dependency).
 * Client-side only — never imported server-side.
 */

import type { SpaceWeatherSnapshot } from "@/lib/data/types";
import type { CorpusChunk } from "@/lib/core/types";

const DB_NAME = "solarshield-cache";
const DB_VERSION = 1;
const STORE_SNAPSHOT = "snapshot";
const STORE_CORPUS = "corpus";

// ---------------------------------------------------------------------------
// DB initialization
// ---------------------------------------------------------------------------

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB not available in this environment"));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_SNAPSHOT)) {
        db.createObjectStore(STORE_SNAPSHOT);
      }
      if (!db.objectStoreNames.contains(STORE_CORPUS)) {
        db.createObjectStore(STORE_CORPUS);
      }
    };

    request.onsuccess = (event) => resolve((event.target as IDBOpenDBRequest).result);
    request.onerror = (event) => {
      reject(new Error(`IndexedDB open failed: ${(event.target as IDBOpenDBRequest).error?.message}`));
    };
  });

  return dbPromise;
}

// ---------------------------------------------------------------------------
// Generic typed get/set
// ---------------------------------------------------------------------------

async function dbSet<T>(store: string, key: string, value: T): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    const req = tx.objectStore(store).put(value, key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(new Error(`IndexedDB write failed: ${req.error?.message}`));
  });
}

async function dbGet<T>(store: string, key: string): Promise<T | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readonly");
    const req = tx.objectStore(store).get(key);
    req.onsuccess = () => resolve((req.result as T) ?? null);
    req.onerror = () => reject(new Error(`IndexedDB read failed: ${req.error?.message}`));
  });
}

// ---------------------------------------------------------------------------
// Snapshot store
// ---------------------------------------------------------------------------

const SNAPSHOT_KEY = "latest";

export interface CachedSnapshot {
  snapshot: SpaceWeatherSnapshot;
  /** UTC ISO-8601 timestamp when this snapshot was saved to cache */
  savedAtUtc: string;
}

export async function saveSnapshot(snapshot: SpaceWeatherSnapshot): Promise<void> {
  const cached: CachedSnapshot = {
    snapshot,
    savedAtUtc: new Date().toISOString(),
  };
  await dbSet(STORE_SNAPSHOT, SNAPSHOT_KEY, cached);
}

export async function loadSnapshot(): Promise<CachedSnapshot | null> {
  try {
    return await dbGet<CachedSnapshot>(STORE_SNAPSHOT, SNAPSHOT_KEY);
  } catch {
    // IndexedDB unavailable or corrupted — return null (offline path uses null)
    return null;
  }
}

// ---------------------------------------------------------------------------
// Corpus store
// ---------------------------------------------------------------------------

const CORPUS_KEY = "noaa-scales";

export async function saveCorpus(chunks: CorpusChunk[]): Promise<void> {
  await dbSet(STORE_CORPUS, CORPUS_KEY, chunks);
}

export async function loadCorpus(): Promise<CorpusChunk[] | null> {
  try {
    return await dbGet<CorpusChunk[]>(STORE_CORPUS, CORPUS_KEY);
  } catch {
    return null;
  }
}
