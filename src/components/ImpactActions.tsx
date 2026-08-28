"use client";

/**
 * ImpactActions — effects and action checklist for current storm level.
 * Text sourced verbatim from NOAA corpus with citation link.
 */

import type { GeomagneticScale } from "@/lib/core/types";
import { lookupGeomagneticImpact } from "@/lib/core";
import styles from "./ImpactActions.module.css";

interface ImpactActionsProps {
  scale: GeomagneticScale | null;
  /** When provided, the NOAA reference opens in-app instead of leaving the site. */
  onOpenScales?: () => void;
}

export function ImpactActions({ scale, onOpenScales }: ImpactActionsProps) {
  if (!scale) {
    return (
      <div className={styles.panel}>
        <h2 className={styles.title}>Impact & Actions</h2>
        <p className={styles.noData}>No storm level data available — cannot assess impacts.</p>
      </div>
    );
  }

  const impact = lookupGeomagneticImpact(scale);

  return (
    <div className={styles.panel}>
      <h2 className={styles.title}>Impact & Actions</h2>
      <div className={styles.scaleHeader}>
        <span className={styles.scaleBadge}>{scale}</span>
        <span className={styles.scaleName}>{impact.scaleName}</span>
        {onOpenScales ? (
          <button
            type="button"
            className={styles.citation}
            onClick={onOpenScales}
          >
            NOAA scales ›
          </button>
        ) : (
          <a
            href={impact.citationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.citation}
          >
            NOAA Scale Reference ↗
          </a>
        )}
      </div>

      {scale === "G0" ? (
        <p className={styles.calmNote}>
          Conditions are below storm threshold. No significant impacts expected.
        </p>
      ) : (
        <>
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>System Impacts</h3>
            <div className={styles.effectsList}>
              {impact.effects.length > 0 ? (
                impact.effects.map((effect, i) => (
                  <div key={i} className={styles.effect}>
                    <span className={styles.effectSystem}>{effect.system}</span>
                    <p className={styles.effectDesc}>{effect.description}</p>
                  </div>
                ))
              ) : (
                <p className={styles.noData}>Effect data unavailable from corpus.</p>
              )}
            </div>
          </section>

          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Recommended Actions</h3>
            <ol className={styles.actionList}>
              {impact.actions.map((action, i) => (
                <li key={i} className={styles.action}>{action}</li>
              ))}
            </ol>
          </section>
        </>
      )}
    </div>
  );
}
