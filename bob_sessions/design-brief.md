# SolarShield Design Brief — M5

## The question this design must answer

"Does this feel like a cockpit instrument or the default AI dashboard?" → It must feel like a cockpit instrument.

---

## Palette (4 named values + 2 state accents)

Space-weather instrumentation and aurora reference. Not cream+serif, not acid-green, not broadsheet.

```
--color-void:      #0a0e1a   /* deep navy — app background */
--color-surface:   #111827   /* slightly lighter — card/panel surface */
--color-border:    #1e2d40   /* subtle panel border */
--color-muted:     #64748b   /* secondary text, source badges */
--color-text:      #e2e8f0   /* primary text */
--color-data:      #94a3b8   /* numeric readouts, timestamps */

/* SINGLE alarm accent — reserved ONLY for active threat states (G3+) */
--color-alarm:     #ef4444   /* solar red — appears only on active storm indicator */

/* Status accents */
--color-calm:      #22c55e   /* G0–G1 calm state */
--color-moderate:  #f59e0b   /* G2 moderate state */
--color-elevated:  #f97316   /* G3 strong state */
```

**Rule:** `--color-alarm` may only be used in a CSS class that is applied when storm level ≥ G3. Every other use is a design bug.

---

## Typography

- **Display / heading:** `'Inter', system-ui, sans-serif` — clean, readable at any weight
- **Data / numeric (readouts, countdown, Kp, speeds):** `'JetBrains Mono', 'Fira Code', monospace` — monospaced so digits don't shift
- **Body / copy:** `system-ui, sans-serif` — plain, user-facing

Sizes: heading 2rem, subheading 1.25rem, body 0.9375rem, data readout 1.75rem, countdown 3rem+.

---

## Signature Element: Countdown Dial

The thing the app is remembered by. Design principles:
- **Large:** countdown timer at ≥3rem, fills a significant card area
- **The dial:** an SVG arc that fills as the CME approaches (100% when arrival is now)
- **Severity color:** the arc color tracks the G-scale state color (calm → elevated → alarm)
- **Ticking:** updates every second via useEffect + setInterval
- **"No inbound" state:** dial shows at 0% with a quiet "No active inbound events" label
- **prefers-reduced-motion:** disables the arc pulse animation, keeps the counter ticking

---

## Tab layout

Five tabs, always visible on desktop, scrollable on mobile:
1. Now (current state)
2. Inbound (countdown + CME forecast)
3. Impact & Actions (effects + checklist)
4. Ask (natural-language Q&A)
5. Replay (Gannon storm historical)

Tab indicator: a thin bottom border, same color as the severity state.

---

## Copy voice

From the user's side of the screen:
- "HF radio likely disrupted for ~6 hours" (not "Radio propagation degradation detected")
- "Offline — showing last known data (as of 14:03 UTC). Countdown still running." (not "Network error")
- "No active inbound events" (not "null" or "No data available")

---

## May 2024 Gannon G5 Storm Data

Source: NOAA Space Weather Scales event records + DONKI catalog
- **Kp peak:** 9 (G5 Extreme) on May 10–11, 2024
- **Solar wind speed:** ~800 km/s (peak)
- **Primary CME speed:** ~1437 km/s (from DONKI catalog)
- **CME departure:** ~May 8, 2024 06:09 UTC
- **Storm onset:** ~May 10, 2024 17:00 UTC
- **Duration:** ~3 days of active storm conditions
- This was the most severe geomagnetic storm since the Halloween 2003 storms (G5).
