# SolarShield — Build Audit & Handover

**Date:** 2026-08-28
**Auditor:** Claude (taking over from Bob, who ran out of budget mid-M5)
**Measured against:** `SolarShield-Build-Guide-for-Bob.md` (the contract Bob was given)

---

## Bottom line

Bob did a **proper, honest job on the hard part**. About **60% of the build is done**, and it's the 60% that is easy to fake and hard to fake well — the physics, the data plumbing, the safety gates, and the offline survival. None of it is faked. The real numbers are computed by real code, the AI is wired to real IBM services, and the two "prove it's honest" tests actually pass.

What's missing is the **visible half**: the screen that makes a judge *feel* the pain→relief. The pieces for it are built but not plugged in. The app still boots to a "coming soon" placeholder.

**In one line:** the engine is real and running; the dashboard isn't bolted on yet.

---

## Verified on your machine just now (not guesses)

| Check | Result |
|---|---|
| Test suite (11 files) | **88 / 88 pass** |
| Typecheck | **Pass** |
| Lint | **Pass** |
| Production build | **Pass** |

These were run on your Windows machine (the sandbox has the wrong-platform install, so its failures were noise). This is the real ground truth.

---

## Milestone scorecard

Bob logged full details for every milestone (intent, expected outcomes, to-do lists, self-reviews) in `solashield-implementation-plan.md` — yes, I can see them all. **One caveat: the checkboxes in that file lie.** M1 and M4 are marked "pending" but are actually finished and committed. Trust git + the tests, not the checkboxes.

| # | Milestone | Status | Quality |
|---|---|---|---|
| M0 | Foundation (repo, gitignore, PWA shell) | ✅ Done | Excellent — gitignore was literally the first commit |
| M1 | Live data (NOAA + NASA, offline-safe) | ✅ Done | Excellent — allowlist, no secrets leaked, UTC everywhere, every value source-tagged |
| M2 | Deterministic core (arrival, severity, impact) | ✅ Done | Excellent — real physics, the "no invented numbers" test passes |
| M3 | Narration + Guardian + tools | ✅ Done (code) | Strong — real watsonx + Guardian code, fail-closed. Needs live keys to talk online; MCP server not bootable yet |
| M4 | Offline survivability | ✅ Done | Strong — the "delete all APIs" test passes. But on-device Granite Nano never actually runs (see Problem 2) |
| M5 | The dashboard & the felt arc | 🟡 ~60% | Components built and good, but **not wired in and not committed** |
| M6 | `/judges` demo panel | ❌ Not started | — |
| M7 | Ship it (installable app) | ❌ Not started | Plan also has the wrong tool picked (see Problem 6) |

**Score: 5 of 8 milestones fully done, 1 in progress, 2 untouched.**

---

## What Bob did genuinely well (worth crediting)

- **It's honest.** The AI is physically prevented from inventing numbers — there's a build-failing test that enforces it, and it's real.
- **It survives its own blackout.** A test deletes every API and AI service and proves the app still shows last-known data and safe guidance. That's the whole win thesis, and it's proven.
- **Secrets hygiene is textbook.** No keys in the repo, nothing leaked to the browser, gitignore committed before anything else.
- **Clean history.** 18 tidy commits, one logical change each.
- **It left proof of its own work** (the `.bob/` quality rules + saved session logs) — the same pattern the challenge winners use.

---

## Problems found (worst first)

**1. The dashboard isn't plugged in — and isn't saved.** *(biggest)*
All the M5 screen pieces exist (a real ticking countdown dial, the "now" panel, the ask box, impact actions), ~1,300 lines — but the app's main page still says "coming soon," and none of these files are committed to git yet. If the folder resets, this work is **gone**.
→ *Fix: commit these files first, then wire them into the main page with tab navigation.*

**2. The on-device AI never actually runs.** The offline brain (Granite Nano) is coded, but the library it needs was never installed, so it silently gives up and uses the plain-text fallback every time. Offline still *works* — but via templates, not the on-device model the guide promised.
→ *Fix: install the missing library, or (my lean) accept template-only offline and stop claiming on-device AI.*

**3. The "tools" server can't start.** The typed-tools server is registered but points at a file that was never built. The tool *functions* work fine inside the app; only the standalone server is missing.
→ *Fix: add the small bootstrap file, or drop the standalone-server claim.*

**4. "Docling" is claimed but never used.** The guide said parse the knowledge corpus with IBM Docling; Bob hand-built the corpus instead. It works, but if a judge asks "where's Docling?", the honest answer is "not used."
→ *Fix: either run the corpus through Docling for real, or quietly drop it from the pitch.*

**5. IBM model names are doc-verified, not live-verified.** Bob confirmed the model IDs from documentation but noted himself they should be checked with one real API call. Until you do, online narration might fail on a wrong name.
→ *Fix: one real watsonx call with your keys to confirm the IDs resolve.*

**6. The "ship it" plan picked the wrong tool.** The plan switched M7 to Expo — which packages a different kind of app than what's built here. It would waste a day. The right wrapper for this app is Capacitor (or just ship the installable web app / PWA, which already half-works).
→ *Fix: change the M7 plan before starting it.*

**7. Cosmetic: the name is misspelled in two places** ("solashield" / "solarsheild"). Harmless, but a judge will see it.
→ *Fix: rename when convenient.*

---

## What's left to finish (in order)

1. **Save the M5 work** (commit the uncommitted dashboard files) — do this first, it's at risk.
2. **Wire the dashboard into the app** so it actually shows the countdown, the now-panel, and the ask box with tab navigation. *This is what makes it demo-able.*
3. **Build the `/judges` panel** (M6) — the one-click "show me the pain→relief arc" for judges.
4. **Make it installable** (M7) — with the corrected tool.
5. **The four "make-it-real" fixes** (Problems 2–5): confirm model IDs live, decide on Nano, add the tools-server bootstrap, and settle the Docling claim.

Steps 1–3 are what turn this from "a solid engine" into "a demo that wins." Steps 4–5 are polish and honesty.

---

## First thing to handle

The dashboard work is **built but unsaved**. Before anything else, that should be committed so it can't vanish. (Note: Bob's IDE may still be holding a lock on the git folder — that may need it fully closed first.)
