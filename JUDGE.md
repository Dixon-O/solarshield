# Judging SolarShield in 90 seconds

**The one thing to feel:** a space-weather warning tool is worthless if it dies in the blackout. Watch SolarShield keep protecting the user *after* the network goes down.

There are two ways to see it. Path A is the fastest and needs no setup. Path B is the live app.

---

## Path A — the built-in demonstration (recommended, ~60s)

1. Open the app and go to **`/judges`** (or click **"Judges’ demonstration ›"** in the footer).
2. Click **▶ Begin demonstration**, then either click **Next** at your own pace or hit **Auto-play**.
3. Watch the same real UI escalate through six acts, driven by recorded **10–11 May 2024 "Gannon" G5** data:

   | # | Act | What you're seeing |
   |---|---|---|
   | 1 | **All clear** | Quiet Sun (Kp 2). Calm baseline. |
   | 2 | **Storm inbound** | A CME is detected and the countdown appears. |
   | 3 | **Severe storm** | Conditions jump to G4 (Kp 8) — impact actions sharpen. |
   | 4 | **Extreme — G5** | Peak conditions (Kp 9). The most severe guidance. |
   | 5 | **The blackout** | The network drops — and the app **keeps running** on cached data. |
   | 6 | **Still protecting you** | Offline, Kp 9, still giving grounded guidance. This is the whole point. |

Controls: **Back / Next / Auto-play / Restart**, or the **←/→** arrow keys. The panel is labelled on-screen as a re-enactment, not live data — SolarShield never pretends recorded data is live.

**The moment that wins:** acts 5→6. Every other tool would show a spinner. This one doesn't blink.

---

## Path B — the live app (~30s)

- **Live** tab — current conditions, inbound-storm countdown, and the impact actions that matter now. Every value shows its NOAA/NASA source and UTC time.
- **Ask** tab — type *"What's happening right now?"* You get a grounded answer citing the live Kp, its source, and timestamp. **This works with zero API keys** — proof the deterministic engine stands on its own.
- **Replay** tab — play back a historical storm and watch the system escalate.
- **Kill the network** (DevTools → Network → Offline, or airplane mode) and reload. The last-known snapshot and NOAA corpus are served from on-device cache — the app survives.

---

## What to look for (the honesty markers)

- **Every number carries a source.** Kp, solar-wind speed, arrival window — each is tagged with NOAA SWPC or NASA DONKI and a UTC timestamp.
- **The model never does math.** IBM Granite only rephrases values the deterministic engine computed; Granite Guardian gates anything ungrounded before it reaches the screen.
- **It abstains when it should.** No evidence → no guess.

## If something isn't wired during judging

The app is built to degrade gracefully, so nothing here depends on secrets:

- **No watsonx keys?** Narration comes from the grounded engine instead — answers still appear, still sourced.
- **No NASA key?** Live CME data is limited, but the cached corpus and engine still run.
- **No network at all?** That's Path A act 5–6 and Path B's offline step — the intended finale, not a failure.

Full technical detail and the honest limitations list are in [README.md](./README.md).
