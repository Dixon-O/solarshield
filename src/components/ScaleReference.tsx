"use client";

/**
 * ScaleReference — the NOAA Space Weather Scales, in-app.
 *
 * Replaces the "leaves the site" external link: judges (and users mid-blackout)
 * can read the exact severity scales SolarShield classifies against without
 * leaving the platform. Text is verbatim from the on-device NOAA corpus, so
 * this panel works offline too. Each level keeps a small NOAA source citation
 * for provenance.
 */

import { getAllChunks } from "@/lib/corpus";
import type { CorpusChunk } from "@/lib/core/types";
import styles from "./ScaleReference.module.css";

const LEVEL_NAME = ["Quiet", "Minor", "Moderate", "Strong", "Severe", "Extreme"];

interface Row {
  scale: string;
  name: string;
  text: string;
  effects: string | null;
  citationUrl: string;
}

interface Family {
  letter: "G" | "S" | "R";
  title: string;
  blurb: string;
  rows: Row[];
}

/** G-scale badge colour tracks storm severity; S/R use a neutral chip. */
function chipClass(scale: string): string {
  if (scale.startsWith("G")) {
    const n = Number(scale.slice(1));
    if (n <= 1) return "chip-calm";
    if (n === 2) return "chip-moderate";
    if (n === 3) return "chip-elevated";
    return "chip-alarm";
  }
  return styles.chipNeutral;
}

function buildFamilies(): Family[] {
  const chunks = getAllChunks();
  const primary = chunks.filter((c) => c.scale && !c.id.endsWith("-effects"));
  const effectsById = new Map<string, CorpusChunk>();
  for (const c of chunks) {
    if (c.id.endsWith("-effects") && c.scale) effectsById.set(c.scale, c);
  }

  const toRow = (c: CorpusChunk): Row => {
    const scale = c.scale as string;
    const n = Number(scale.slice(1));
    const eff = effectsById.get(scale);
    return {
      scale,
      name: Number.isFinite(n) ? LEVEL_NAME[n] ?? "" : "",
      text: c.text,
      effects: eff ? eff.text : null,
      citationUrl: c.citationUrl,
    };
  };

  const fam = (letter: "G" | "S" | "R", title: string, blurb: string): Family => ({
    letter,
    title,
    blurb,
    rows: primary.filter((c) => (c.scale as string).startsWith(letter)).map(toRow),
  });

  return [
    fam("G", "Geomagnetic storms", "Ground/grid, GPS and aurora effects — the scale SolarShield tracks live."),
    fam("S", "Solar radiation storms", "Energetic particles — radiation risk to aviation, astronauts and satellites."),
    fam("R", "Radio blackouts", "X-ray flares degrading HF radio and navigation on Earth's dayside."),
  ];
}

export function ScaleReference() {
  const families = buildFamilies();

  return (
    <div className={styles.panel}>
      <div className={styles.head}>
        <h2 className={styles.title}>NOAA Space Weather Scales</h2>
        <p className={styles.sub}>
          The official severity scales this app classifies against — verbatim from NOAA SWPC,
          served on-device so they stay readable through a blackout.
        </p>
      </div>

      <div className={styles.columns}>
        {families.map((f) => (
          <section key={f.letter} className={styles.col} aria-label={f.title}>
            <h3 className={styles.colTitle}>
              <span className={styles.colLetter} aria-hidden="true">{f.letter}</span>
              {f.title}
            </h3>
            <p className={styles.colBlurb}>{f.blurb}</p>

            <div className={styles.list}>
              {f.rows.map((row) => (
                <article key={row.scale} className={styles.row}>
                  <div className={styles.rowHead}>
                    <span className={`${styles.badge} ${chipClass(row.scale)} data-mono`}>
                      {row.scale}
                    </span>
                    <span className={styles.rowName}>{row.name}</span>
                    <a
                      className={styles.cite}
                      href={row.citationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      NOAA ↗
                    </a>
                  </div>
                  <p className={styles.text}>{row.text}</p>
                  {row.effects && <p className={styles.effects}>{row.effects}</p>}
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
