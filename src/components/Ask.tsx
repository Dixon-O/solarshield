"use client";

/**
 * Ask — natural-language question interface.
 * Calls /api/ask; shows citations and the abstention state.
 *
 * Offline: if the server is unreachable, the question is answered in the
 * browser by the grounded deterministic engine, using the last snapshot
 * cached in IndexedDB. Real NOAA/NASA values, no server, no model — the
 * same sourced answer, just computed locally.
 */

import { useState } from "react";
import { apiUrl } from "@/lib/config/api";
import type { NarrationResult } from "@/lib/narration";
import { narrateGrounded } from "@/lib/narration/grounded";
import { loadSnapshot } from "@/lib/cache/indexeddb";
import styles from "./Ask.module.css";

export function Ask() {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<NarrationResult | null>(null);
  /** Set when the answer was computed offline; carries the cached snapshot time. */
  const [offlineCachedUtc, setOfflineCachedUtc] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = question.trim();
    if (!q) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setOfflineCachedUtc(null);

    try {
      const resp = await fetch(apiUrl("/api/ask"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });

      if (!resp.ok) {
        setError(`Request failed (${resp.status})`);
        return;
      }

      const data = (await resp.json()) as NarrationResult;
      setResult(data);
    } catch {
      // Server unreachable (offline). Answer locally from the last cached
      // snapshot using the grounded deterministic engine.
      const cached = await loadSnapshot();
      if (cached) {
        const grounded = narrateGrounded(q, cached.snapshot);
        setResult({ ...grounded, engine: "grounded", usedCloudModel: false });
        setOfflineCachedUtc(cached.snapshot.snapshotUtc);
      } else {
        setError(
          "You appear to be offline and no space-weather data has been cached yet. " +
            "Open SolarShield once while online, then Ask will work offline too.",
        );
      }
    } finally {
      setLoading(false);
    }
  }

  const modeLabel = offlineCachedUtc
    ? `Grounded engine · offline (cached ${formatUtcShort(offlineCachedUtc)} UTC)`
    : result?.engine === "granite-cloud"
      ? "IBM Granite (cloud)"
      : result?.engine === "granite-local"
        ? "IBM Granite (local)"
        : "Grounded engine";

  return (
    <div className={styles.panel}>
      <h2 className={styles.title}>Ask</h2>
      <p className={styles.hint}>
        Ask a question about current or forecast space-weather conditions.
      </p>

      <form onSubmit={handleSubmit} className={styles.form}>
        <textarea
          className={styles.textarea}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="e.g. Will my HF radio work in the next 6 hours?"
          rows={3}
          maxLength={500}
          aria-label="Question"
        />
        <button
          type="submit"
          className={styles.button}
          disabled={loading || !question.trim()}
        >
          {loading ? "Asking…" : "Ask"}
        </button>
      </form>

      {error && <p className={styles.error}>{error}</p>}

      {result && (
        <div className={styles.result}>
          {result.abstained ? (
            <div className={styles.abstention}>
              <span className={styles.abstentionIcon} aria-hidden="true">⊘</span>
              <p>{result.answer}</p>
            </div>
          ) : (
            <>
              <div className={styles.modeTag}>{modeLabel}</div>
              <p className={styles.answer}>{result.answer}</p>
            </>
          )}

          {result.sources.length > 0 && (
            <div className={styles.sources}>
              <span className={styles.sourcesLabel}>Sources:</span>
              {result.sources.map((s, i) => (
                <span key={i} className={styles.source}>
                  {s.url ? (
                    <a href={s.url} target="_blank" rel="noopener noreferrer">
                      {s.label}
                    </a>
                  ) : (
                    s.label
                  )}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Format an ISO timestamp as "HH:MM" in UTC for the offline mode tag. */
function formatUtcShort(isoStr: string): string {
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return isoStr;
  return `${d.getUTCHours().toString().padStart(2, "0")}:${d
    .getUTCMinutes()
    .toString()
    .padStart(2, "0")}`;
}
