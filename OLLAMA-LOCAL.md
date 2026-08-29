# Run the real IBM Granite locally (for the full-model demo)

SolarShield works with **zero keys** — the hosted app answers with its grounded
deterministic engine and labels itself honestly. This guide is the *optional* extra:
it lights up the **"IBM Granite (local)"** path using the actual IBM Granite 3.3 and
Granite Guardian models running on your own machine, so you can screen-record the
full model experience. It runs card-free, needs no account, and uses Apache-2.0
models.

Nothing here changes the hosted deploy — a public Vercel site can't reach a model on
your laptop, so it simply stays on the grounded engine.

---

## Before you start

- You don't need this to demo the app. The keyless path is the real product.
- Budget **~11.6 GB** of free disk for the two models, and a machine that can run an
  8B model comfortably (16 GB RAM is a good baseline).

---

## Step 1 — Install Ollama

Download from **https://ollama.com/download** and run the installer. Ollama starts a
local server at `http://127.0.0.1:11434`.

Check it's there:

```
ollama --version
```

---

## Step 2 — Pull the two IBM models (you run these — large download)

> These total **~11.6 GB**. Run them yourself when you're on good bandwidth — they
> are intentionally not started for you.

```
ollama pull granite3.3:8b
ollama pull ibm/granite3.3-guardian:8b
```

- `granite3.3:8b` — writes the answer (~4.9 GB)
- `ibm/granite3.3-guardian:8b` — the safety gate that must approve the answer before
  it reaches the screen (~6.7 GB)

Confirm both are installed:

```
ollama list
```

---

## Step 3 — Turn on the local provider

Create a file named **`.env.local`** in the project root with exactly this:

```
NARRATION_PROVIDER=ollama
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=granite3.3:8b
OLLAMA_GUARDIAN_MODEL=ibm/granite3.3-guardian:8b
OLLAMA_TIMEOUT_MS=120000
```

`.env.local` is git-ignored, so it never ships in the repo.

---

## Step 4 — Run the app

```
npm run dev
```

Open the URL it prints (usually `http://localhost:3000`). For the production feel
instead, run `npm run build` then `npm run start`.

---

## Step 5 — Confirm the rung is live

1. Go to the **Ask** tab.
2. Ask something like *"Will my HF radio work in the next 6 hours?"*
3. The mode tag under the answer should read **"IBM Granite (local)"** — not
   "Grounded engine".

The first answer can take a little longer while the model warms up; later ones are
quicker. Every number in the answer is still cited to NOAA/NASA — the model phrases
the grounded facts, it doesn't invent them, and Granite Guardian must approve the
wording before you see it.

---

## Record the demo (suggested beats)

1. Ask a question and show the **"IBM Granite (local)"** tag on a real answer.
2. Point at the sources line — every figure is attributed to NOAA/NASA.
3. Optional proof shot: a terminal running `ollama ps`, showing the two Granite
   models are what's actually loaded.
4. The honest contrast: stop Ollama (or rename `.env.local`), reload, ask again → the
   tag flips to **"Grounded engine"** and the answer still comes back with the same
   grounded numbers. That's the "survives the blackout" story — the AI is a bonus
   layer, not a crutch.

---

## Turn it back off (return to keyless)

Delete `.env.local` (or set `NARRATION_PROVIDER=off`) and restart. The app is back to
the grounded engine — exactly what the judges' hosted deploy runs.

---

## Troubleshooting

- **Tag still says "Grounded engine":** Ollama isn't running, the models aren't
  pulled yet, or `.env.local` wasn't picked up — restart the dev server after
  creating it.
- **Connection refused:** keep `127.0.0.1` (not `localhost`) in `OLLAMA_BASE_URL` —
  it sidesteps an IPv6 quirk on Windows. That's already the default above.
- **See what's happening:** `ollama list` shows what's installed; `ollama ps` shows
  what's currently loaded in memory.
