# SolarShield

**A space-weather early-warning copilot that survives the blackout it warns about.**

> Hosted demo: _<!-- TODO: paste deployed URL -->_ · Put it on your phone: [INSTALL.md](./INSTALL.md) · Judges, start here: [JUDGE.md](./JUDGE.md)

---

## The problem

A severe solar storm — a coronal mass ejection slamming into Earth's magnetic field — can take down power grids, GPS, HF radio, and satellite links. The May 2024 "Gannon" storm (the first G5 in twenty years) is the reference case: transformers stressed, aviation rerouted, precision agriculture blind for a day.

Here is the cruel irony. The people who most need the warning — grid operators, airline dispatchers, emergency crews, anyone off-grid — are exactly the people who lose connectivity when the storm hits. And today's warning tools are **cloud-only dashboards**. They go dark in the very blackout they exist to warn you about.

## What SolarShield does differently

SolarShield is **offline-first**. It pulls live space-weather data while the network is up, then keeps working when the network goes down: the last-known state and the NOAA advisory corpus are cached on-device, and a grounded deterministic engine keeps producing sourced guidance — computed right in the browser — with no server at all.

That is the whole innovation in one sentence: **resilience through the blackout.** A warning system is only worth something if it's still standing at the moment of the event.

And it never bluffs. Every number it shows carries its NOAA/NASA source and UTC timestamp. The language model is **never allowed to compute or invent a value** — it only rephrases numbers the deterministic engine already produced, and a grounding gate blocks anything ungrounded before it reaches the screen. When the evidence isn't there, the app abstains instead of guessing.

---

## Run it in 60 seconds

No keys required. The grounded deterministic engine runs offline-first out of the box.

```bash
npm install
npm run dev
# open http://localhost:3000
```

To light up the optional live + AI paths, copy `.env.example` → `.env.local` and fill in:

- `NASA_API_KEY` — free from https://api.nasa.gov, powers live CME data (`DEMO_KEY` works for light testing)
- `WATSONX_API_KEY`, `WATSONX_PROJECT_ID`, `WATSONX_URL` — enable IBM Granite narration + Granite Guardian (server-side only; never prefixed `NEXT_PUBLIC_`)
- NOAA SWPC needs no key.

### Verify the build

```bash
npm run typecheck   # 0 errors
npm run lint        # 0 warnings
npm test            # 98 tests across 15 files
npm run build       # production web build
```

---

## How it works — the degradation ladder

This ladder is the heart of the app. Each rung is a real, tested fallback, so guidance keeps flowing as conditions deteriorate:

**Online:** typed MCP tools fetch grounded values → **IBM Granite** phrases them in plain language → **Granite Guardian** verifies the phrasing is grounded → UI. If Guardian fails or the cloud is unavailable → the **grounded deterministic engine** takes over.

**Offline:** the **grounded deterministic engine**, computed in the browser from the last-known snapshot and NOAA corpus cached in IndexedDB — real NOAA/NASA values, every number sourced, no server and no model.

**Insufficient evidence:** the app **abstains** rather than guess.

The bottom rung — the grounded deterministic engine over cached NOAA data — is guaranteed to work with zero network and zero API keys. Everything above it is enhancement, not dependency.

## The IBM stack, honestly

| Component | Model / tech | Role | Status |
|---|---|---|---|
| IBM Granite (watsonx.ai) | `ibm/granite-3-3-8b-instruct` | Cloud narration — turns the deterministic values into plain language under strict "do not compute any new value" rules | Real watsonx call; needs server-side keys — falls back to the grounded engine without them |
| IBM Granite Guardian (watsonx.ai) | `ibm/granite-guardian-3-8b` | Grounding gate — verdicts each narration safe/grounded before it reaches the UI; fail-safe (any error blocks the output) | Real watsonx call; needs server-side keys |
| Typed MCP tools | 6 in-process tools (`src/lib/mcp/tools.ts`) | Hand the model grounded values instead of letting it do math: `get_current_conditions`, `get_forecast`, `estimate_arrival`, `classify_severity`, `lookup_impact`, `cite_advisory` | Real |
| Deterministic core + NOAA corpus | TypeScript; hand-curated NOAA corpus | The guaranteed answer path: physics-based arrival window, NOAA G-scale classification, verbatim impact text with citations | Real; covered by the 98-test suite |

**Data sources:** NOAA SWPC (planetary Kp, solar wind — no key) and NASA DONKI (coronal mass ejections — `NASA_API_KEY`). Guidance text is verbatim from the NOAA Space Weather Scales.

## Layout

Three tabs plus a built-in demo:

- **Live** — current conditions, an inbound-storm countdown, and the impact actions that matter now.
- **Ask** — grounded natural-language Q&A. Works with **no keys** and **even offline** (the grounded engine answers in the browser from the cached snapshot, citing Kp + source + UTC; the mode tag says whether the answer came from IBM Granite or the offline grounded engine).
- **Replay** — play back a historical storm to see the system escalate.
- **`/judges`** — a scripted six-act pain→relief demonstration over recorded 10–11 May 2024 Gannon G5 data. See [JUDGE.md](./JUDGE.md).

## On your phone

SolarShield installs on a phone **straight from the browser** — no App Store, no
account. It opens full-screen and keeps working offline, so the resilience story
holds in your pocket. iPhone (Safari) and Android (Chrome) are both a few taps;
the steps are in **[INSTALL.md](./INSTALL.md)**. This is the shipping path for
iPhone today.

For a store-listed **native Android** app, Capacitor wraps this same web app into
a native binary — built on Windows, no rewrite. The native shell calls the
**hosted** backend so the watsonx keys stay server-side, and the offline layer
works identically inside it. A native **iOS** binary is an optional later step (it
needs a Mac and a paid Apple developer account); until then iPhone uses the PWA
above. Full handover in [BUILD-NATIVE.md](./BUILD-NATIVE.md).

## Honest limitations

- The watsonx **model IDs above are documented, not yet live-verified** with a real keyed call. Until that call is made, the cloud-Granite path is unverified — the app still works fully without it via the grounded engine.
- **Phones install the PWA today** (see [INSTALL.md](./INSTALL.md)). **Store-listed native binaries aren't built or published yet** — the hosted-demo link above is still a placeholder, and native Android packaging (Windows) plus the optional iOS build run on the developer's machine per [BUILD-NATIVE.md](./BUILD-NATIVE.md).

## License

_<!-- TODO: choose a license before public submission (e.g. MIT / Apache-2.0) -->_
