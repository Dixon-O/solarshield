"use client";

/**
 * Inbound panel — CME forecast with countdown dial.
 */

import type { SpaceWeatherSnapshot } from "@/lib/data/types";
import type { GeomagneticScale, ArrivalEstimate } from "@/lib/core/types";
import { CountdownDial } from "./CountdownDial";
import styles from "./Inbound.module.css";

interface InboundProps {
  snapshot: SpaceWeatherSnapshot | null;
  scale: GeomagneticScale | null;
  arrival: ArrivalEstimate | null;
}

export function Inbound({ snapshot, scale, arrival }: InboundProps) {
  const cme = snapshot?.recentCmes[snapshot.recentCmes.length - 1] ?? null;

  return (
    <div className={styles.panel}>
      <h2 className={styles.title}>Inbound</h2>

      <CountdownDial arrival={arrival} scale={scale} />

      {cme ? (
        <div className={styles.cmeInfo}>
          <div className={styles.row}>
            <span className={styles.label}>CME Departure</span>
            <span className="data-mono">{new Date(cme.startTimeUtc).toUTCString().slice(5, 25)} UTC</span>
            <span className={styles.badge}>{cme.source} · {new Date(cme.fetchedAtUtc).toUTCString().slice(17,22)} UTC</span>
          </div>
          <div className={styles.row}>
            <span className={styles.label}>CME Speed</span>
            <span className="data-mono">
              {cme.primaryAnalysis?.speedKmS != null
                ? `${cme.primaryAnalysis.speedKmS.toFixed(0)} km/s`
                : "unavailable"}
            </span>
            <span className={styles.badge}>{cme.source}</span>
          </div>
          <div className={styles.row}>
            <span className={styles.label}>Source Region</span>
            <span className="data-mono">{cme.sourceLocation ?? "unknown"}</span>
          </div>
          {arrival && (
            <>
              <div className={styles.row}>
                <span className={styles.label}>Est. Arrival</span>
                <span className="data-mono">{new Date(arrival.arrivalUtc).toUTCString().slice(5, 25)} UTC</span>
              </div>
              <div className={styles.row}>
                <span className={styles.label}>Window</span>
                <span className="data-mono">
                  {new Date(arrival.earliestArrivalUtc).toUTCString().slice(17, 22)} –{" "}
                  {new Date(arrival.latestArrivalUtc).toUTCString().slice(17, 22)} UTC
                </span>
              </div>
            </>
          )}
          {!arrival && cme.primaryAnalysis?.speedKmS == null && (
            <p className={styles.noArrival}>
              Arrival time unavailable — CME speed data missing.
            </p>
          )}
        </div>
      ) : (
        <p className={styles.noCme}>
          No CME events detected in the current data window.{" "}
          <span className={styles.sourceNote}>Source: NASA DONKI</span>
        </p>
      )}
    </div>
  );
}
