---
name: solarsheild-domain
description: >
  Domain knowledge skill for the SolarShield space-weather copilot.
  Encodes NOAA G/S/R scale thresholds and effect text, the CME arrival-time
  formula with uncertainty handling, the citation format required by the app,
  and the "abstain, never guess" output contract. Invoke whenever touching the
  deterministic core, impact lookup, or narration layer.
---

# SolarShield Domain Skill

## 1. NOAA Geomagnetic Storm Scale (G-scale)

Thresholds are based on the **3-hour Kp index** from the NOAA Space Weather Scales.
Source: https://www.swpc.noaa.gov/noaa-scales-explanation

| Scale | Kp | Effect summary (verbatim from NOAA) |
|-------|----|-------------------------------------|
| G1    | 5  | Minor — weak power grid fluctuations; minor impact on satellite operations; aurora visible at high latitudes (above 60°) |
| G2    | 6  | Moderate — high-latitude power systems affected; satellite orientation corrections needed; HF radio propagation degraded at high latitudes; aurora visible down to 55° |
| G3    | 7  | Strong — voltage corrections required on power systems; satellite drag increased; HF radio intermittent; aurora visible to ~50° (e.g. Oregon, Illinois) |
| G4    | 8  | Severe — widespread voltage control problems; some protective systems will trip; HF radio propagation possible intermittent; aurora visible down to ~45° |
| G5    | 9  | Extreme — widespread voltage control problems and protective system problems; HF radio propagation blackout; GPS degraded; aurora visible at low latitudes |

**Kp → G-scale mapping rules:**
- Kp < 5 → G0 (no storm, not a NOAA scale level — use "below-storm-threshold")
- Kp = 5 → G1
- Kp = 6 → G2
- Kp = 7 → G3
- Kp = 8 → G4
- Kp ≥ 9 → G5
- Input null/undefined → return null (never invent a classification)

## 2. NOAA Solar Radiation Storm Scale (S-scale)

Thresholds based on **proton flux (≥10 MeV, particles/cm²/s/sr)**.

| Scale | Flux threshold | Effect summary |
|-------|---------------|----------------|
| S1    | 10            | Minor — minor impacts on HF radio in polar regions |
| S2    | 100           | Moderate — infrequent single-event upsets to satellites; small blackouts of HF radio in polar regions |
| S3    | 1,000         | Strong — single-event upsets; noise in imaging systems; degraded satellite tracking; HF radio blackout in polar regions |
| S4    | 10,000        | Severe — memory device errors; star-tracker problems; significant noise in imaging; HF radio blackout |
| S5    | 100,000       | Extreme — unavoidable high radiation hazard to astronauts on EVA; satellite systems may be put into safe mode |

## 3. NOAA Radio Blackout Scale (R-scale)

Thresholds based on **X-ray peak flux (W/m²)** from GOES.

| Scale | X-ray flux      | Effect summary |
|-------|-----------------|----------------|
| R1    | M1 (10⁻⁵)       | Minor — weak degradation of HF radio on sunlit side; occasional loss of radio contact |
| R2    | M5 (5×10⁻⁵)     | Moderate — limited blackout of HF radio; loss of radio contact for tens of minutes |
| R3    | X1 (10⁻⁴)       | Strong — wide area blackout of HF radio; loss of radio contact for ~1 hour |
| R4    | X10 (10⁻³)      | Severe — HF radio blackout on most of sunlit side; loss of radio contact for 1–2 hours |
| R5    | X20 (2×10⁻³)    | Extreme — complete HF blackout on sunlit side; loss of radio contact for several hours |

## 4. CME Arrival-Time Estimation

**Formula:**
```
travel_time_hours = distance_km / (speed_km_s * 3600)
arrival_utc = now_utc + travel_time_hours
```

**Uncertainty:** ±6 hours is the standard uncertainty window for CME arrival prediction
(per NOAA/CCMC guidance). Always report as a range: `[arrival - 6h, arrival + 6h]`.

**Guard conditions (must be checked before calculating — abstain if any fail):**
- `speed_km_s` must be > 0 and not null/undefined → if not, return `null` with reason "speed unavailable"
- `distance_km` must be > 0 → typically ~150,000,000 km (1 AU, Earth–Sun distance)
- Division by zero must never crash the app — check explicitly

**Units (must be labeled in code and UI):**
- Distance: km (kilometers)
- Speed: km/s (kilometers per second)
- Time: hours, then converted to a UTC ISO-8601 string for display
- Never mix with miles

## 5. Impact Lookup Contract

- Effects text must come **verbatim** from the NOAA Space Weather Scales corpus.
- Each impact response must include:
  - `scale`: the G/S/R level string (e.g. "G3")
  - `effects`: string[] — each entry a verbatim NOAA effect description
  - `citationUrl`: "https://www.swpc.noaa.gov/noaa-scales-explanation"
  - `citationSection`: the section name within the document
- If a scale level is not found in the corpus, return a "no data" impact object — never invent effect text.

## 6. Citation Format

Every displayed value must carry:
```
source: "NOAA-SWPC" | "NASA-DONKI" | "NOAA-Scales-Corpus"
fetchedAtUtc: "2024-05-10T18:30:00.000Z"   // ISO-8601 UTC
citationUrl?: "https://..."                 // for corpus citations
```

In the UI, display as: `[NOAA SWPC · 18:30 UTC]` adjacent to the value.

## 7. "Abstain, Never Guess" Contract

When the following conditions occur, the correct output is **an explicit abstention**, never a plausible-looking estimate:

| Condition | Correct output |
|-----------|---------------|
| API field missing or null | `null` in data types; "no current data" in UI |
| CME speed = 0 or missing | `null` arrival estimate; "arrival time unavailable" in UI |
| Kp not yet available | `null` severity; "geomagnetic data unavailable" in UI |
| Question has insufficient evidence | `{ abstained: true, answer: "I don't have data to answer that." }` |
| Network down, no cached data | Offline banner + last-known timestamp; never fabricate |

The narration model (cloud or on-device) must **never** fill in a gap with its parametric knowledge. It only phrases values that the deterministic core provided. If the core returned `null`, the narration must say so.

## 8. Narration Safety Contract

The narration prompt must contain this instruction (paraphrased for the model):
> "You are an explainer, not a calculator. You will be given structured data values produced
> by the SolarShield deterministic engine. Your job is to turn those values into clear
> plain-language guidance for the user. You must not compute any new values, derive any
> numbers, or use your own knowledge about space weather measurements. If a value is marked
> as unavailable, say so. If you are uncertain whether a claim is supported by the provided
> data, do not make it."

Granite Guardian checks every narration output. If it flags a contradiction with the source data, fall back to the deterministic template immediately — never show ungated text.
