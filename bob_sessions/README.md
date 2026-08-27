# bob_sessions

This directory contains committed working sessions and build artefacts produced during the SolarShield IBM AI Builders Challenge build. It serves two purposes:

1. **Proof of Bob usage** — the challenge requires demonstrating that IBM Bob was used throughout the build. Committed sessions here are that evidence.
2. **Working record** — API shape samples, design decisions, test results, and milestone notes captured during the build live here for traceability.

## Contents (populated as milestones complete)

| Path | Created in | Purpose |
|------|-----------|---------|
| `api-samples/` | M1 | Raw sample records from live NOAA SWPC and NASA DONKI API calls — 1–2 records only, never full payloads |
| `ibm-model-ids.md` | M3 | Verified Granite cloud and Granite Nano model IDs confirmed against IBM's current model list |
| `design-brief.md` | M5 | Design token decisions: palette hex values, typeface choices, countdown dial concept |
| `lighthouse-report.md` | M7 | Lighthouse PWA + performance + accessibility scores for the live Vercel deployment |
| `M4_API_DELETION_TEST.md` | M4 | Manual test steps for the API-deletion test (all hosted APIs removed — app still works) |
| `final-self-review.md` | M7 | §9.8 self-review checklist results across the whole repo before submission |

## Convention

- Files here are committed as each milestone completes.
- API samples are 1–2 representative records only — never full payload dumps.
- Session notes are concise and factual — no restatements of finished work.
