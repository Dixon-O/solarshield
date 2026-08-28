"use client";

/**
 * Now panel — current space-weather state.
 * Every value shows its source badge and UTC timestamp.
 * Null values show "no current data" — never invented.
 */

import type { SpaceWeatherSnapshot } from "@/lib/data/types";
import type { GeomagneticScale } from "@/lib/core/types";
import styles from "./Now.module.css";

interface NowProps {
  snapshot: SpaceWeatherSnapshot | null;
  scale: GeomagneticScale | null;
}

function SourceBadge({ source, timeUtc }: { source: string; timeUtc: string }) {
  const d = new Date(timeUtc);
  const timeStr = isNaN(d.getTime())
    ? timeUtc
    : `${d.getUTCHours().toString().padStart(2, "0")}:${d.getUTCMinutes().toString().padStart(2, "0")} UTC`;
  return (
    <span className={styles.badge} title={`Source: ${source} · Fetched at ${timeUtc}`}>
      {source} · {timeStr}
    </span>
  );
}

function DataRow({
  label,
  value,
  unit,
  source,
  timeUtc,
  stateClass,
}: {
  label: string;
  value: string | null;
  unit?: string;
  source?: string;
  timeUtc?: string;
  stateClass?: string;
}) {
  return (
    <div className={styles.row}>
      <span className={styles.rowLabel}>{label}</span>
      <span className={`${styles.rowValue} data-mono ${stateClass ?? ""}`}>
        {value !== null ? (
          <>
            {value}
            {unit && <span className={styles.unit}> {unit}</span>}
          </>
        ) : (
          <span className={styles.noData}>no current data</span>
        )}
      </span>
      {source && timeUtc && (
        <SourceBadge source={source} timeUtc={timeUtc} />
      )}
    </div>
  );
}

function getScaleStateClass(scale: GeomagneticScale | null): string {
  if (!scale || scale === "G0" || scale === "G1") return "state-calm";
  if (scale === "G2") return "state-moderate";
  if (scale === "G3") return "state-elevated";
  return "state-alarm";
}

export function Now({ snapshot, scale }: NowProps) {
  if (!snapshot) {
    return (
      <div className={styles.panel}>
        <p className={styles.loading}>Loading space-weather data…</p>
      </div>
    );
  }

  const kp = snapshot.latestKp;
  const sw = snapshot.latestSolarWind;
  const stateClass = getScaleStateClass(scale);

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h2 className={styles.title}>Current Conditions</h2>
        <span className={styles.snapshotTime}>
          Snapshot: {new Date(snapshot.snapshotUtc).toUTCString().slice(5, 25)} UTC
        </span>
        {snapshot.degraded && (
          <span className={styles.degradedBadge}>
            ⚠ Some sources unavailable
          </span>
        )}
      </div>

      <div className={styles.scaleRow}>
        <span className={`${styles.scaleBadge} ${stateClass}`}>
          {scale ?? "—"}
        </span>
        <span className={styles.scaleName}>
          {scale === "G0" || !scale ? "Below storm threshold" :
           scale === "G1" ? "Minor Storm" :
           scale === "G2" ? "Moderate Storm" :
           scale === "G3" ? "Strong Storm" :
           scale === "G4" ? "Severe Storm" : "Extreme Storm"}
        </span>
      </div>

      <div className={styles.grid}>
        <DataRow
          label="Kp Index"
          value={kp ? kp.kp.toFixed(2) : null}
          unit="(unitless)"
          source={kp?.source}
          timeUtc={kp?.timeTagUtc}
          stateClass={stateClass}
        />
        <DataRow
          label="Solar Wind"
          value={sw?.protonSpeedKmS != null ? sw.protonSpeedKmS.toFixed(0) : null}
          unit="km/s"
          source={sw?.source}
          timeUtc={sw?.timeTagUtc}
        />
        <DataRow
          label="Proton Density"
          value={sw?.protonDensityCm3 != null ? sw.protonDensityCm3.toFixed(1) : null}
          unit="cm⁻³"
          source={sw?.source}
          timeUtc={sw?.timeTagUtc}
        />
      </div>

      {snapshot.activeAlerts.length > 0 && (
        <div className={styles.alerts}>
          <h3 className={styles.alertsTitle}>Active NOAA Alerts</h3>
          {snapshot.activeAlerts.slice(0, 3).map((alert, i) => (
            <div key={i} className={styles.alert}>
              <span className={styles.alertCode}>{alert.productId}</span>
              <p className={styles.alertMsg}>{alert.message.split("\n")[0]}</p>
              <SourceBadge source="NOAA-SWPC" timeUtc={alert.issueDatetimeUtc} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
