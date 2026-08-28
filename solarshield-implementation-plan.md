# SolarShield — Implementation Plan

> **Reality check — corrections to this plan (2026-08-28).** The plan below is
> the original build brief. A few things landed differently in the shipped code;
> where they differ, the code wins and this note is the source of truth:
>
> - **Corpus is hand-curated, not Docling-parsed.** The NOAA Space Weather
>   Scales corpus (`src/lib/corpus/`) was written by hand from the official NOAA
>   text, with a citation URL on every chunk. Docling is **not** used. The
>   grounding claim ("Ask" only cites the corpus) still holds — it just wasn't
>   produced by Docling. Do not claim Docling in the submission.
> - **The offline narrator is the deterministic template.** It always works and
>   never invents a number. **Granite Nano on-device** (WebGPU, via
>   `@huggingface/transformers`) is a real, wired *optional enhancement*
>   (`src/lib/narration/nano.ts`) that self-activates only where the model and
>   WebGPU are present, and falls back to the template otherwise. The package is
>   not bundled by default, so treat Nano as "designed and code-complete,"
>   the template as the guaranteed offline path.
> - **MCP tools run in-process, not as a standalone server.** The six typed
>   tools are real (`src/lib/mcp/tools.ts`) and the narration pipeline calls
>   them so Granite retrieves grounded values instead of hallucinating. The
>   standalone `dist/mcp-server.js` in `.bob/mcp.json` was never built — do not
>   claim a runnable standalone server.
> - **Shipping is via Capacitor, not Expo/EAS.** EAS only builds React Native;
>   SolarShield is a Next.js web app, so it ships to iOS + Android by wrapping
>   the static export with Capacitor. See `BUILD-NATIVE.md`. Ignore the EAS
>   steps in the M7 section below.
> - **Still needs the user's IBM keys:** live-verify the watsonx model IDs with
>   one real call before the demo (see the audit, Problem 5). Until then, treat
>   the cloud-Granite path as unverified.

## Overview

SolarShield is a space-weather early-warning copilot built for the IBM AI Builders Challenge ("Advance Space Exploration with AI"). It watches live solar and geomagnetic data and tells users what is about to hit, when, how bad, and what to do — and keeps working on-device when the storm knocks out the network.

**Core innovation claim:** existing space-weather services are cloud dashboards built for institutions that *depend on the very connectivity a severe storm degrades*. SolarShield is the first tool built to *survive the event it warns about*, coaching a single person through it offline.

**Judging criteria mapped to our choices:**
- Technical Execution → real deterministic core + real live data + real on-device fallback
- Innovation → the resilience-through-blackout lane (unclaimed)
- Challenge Fit → deep IBM stack (Granite via watsonx.ai, Granite Nano on-device, Granite Guardian, Docling, Context Forge/MCP)
- Implementation & Feasibility → live installable PWA + Android APK, "LOAD DEMO" with no keys
- Real-World Impact → tool a bush pilot, ham-radio operator, or solar-farm manager would actually carry

**Architecture principle:** things that must survive a blackout live on the device; everything that merely enriches lives on the server and degrades gracefully.

**Degradation ladder:** full (online + keys) → live data + on-device narration (no key) → cached last-known + on-device narration (offline) → deterministic-only templates (no model).

---

## Sub-Tasks

---

### M0 — Foundation

**Intent:** Establish the repo, secrets hygiene, toolchain, and the `.bob/` quality machine before any feature code is written. The guide mandates these happen *first* — a committed `.gitignore` before any secret can exist, and the custom mode + skill + MCP registration active so every later milestone runs under enforced integrity rules.

**Expected Outcomes:**
- `git` initialized with `.gitignore` (Appendix A of guide) as the first commit
- `SolarShield-Build-Guide-for-Bob.md` added to `.gitignore` (per user requirement)
- Next.js 14 app with TypeScript, ESLint, Prettier, Vitest, `next-pwa` scaffolded
- `.env.example` committed (Appendix B names, no real values)
- `.bob/custom_modes.yaml` — "SolarShield Data-Integrity Engineer" mode defined
- `.bob/skills/solarsheild-domain/SKILL.md` — NOAA G/S/R thresholds, arrival-time formula, citation format, abstain contract
- `.bob/mcp.json` — MCP server stub registered (real tools wired in M3)
- `bob_sessions/` directory initialized with a README
- `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build` all pass (empty baseline)

**Todo List:**
1. Run `git init` and immediately create `.gitignore` from Appendix A + add `SolarShield-Build-Guide-for-Bob.md` to it
2. Commit `.gitignore` as the very first commit: `chore: add .gitignore before any other file`
3. Scaffold Next.js 14 with TypeScript: `npx create-next-app@latest . --typescript --eslint --app --src-dir --import-alias "@/*"`
4. Add Prettier config (`.prettierrc`) and add `"format"` and `"format:check"` scripts
5. Add Vitest + `@testing-library/react` + `@testing-library/jest-dom`; add `"test"` and `"typecheck"` scripts to `package.json`
6. Add `next-pwa` (or `@ducanh2912/next-pwa`) for PWA support; scaffold `public/manifest.json` and a placeholder service worker entry
7. Commit `.env.example` with the four variable names from Appendix B; confirm no real values
8. Create `.bob/custom_modes.yaml` with the "SolarShield Data-Integrity Engineer" role definition encoding: every displayed value cites source+UTC; model never emits a number; missing data = abstain; secrets never enter git; API-deletion test required
9. Create `.bob/skills/solarsheild-domain/SKILL.md` with NOAA G/S/R scale thresholds and effect text, arrival-time formula (distance ÷ speed ± uncertainty), citation format, and the "abstain, never guess" output contract
10. Create `.bob/mcp.json` stub registering the local MCP server (tool names: `get_current_conditions`, `get_forecast`, `estimate_arrival`, `classify_severity`, `lookup_impact`, `cite_advisory`)
11. Create `bob_sessions/README.md` explaining the directory purpose
12. Run `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build` — paste results; fix until green
13. Commit everything in small logical units per Appendix D convention

**Relevant Context:**
- Guide §9.1, §10, Appendix A, B, C, D
- Guide §0 — `.bob/` machine must be first before feature work

**Status:** [x] done

**§9.8 self-review results (M0):**
1. ✅ lint clean, typecheck clean, 2 tests pass, production build clean
2. ✅ No secrets in any commit — `SolarShield-Build-Guide-for-Bob.md` gitignored; `.env` variants gitignored; grep found no secret patterns in diff
3. ✅ No external input yet (M0 is scaffold only)
4. ✅ No LLM narration in M0
5. ✅ No offline path changes in M0
6. ✅ No invented packages — all confirmed: next, react, typescript, eslint, vitest, @testing-library/* all genuine
7. ✅ No async code, no useEffect, no catch blocks in M0
8. ✅ No dead code, no logs, no TODOs — clean scaffold only
9. ✅ No displayed values in M0 (placeholder UI only)
10. ✅ 7 atomic commits, Appendix D convention; no push/merge to main
11. ✅ Did not re-read edited files; no large payload dumps; targeted installs only

**Context for M1:** TypeScript is pinned at 5.x (TS 7 breaks typescript-eslint). ESLint uses flat config with `@typescript-eslint`. `npm run lint` is `eslint src --ext .ts,.tsx`. The `next lint` command no longer exists in Next.js 16. Next.js version is 16.3.3. React 19. Vitest 4.

---

### M1 — Live Data, Honestly

**Intent:** Build the server-side data fetchers that pull from NOAA SWPC and NASA DONKI, normalize everything to UTC-stamped, source-tagged snapshots, and cache them to the device. Every field must be guarded for absence. The parser must be built from an *observed* real API call, not assumptions.

**Expected Outcomes:**
- `src/lib/data/noaa.ts` — fetches planetary K-index, solar wind, and alerts/watches/warnings from NOAA SWPC; normalizes to typed snapshot; tags each field with `source` string and `fetchedAtUtc` ISO timestamp
- `src/lib/data/donki.ts` — fetches CME, GST, FLR, and notifications from NASA DONKI; same normalization pattern
- `src/lib/data/snapshot.ts` — merged `SpaceWeatherSnapshot` type combining both sources; serializable to IndexedDB
- Next.js API route `src/app/api/snapshot/route.ts` — calls both fetchers, merges, returns JSON; uses allowlist guard (no user-supplied URLs), timeouts, 429/5xx backoff, and falls back to last-known cached snapshot on error
- Unit tests in `src/lib/data/*.test.ts` for: missing fields → absent (not invented); erroring feed → partial snapshot with flag; UTC normalization correct
- `npm run test`, lint, typecheck all pass

**Todo List:**
1. Make one live call each to NOAA SWPC planetary K-index and the alerts feed; save a sample to `bob_sessions/api-samples/noaa-sample.json` (not into context); inspect 1–2 records to understand the real shape
2. Make one live call to NASA DONKI CME endpoint (using DEMO_KEY); save to `bob_sessions/api-samples/donki-cme-sample.json`; inspect 1–2 records
3. Define TypeScript types in `src/lib/data/types.ts` based on observed shapes; mark every optional field as `| null | undefined`
4. Write `src/lib/data/noaa.ts` — fetch with timeout (5 s), allowlist guard, parse observed fields, tag `source: "NOAA-SWPC"` and `fetchedAtUtc: new Date().toISOString()` on every value, return `null` for absent fields (never invent)
5. Write `src/lib/data/donki.ts` — same pattern, `source: "NASA-DONKI"`, handle DEMO_KEY rate limit (fallback to cached)
6. Write `src/lib/data/snapshot.ts` — merge function producing `SpaceWeatherSnapshot`; every top-level field is nullable so partial data is valid
7. Write `src/app/api/snapshot/route.ts` — calls fetchers, merges, caches result server-side (in-memory, 5-min TTL), returns JSON; on any fetch error returns last-cached + `degraded: true` flag
8. Write tests in `src/lib/data/noaa.test.ts` and `donki.test.ts`: missing field → null (not a string); network error → throws typed error; UTC timestamp present and valid ISO
9. Write test in `src/app/api/snapshot/route.test.ts`: both feeds down → returns cached data with `degraded: true`
10. Run full suite + lint + typecheck; fix until green; commit

**Relevant Context:**
- Guide §6 — exact endpoints, allowlist, UTC rule, unit labeling
- Guide §9.2 — SSRF allowlist, timeouts, 429 backoff
- Guide §9.4 — verify real API shapes before coding; abstain on missing data
- API samples go to `bob_sessions/api-samples/` not into context (§9.7)

**Status:** [ ] pending

---

### M2 — Deterministic Core (Client-Side)

**Intent:** Build the TypeScript engine that runs entirely client-side (and offline) — CME arrival-time estimation, severity classification against NOAA thresholds, and impact lookup from the parsed advisory corpus. This is the non-negotiable grounding layer: every number the UI shows comes from here, never from an LLM.

**Expected Outcomes:**
- `src/lib/core/arrival.ts` — `estimateArrival(distanceKm, speedKmS): { arrivalUtc: string; uncertaintyHours: number } | null`; returns `null` when speed ≤ 0 or missing; never throws; units explicit in code
- `src/lib/core/severity.ts` — `classifySeverity(kp: number | null, fluxWm2: number | null): GeomagneticScale | SolarRadiationScale | null`; thresholds from NOAA G/S/R scale verbatim
- `src/lib/core/impact.ts` — `lookupImpact(scale: string): ImpactSummary` returning effect text and action checklist from the parsed corpus; citations included
- `src/lib/corpus/` — Docling-parsed NOAA Space Weather Scales text chunked into JSON; each chunk has `section`, `text`, `citationUrl`
- All core modules have zero server imports — they must tree-shake into the service worker bundle
- `src/lib/core/*.test.ts` — tests for: known Kp values → correct G-scale; arrival math with known distance+speed → correct time; zero speed → null (no crash); missing kp → null
- Test that explicitly asserts "no number in narration output" pattern exists (M3 will wire it)
- Full suite + lint + typecheck green

**Todo List:**
1. Download the NOAA Space Weather Scales page/PDF; run through Docling (or use the CLI) to produce chunked JSON; save output to `src/lib/corpus/noaa-scales.json`; verify chunk quality (section headers, effect text, citation URLs)
2. Write `src/lib/corpus/index.ts` — typed accessor returning chunks by scale+level
3. Write `src/lib/core/types.ts` — `GeomagneticScale` ('G0'–'G5'), `SolarRadiationScale` ('S0'–'S5'), `RadioBlackoutScale` ('R0'–'R5'), `ImpactSummary`, `ArrivalEstimate` types
4. Write `src/lib/core/arrival.ts` — formula: `arrivalMs = (distanceKm / speedKmS) * 1000`; uncertainty: ±6 h default (from NOAA guidance); guard zero/null speed with `return null`; all intermediate values labeled with units in comments
5. Write `src/lib/core/severity.ts` — NOAA thresholds hardcoded from the scales document verbatim (this is the authoritative mapping; do not derive from LLM memory); returns null if input null
6. Write `src/lib/core/impact.ts` — calls corpus accessor; returns text verbatim with citation; returns a "no data" impact object if scale not found
7. Write `src/lib/core/index.ts` — re-exports public API; add a runtime guard that throws if called server-side in an unexpected context
8. Write tests: `arrival.test.ts` (known values + zero-speed null), `severity.test.ts` (Kp 5 → G1, Kp 9 → G4, etc.), `impact.test.ts` (G3 → known effect text present + citation)
9. Add an architectural test `no-unsourced-number.test.ts` that imports the narration module (stub at this stage) and asserts the pattern contract — this test must fail until M3 correctly wires the contract
10. Confirm all modules have no server-side imports (check for `next/headers`, `fs`, `process.env` usage — none allowed)
11. Run full suite + lint + typecheck; commit

**Relevant Context:**
- Guide §4.1 — deterministic core lives client-side in TypeScript, runs offline
- Guide §4.2 — arrival formula: distance ÷ measured speed + uncertainty band; abstain on bad/zero speed
- Guide §9.4 — UTC everywhere; check division by zero; abstain, never guess
- Guide §5 — Docling parses the NOAA corpus; corpus is what "Ask" cites

**Status:** [x] done

**§9.8 self-review results (M1):**
1. ✅ lint clean, typecheck clean, 26 tests pass (14 NOAA, 6 DONKI, 4 snapshot, 2 baseline), production build clean — `/api/snapshot` shows as ƒ (dynamic server route)
2. ✅ No secrets in diff — `NASA_API_KEY` read from `process.env` server-side only; DEMO_KEY only as code-path fallback (never committed as a real value); grep found nothing
3. ✅ Every external input validated — all API fields guarded with type checks; missing fields → null; FetchError thrown on HTTP error or network failure
4. ✅ No LLM narration in M1
5. ✅ No offline path changes in M1 (offline layer is M4)
6. ✅ No invented packages — only `next/server` (NextResponse) used; all types are stdlib
7. ✅ No silent catch, no floating promises — all error paths throw typed FetchError; snapshot.ts uses Promise.allSettled
8. ✅ No dead code, no console.log, no TODOs
9. ✅ Every value in types.ts carries `source` and `fetchedAtUtc` fields
10. ✅ 2 atomic commits; no push to main
11. ✅ No large payloads in context — only 2-record samples inspected; full files saved to disk

**Real API shapes confirmed (M1):**
- Kp: `[{time_tag: string, Kp: number, a_running: number, station_count: number}]` (array oldest→newest)
- RTSW: `[{time_tag, active, source, proton_speed, proton_density, proton_temperature, ...nullables, overall_quality}]` (newest first)
- Alerts: `[{product_id, issue_datetime, message}]`
- DONKI CME: `[{activityID, startTime, sourceLocation, activeRegionNum, cmeAnalyses: [{time21_5, speed, halfAngle, isMostAccurate}], linkedEvents: [{activityID}], link}]`
- NOAA solar-wind mag endpoint (`mag-1-day.json`) is 404 — use `rtsw_wind_1m.json` instead
- DONKI API was returning 503/timeout errors during development (DEMO_KEY rate limiting) — treated as degraded source, not crash

**Context for M2:** Types are in `src/lib/data/types.ts`. `SpaceWeatherSnapshot` is the assembled type. `CmeRecord.primaryAnalysis.speedKmS` is the speed value for arrival-time calculation. `KpRecord.kp` is the input for severity classification.

---

### M3 — Narration + Guardian + MCP

**Intent:** Wire the IBM stack for online narration: typed MCP tools expose the deterministic core to Granite, which only *phrases* values it receives (never computes them); Granite Guardian gates every output before it reaches the UI; the "Ask" feature abstains correctly when evidence is insufficient. All offline narration (Granite Nano) is wired structurally here but fully tested in M4.

**Expected Outcomes:**
- `src/lib/mcp/tools.ts` — six typed MCP tools (`get_current_conditions`, `get_forecast`, `estimate_arrival`, `classify_severity`, `lookup_impact`, `cite_advisory`); each calls into the deterministic core or corpus, never the LLM
- `src/lib/narration/cloud.ts` — watsonx.ai Granite call; prompt template enforces "explain these values, do not compute"; receives structured values from MCP tools; output is prose only
- `src/lib/narration/guardian.ts` — Granite Guardian gate; checks narration doesn't contradict source data; returns `{ passed: boolean; text: string | null }` — on fail, caller falls back to deterministic template
- `src/lib/narration/template.ts` — deterministic string templates for every scale+scenario; used as fallback; zero LLM dependency
- `src/lib/narration/index.ts` — orchestrator: MCP tools → cloud narration → Guardian → template fallback
- `src/app/api/ask/route.ts` — POST endpoint accepting a natural-language question; uses the orchestrator; abstains ("I don't have data to answer that") when evidence insufficient
- The `no-unsourced-number.test.ts` from M2 now passes: narration output tested against a regex that fails if a bare numeric value appears without a `[source]` attribution
- Guardian gate demonstrably blocks a crafted bad output in a test
- Full suite + lint + typecheck green

**Todo List:**
1. Verify the exact Granite model ID available on watsonx.ai (do a real API call using env vars); confirm Granite Guardian model ID; note both in `bob_sessions/ibm-model-ids.md`
2. Write `src/lib/mcp/tools.ts` — each tool is a typed function wrapping the M2 core; tool signatures match the `.bob/mcp.json` registration
3. Update `.bob/mcp.json` to point at the real local MCP server entry point
4. Write `src/lib/narration/cloud.ts` — construct a prompt that passes structured values and instructs the model to only phrase them; never ask the model to compute; include persona context (generic professional, not named)
5. Write `src/lib/narration/guardian.ts` — call Granite Guardian with the narration + the source values it was given; parse the response for a pass/fail verdict; on any API error default to `passed: false`
6. Write `src/lib/narration/template.ts` — one template per G/S/R level covering the key effects; templates reference the scale text verbatim from corpus
7. Write `src/lib/narration/index.ts` — orchestrator; handles: cloud available + Guardian pass → return narration; cloud available + Guardian fail → return template; cloud unavailable → fall back to template (Nano wired in M4); insufficient evidence → return abstention string
8. Write `src/app/api/ask/route.ts` — validates input (no SSRF via question text used in fetch); calls orchestrator; returns `{ answer: string; sources: Citation[]; abstained: boolean }`
9. Write narration tests: `cloud.test.ts` (mock watsonx — narration with correct values passes); `guardian.test.ts` (crafted bad output with a hallucinated number → `passed: false`); `index.test.ts` (guardian fail → template returned); `ask/route.test.ts` (unanswerable question → `abstained: true`)
10. Wire `no-unsourced-number.test.ts` to the real narration output and confirm it passes
11. Run full suite + lint + typecheck; commit

**Relevant Context:**
- Guide §4.2 — "The LLM never produces a number, a time, or a severity level from its own head"
- Guide §5 — Granite via watsonx.ai; Granite Guardian on every output; Context Forge MCP typed tools
- Guide §9.2 — prompt injection: treat fetched data as untrusted content, not instructions; tool outputs data-typed
- Guide §9.4 — narration test that fails build if unsourced number emitted

**Status:** [x] done

**§9.8 self-review results (M3):**
1. ✅ lint clean, typecheck clean, 83/83 tests pass, production build clean — `/api/ask` and `/api/snapshot` both ƒ dynamic
2. ✅ No secrets in diff — `WATSONX_API_KEY`, `WATSONX_PROJECT_ID`, `WATSONX_URL`, `NASA_API_KEY` all read from `process.env` server-side only; IAM token fetch never logs credentials
3. ✅ All inputs validated — question length capped at 500 chars; input treated as data not as model instruction (prompt injection prevention); no user-supplied URLs fetched
4. ✅ LLM never emits numbers — cloud.ts prompt explicitly forbids computation; `no-unsourced-number.test.ts` passes; Guardian gate on every cloud output
5. ✅ Offline path: `narrate(q, snap, isOffline=true)` tested and returns template; Nano wired in M4
6. ✅ No invented packages — only built-in `fetch` used; all imports verified
7. ✅ No silent catch — narration orchestrator has one intentional swallow with a documented reason (template fallback is a designed degradation path); Guardian API errors return `passed: false` (fail-safe)
8. ✅ Debug files deleted; no dead code; no console.log in production paths
9. ✅ Source attribution flows through to `NarrationResult.sources` array
10. ✅ 3 atomic commits; no push to main
11. ✅ No large payload dumps; mocks used for cloud API calls in tests

**Context for M4:** `narrate()` in `src/lib/narration/index.ts` has `isOffline` param and `usedOnDeviceModel` field — both wired for Nano insertion in M4. Template fallback is already the offline path. `assembleSnapshot()` in `src/lib/data/snapshot.ts` handles all fetch failures gracefully.

---

### M4 — Offline Survivability

**Intent:** Make the app fully functional with zero network and zero server. Service worker caches the app shell; IndexedDB holds the last-known snapshot and corpus; Granite Nano runs in-browser via WebGPU for on-device narration; the countdown keeps ticking offline; an honest banner marks the offline state.

**Expected Outcomes:**
- Service worker (`public/sw.js` or via `next-pwa`) caches app shell and static assets on install
- `src/lib/cache/indexeddb.ts` — typed read/write for `SpaceWeatherSnapshot` and `CorpusChunk[]` with last-updated timestamp
- `src/lib/narration/nano.ts` — loads verified Granite Nano model via transformers.js (WebGPU); same prompt contract as cloud narration (phrases values, never computes); gracefully degrades to template if WebGPU unavailable
- `src/hooks/useOfflineStatus.ts` — detects online/offline; triggers snapshot save on fresh fetch; returns `{ isOffline: boolean; lastKnownUtc: string | null }`
- Offline banner component — "Offline — showing last known data (as of `<UTC>`). Countdown still running." (direction, not apology)
- The `M4_API_DELETION_TEST.md` file documents how to manually verify and there is an automated test: with all API modules mocked as unavailable, the app renders last-known state and countdown ticks
- Full suite + lint + typecheck green; PWA installability verified via `npx lighthouse` (PWA score)

**Todo List:**
1. Verify the exact Granite Nano model ID available via transformers.js / Hugging Face (check IBM's current model list; do not assume); note in `bob_sessions/ibm-model-ids.md` alongside cloud IDs
2. Configure `next-pwa` properly for Next.js App Router (it requires specific config); verify service worker registers and caches shell assets in a production build
3. Write `src/lib/cache/indexeddb.ts` — `saveSnapshot(snapshot)`, `loadSnapshot(): SpaceWeatherSnapshot | null`, `saveCorpus(chunks)`, `loadCorpus(): CorpusChunk[]`; use `idb` package (verify it exists and is genuine) or raw IndexedDB API
4. Wire the `/api/snapshot` route to also trigger a client-side `saveSnapshot` call after each successful fetch
5. Write `src/lib/narration/nano.ts` — dynamic import of transformers.js; load Granite Nano model; expose the same `narrate(values, question): string` interface as `cloud.ts`; fall back to `template.ts` if WebGPU unavailable or model fails to load
6. Write `src/hooks/useOfflineStatus.ts` — listen to `online`/`offline` events; on going offline, check IndexedDB for last snapshot and its timestamp
7. Build the `OfflineBanner` component in `src/components/OfflineBanner.tsx`; wire it to `useOfflineStatus`
8. Update `src/lib/narration/index.ts` orchestrator to use `nano.ts` when cloud is unavailable (offline path)
9. Write the API-deletion test: mock all API calls as `throw new Error("network unavailable")`; assert the app renders last-known data (loaded from seeded IndexedDB mock); assert countdown component still ticks; assert offline banner is shown
10. Write `M4_API_DELETION_TEST.md` in `bob_sessions/` documenting the manual test steps for a judge
11. Run `npx lighthouse` against the production build; check PWA installability badge; paste score
12. Run full suite + lint + typecheck; commit

**Relevant Context:**
- Guide §4.1 — service worker cache for app shell; IndexedDB for snapshot + corpus
- Guide §4.2 — offline narration falls back to Granite Nano on-device
- Guide §9.5 — "API-deletion test" is a headline feature; must be a test + manual demo path
- Guide §12 — graceful degradation ladder; never a blank screen or crash

**Status:** [ ] pending

---

### M5 — UI & The Arc

**Intent:** Build the full UI across Now / Inbound / Impact & Actions / Ask / Historical Replay tabs, with the inbound-storm countdown + severity dial as the signature hero element. Design must feel like a cockpit instrument, not a template. All five emotional beats must be reachable: calm → inbound tension → grounded action → network drops + app survives → trust.

**Expected Outcomes:**
- Design tokens in `src/styles/tokens.css` (or `tailwind.config.ts`): 4–6 named palette values (calm baseline + single alarm accent), display face + data/mono type pairing; the alarm accent appears only in active-threat states
- `src/components/Now.tsx` — current Kp, solar wind speed, active alerts; every value shows source badge and UTC timestamp; "no current data" shown (never invented value) when field is null
- `src/components/Inbound.tsx` — countdown timer to estimated CME arrival (ticking, client-side, from deterministic core); uncertainty window displayed; G-scale badge; "no active inbound event" state
- `src/components/CountdownDial.tsx` — the signature hero element; countdown + severity dial treated with visual care; the thing the app is remembered by
- `src/components/ImpactActions.tsx` — effect list (HF radio, GPS, satellite, power) with plain-language action checklist; effects text verbatim from NOAA corpus with citation link
- `src/components/Ask.tsx` — natural-language question box; shows answer with inline citations; shows abstention state honestly; shows "offline mode" marker when using Nano narration
- `src/components/HistoricalReplay.tsx` — replays May 2024 "Gannon" G5 storm data; prominent "Historical Replay — not live data" banner; data hardcoded from real event (verify values)
- Responsive layout (mobile-first); keyboard focus visible; `prefers-reduced-motion` respected; WCAG AA contrast minimum
- Screenshot self-critique completed: "is this just the default AI look?" test passed

**Todo List:**
1. Design sprint (plan before code): define the 4–6 palette hex values (space-weather instrumentation reference, not generic dashboard), pick display + data/mono typefaces, sketch the countdown dial concept — write decisions into `bob_sessions/design-brief.md`
2. Implement design tokens in Tailwind config or CSS custom properties; confirm the alarm accent is only mapped to threat-state classes
3. Build `CountdownDial.tsx` first — the signature element; invest bold choices here; use CSS or SVG for the dial; ensure it ticks client-side using `useEffect` + `setInterval` with correct cleanup; respects `prefers-reduced-motion`
4. Build `Now.tsx` — wire to `SpaceWeatherSnapshot`; source badge + UTC timestamp on every value; explicit null states
5. Build `Inbound.tsx` — wire countdown from deterministic core arrival estimate; explicit "no active inbound event" state; uncertainty window
6. Build `ImpactActions.tsx` — pull effects from `lookupImpact()`; render action checklist; include citation link
7. Build `Ask.tsx` — textarea + submit; calls `/api/ask`; displays answer with `sources`; abstention state; offline indicator
8. Build `HistoricalReplay.tsx` — verify May 2024 Gannon storm values from NOAA event records; hardcode as `gannon-2024-replay.json` in `src/lib/corpus/`; prominent replay banner; the "play through the storm" sequence
9. Build main layout and tab navigation (`src/app/page.tsx` or `layout.tsx`); wire all components; include `OfflineBanner`
10. Run a visual self-critique: take a screenshot (or use browser DevTools); answer the question "does this feel like a cockpit instrument or like the default AI dashboard?" — if default, revise
11. Run accessibility checks: keyboard-tab through all interactive elements; check color contrast (browser DevTools or axe); verify `prefers-reduced-motion` CSS query is present
12. Run full suite + lint + typecheck; commit

**Relevant Context:**
- Guide §7 — full design direction: palette, typography, countdown dial as hero, copy voice, quality floor
- Guide §3.1 — the seven MVP features
- Guide §2 — emotional arc: calm → tension → action → network drops → trust
- Guide §9.4 — every displayed value carries source + UTC timestamp

**Status:** [ ] pending

---

### M6 — `/judges` Honesty Panel

**Intent:** Build a dedicated `/judges` route that demonstrates SolarShield's trustworthiness in full: live sources, deterministic proof, grounding passages, abstention demo, offline test, and known limits. This is where relief becomes trust and is a hallmark of past winners.

**Expected Outcomes:**
- `src/app/judges/page.tsx` — the honesty panel with six sections matching guide §8:
  1. Live source list (every feed, last-fetched UTC, status)
  2. Deterministic proof (arrival inputs + arithmetic, hand-verifiable)
  3. Grounding evidence (sample question → exact cited advisory passages)
  4. Abstention demo (button that asks an unanswerable question, shows correct refusal)
  5. Offline test (one-click simulate offline, watch app keep working)
  6. Known limits (plain statement of what SolarShield does not do)
- All six sections are functional (not placeholder text)
- Full suite + lint + typecheck green

**Todo List:**
1. Scaffold `src/app/judges/page.tsx` with the six section structure
2. Section 1 — Source List: call `/api/snapshot` endpoint and display each source name, `fetchedAtUtc`, and `degraded` flag with a colored status badge
3. Section 2 — Deterministic Proof: pull the most recent CME event; display `distanceKm`, `speedKmS`, the formula, and the calculated `arrivalUtc` with uncertainty; format so a judge can verify with a calculator
4. Section 3 — Grounding Evidence: run a sample question ("What are the effects of a G3 storm?") through the `/api/ask` endpoint and display the `sources` array showing exact corpus chunk text with section + citation URL
5. Section 4 — Abstention Demo: a "Test Abstention" button that submits a deliberately unanswerable question ("What is the exact position of CME-2024-001 right now?"); shows `abstained: true` response and the returned message
6. Section 5 — Offline Test: a "Simulate Offline" button that triggers `useOfflineStatus` manually (or uses browser DevTools Network tab instructions); documents what to observe; shows the offline banner and countdown still ticking
7. Section 6 — Known Limits: static copy stating: decision support not official forecast; no proprietary model; extreme-event timing uncertain; data 5-min cached; narration may be slower on-device
8. Write tests for the page: each section renders without error; source list shows at least one entry; abstention demo returns `abstained: true`
9. Run full suite + lint + typecheck; commit

**Relevant Context:**
- Guide §8 — exact six-section specification
- Guide §3.1, item 7 — `/judges` is a required MVP feature
- Guide §2 — the emotional arc ends with *trust*; this panel is that destination

**Status:** [ ] pending

---

### M7 — Ship It

**Intent:** Deploy the web app to Vercel, produce Android + iOS native builds via Expo EAS Build (no local Xcode or Android Studio required), produce the submission artifacts (README, JUDGE.md, demo video script), and verify the end-to-end experience from a clean device with no keys required.

**Deployment choices (confirmed by user):**
- **Web:** Vercel (connect GitHub repo, set env vars in dashboard)
- **Android + iOS native apps:** Expo EAS Build cloud builders (produces APK/AAB for Android and IPA for iOS without local native toolchains)

**Expected Outcomes:**
- Live web deployment on Vercel; public URL works from a clean device with no keys
- PWA installability confirmed via browser "Add to home screen"
- `eas.json` committed with `development`, `preview`, and `production` build profiles
- Expo EAS Build triggered; Android APK/AAB and iOS IPA produced via EAS cloud
- Both artifacts attached to a tagged GitHub release
- `README.md` complete: pain + protagonist, innovation claim + prior-art note, per-component IBM-stack rationale (one line each), setup, degradation ladder, honest limitations
- `JUDGE.md`: 90-second guided path from landing to the offline "wow" to the `/judges` panel
- "LOAD DEMO" path: bundled Gannon replay + seeded offline snapshot so a zero-key judge sees the full experience immediately
- Final submission checklist (§13 of guide) fully checked
- All `.bob/` artifacts + `bob_sessions/` committed as proof

**Todo List:**
1. Verify "LOAD DEMO" path works: a judge with no environment variables set must see the Gannon replay automatically and experience the full arc; implement a `DEMO_MODE` fallback (no `NEXT_PUBLIC_` secret leak — use a build-time `DEMO_MODE=true` env flag or bundled seed data)
2. Deploy to Vercel: connect GitHub repo, set environment variables in the Vercel dashboard (NASA_API_KEY, WATSONX_API_KEY, WATSONX_PROJECT_ID, WATSONX_URL), trigger deploy, verify live URL loads correctly
3. Verify PWA: visit the live URL in Chrome on mobile; confirm "Add to home screen" prompt; install and confirm it opens standalone
4. Run Lighthouse on the live URL: PWA score ≥ 90; Performance, Accessibility reported; paste results into `bob_sessions/lighthouse-report.md`
5. Set up Expo EAS Build: install `expo` and `eas-cli` (`npm install expo eas-cli`); run `eas init` to link the project; create `eas.json` with three profiles (`development` → internal APK, `preview` → APK + IPA simulator, `production` → AAB + IPA store); commit `eas.json`
6. Configure `app.json` / `app.config.ts` with bundle identifiers (`com.solarsheild.app`), version, icons, and splash screen; confirm both Android (`package`) and iOS (`bundleIdentifier`) fields are set
7. Run `eas build --platform android --profile preview` (produces APK without Play Store signing) and `eas build --platform ios --profile preview` (produces IPA); EAS cloud handles toolchains — no local Xcode/Android Studio needed
8. Download the EAS build artifacts; attach Android APK to a GitHub release tag (`v1.0.0-ibm-challenge`); link the iOS IPA EAS build URL in the release notes
9. Write `README.md` covering: pain + protagonist story; innovation claim citing NOAA SWPC and commercial providers as cloud-only; IBM stack table (Granite, Granite Nano, Granite Guardian, Docling, Context Forge) each with one-line "why here"; setup instructions; degradation ladder; honest limitations; links to live demo + APK + EAS iOS build
10. Write `JUDGE.md`: step-by-step 90-second path hitting: Now panel (calm) → toggle Gannon replay (tension) → Impact+Actions (grounded action) → simulate offline (app survives, trust) → link to `/judges` panel
11. Run the full submission checklist from guide §13; mark each item
12. Run full suite + lint + typecheck + production build one final time; paste all results
13. Run guide §9.8 self-review across the whole repo; document results in `bob_sessions/final-self-review.md`
14. Confirm no secrets committed: `git log --all -- '*.env*'`; grep diff for Appendix C patterns; confirm `.env` and build guide MD are gitignored
15. Leave the final push/merge to main and the challenge submission to the user — do not push

**Relevant Context:**
- Guide §11 (M7 DoD) — live link from clean device; APK installs; JUDGE.md guides stranger to "wow" in under 2 min
- Guide §12 — PWA + installable app + graceful degradation required
- Guide §13 — full submission checklist
- Guide §9.6 — no push/merge to main without user's explicit go-ahead

**Status:** [ ] pending

---

## Standing Rules (apply on every sub-task)

These are always in force per guide §9 and §9.8. Before ending any turn:

- Run tests, lint, typecheck, build — real output only
- Grep diff for Appendix C patterns (API_KEY, SECRET, sk-, NEXT_PUBLIC_ leaks)
- Every displayed value has source + UTC timestamp
- LLM never emits a number, time, or severity
- Offline path works for everything just changed
- No invented packages — verify each on the registry
- No silent `catch {}`, no floating promises, no bad `useEffect` deps
- No dead code, stray logs, TODOs, orphaned files
- Small atomic commits per Appendix D convention
- Never re-read a file just edited to "verify" it
- Never dump large API payloads into context — save to `bob_sessions/api-samples/`, inspect 1–2 records

---

## Notes for Agent Mode

- Read this plan file at the start of each sub-task to get full context
- Update the sub-task's **Status** to `[x] done` after completion and paste the §9.8 self-review results as a comment below it
- Add any context discovered during implementation that the next sub-task needs into that sub-task's **Relevant Context** section before handing off
- Work one milestone at a time — do not load the whole codebase speculatively
