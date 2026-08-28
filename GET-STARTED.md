# Get started with SolarShield

SolarShield is a space-weather early-warning copilot that keeps working when the
network goes down. This page gets it running on your machine and shows you how to
check that everything works. For the full story, see [README.md](./README.md).

**Good news up front:** it runs with **no API keys** and even **offline**. The
optional keys below only add live CME data and the IBM AI phrasing on top.

---

## 1. What you need

- **Node.js 20 or newer** (built and tested on Node 24). Check your version:

  ```bash
  node -v
  ```

That's the only requirement. No database, no accounts, no keys to just run it.

---

## 2. Run it (about 60 seconds)

```bash
npm install
npm run dev
```

Then open **http://localhost:3000**. You're now looking at live space weather —
or the last cached reading if you happen to be offline.

To stop the app, press `Ctrl + C` in the terminal.

---

## 3. (Optional) Turn on live CME data + IBM AI

The app is fully usable without this. To light up the extra live sources:

1. Make your own local env file from the example:

   ```bash
   cp .env.example .env.local
   ```

   On Windows PowerShell use `Copy-Item .env.example .env.local`.

2. Open `.env.local` and fill in whatever you have:

   - `NASA_API_KEY` — free from https://api.nasa.gov, powers live CME data.
     `DEMO_KEY` works for light testing.
   - `WATSONX_API_KEY`, `WATSONX_PROJECT_ID`, `WATSONX_URL` — optional. These
     turn on IBM Granite phrasing + the Granite Guardian safety check. Leave them
     blank and the app answers with its built-in grounded engine instead.
   - NOAA needs no key.

3. Restart `npm run dev`.

Your `.env.local` is already git-ignored, so your keys never get committed.

---

## 4. Test it

### Automated checks — these should all pass

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

What "good" looks like: typecheck and lint finish with no errors, the tests report
**93 passed**, and the build ends without an error.

### Click through the app

- **Live** — shows a current Kp value and G-level; if a storm is inbound, a
  countdown ticks down to arrival.
- **Ask** — type *"What are the current conditions?"* and press **Ask**. You
  should get a plain-language answer with a **Sources:** line and a small mode tag
  (either "IBM Granite" or "Grounded engine").
- **Replay** — play back a past storm and watch the system escalate.
- **/judges** — open http://localhost:3000/judges and press **Begin
  demonstration**. Six short acts should play through on their own.

### The offline test (the whole point of the app)

1. Open the app once while online so it can cache the latest data.
2. Turn off Wi-Fi — or open the browser dev tools (`F12`) → **Network** tab → set
   it to **Offline**.
3. Reload the page.

It should still show the last-known data, the countdown should still tick, and
**Ask** should still answer from the cached data. A normal dashboard would go
blank here; SolarShield does not.

---

## Found a problem? Here's what to send

The more of this you include, the faster it gets fixed:

- **Which step** you were on (e.g. "step 2, `npm run dev`", or "the offline test").
- **What you expected** vs. **what actually happened**.
- **Red text in the browser console** — press `F12`, open the **Console** tab, and
  copy anything red.
- **Red text in the terminal** where `npm run dev` is running.

Copy-paste the actual text where you can (a screenshot of the red lines is fine
too). That's usually enough to pinpoint it.
