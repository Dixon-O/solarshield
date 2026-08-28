"use client";

/**
 * InstallHint — a calm, one-line nudge that shows ONLY on iPhone/iPad Safari when
 * SolarShield is not yet installed to the home screen. iOS gives web apps no
 * automatic install prompt, so the user must add it by hand — this points the way.
 *
 * On Android (and desktop Chrome/Edge) the browser surfaces its own install
 * affordance, so this stays hidden there. Dismissible, and the dismissal sticks.
 *
 * Hydration safety: it starts hidden, matching the server-rendered HTML and the
 * first client paint exactly. The iOS/standalone checks read `navigator`/`window`,
 * which only exist on the client, so they run in a mount effect — never at render.
 */

import { useEffect, useState } from "react";
import styles from "./InstallHint.module.css";

const DISMISS_KEY = "solarshield-install-hint-dismissed";

/** True only on an iOS device running Safari (not Chrome/Firefox/Edge for iOS). */
function isIosSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const iOS =
    /iPad|iPhone|iPod/.test(ua) ||
    // iPadOS 13+ reports a desktop Safari UA; disambiguate by touch support.
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (!iOS) return false;
  // Other iOS browsers are WebKit but have no "Add to Home Screen" share action.
  return !/CriOS|FxiOS|EdgiOS|OPiOS|mercury/i.test(ua);
}

/** True when the app is already launched from the home screen (installed). */
function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const displayModeStandalone =
    window.matchMedia?.("(display-mode: standalone)").matches === true;
  const iosStandalone =
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  return displayModeStandalone || iosStandalone;
}

export function InstallHint() {
  // Hidden on the server and on first paint → no hydration mismatch.
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isStandalone()) return; // already installed — nothing to prompt
    if (!isIosSafari()) return; // only iOS Safari needs the manual step
    let dismissed = false;
    try {
      dismissed = window.localStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      /* storage blocked — show the hint anyway */
    }
    if (!dismissed) setShow(true);
  }, []);

  if (!show) return null;

  function dismiss() {
    setShow(false);
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* storage blocked — dismissal lasts for this session only */
    }
  }

  return (
    <div className={styles.hint} role="note">
      <span className={styles.icon} aria-hidden="true">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3v12" />
          <path d="M8 7l4-4 4 4" />
          <path d="M6 12v7a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-7" />
        </svg>
      </span>
      <span className={styles.text}>
        Install SolarShield — tap <strong>Share</strong>, then{" "}
        <strong>Add to Home Screen</strong>. It then works offline.
      </span>
      <button
        type="button"
        className={styles.close}
        onClick={dismiss}
        aria-label="Dismiss install hint"
      >
        ×
      </button>
    </div>
  );
}
