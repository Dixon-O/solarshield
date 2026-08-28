"use client";

/**
 * Ask — natural-language question interface.
 * Calls /api/ask; shows citations; abstention state; offline indicator.
 */

import { useState } from "react";
import { apiUrl } from "@/lib/config/api";
import type { NarrationResult } from "@/lib/narration";
import styles from "./Ask.module.css";

export function Ask() {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<NarrationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const resp = await fetch(apiUrl("/api/ask"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: question.trim() }),
      });

      if (!resp.ok) {
        setError(`Request failed (${resp.status})`);
        return;
      }

      const data = (await resp.json()) as NarrationResult;
      setResult(data);
    } catch {
      setError("Could not reach the server. Are you offline?");
    } finally {
      setLoading(false);
    }
  }

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
              <div className={styles.modeTag}>
                {result.usedCloudModel
                  ? "IBM Granite (cloud)"
                  : result.usedOnDeviceModel
                    ? "IBM Granite Nano (on-device)"
                    : "Deterministic template"}
              </div>
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
