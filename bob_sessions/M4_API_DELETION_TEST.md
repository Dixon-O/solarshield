# M4 — API-Deletion Test

## What this proves

SolarShield is built to **survive the event it warns about**. This test documents how to verify that with every hosted API and AI service removed, the app still:

1. Shows the last-known space-weather snapshot (from IndexedDB cache)
2. Displays the offline banner: "Offline — showing last known data (as of HH:MM UTC). Countdown still running."
3. Keeps the countdown ticking
4. Returns guidance from deterministic templates (no LLM required)

---

## Automated test

The automated test lives at [`src/lib/cache/api-deletion.test.ts`](../src/lib/cache/api-deletion.test.ts).

It mocks **all** of the following as unavailable simultaneously:
- NOAA SWPC fetchers (`fetchLatestKp`, `fetchLatestSolarWind`, `fetchActiveAlerts`)
- NASA DONKI fetcher (`fetchRecentCmes`)
- Cloud Granite narration (`callCloudNarration`)
- Granite Guardian (`gateWithGuardian`)
- Granite Nano on-device (`callNanoNarration`)

Then asserts:
- `assembleSnapshot()` returns a valid (not null) snapshot with `degraded: true`
- `loadSnapshot()` returns the last-known seeded data
- `narrate()` returns a non-empty answer from deterministic templates (not a blank/error)
- `narrate()` abstains only when there is truly no data at all

Run with: `npm test -- src/lib/cache/api-deletion.test.ts`

---

## Manual test steps (for judges / demo)

### Step 1 — Load the app
Open the app in a browser. Verify the Now panel shows live data with source badges.

### Step 2 — Seed the cache
The app automatically saves the latest snapshot to IndexedDB on each successful fetch.
Visit the Now panel to ensure at least one fetch has completed (data visible with UTC timestamp).

### Step 3 — Simulate offline
**Option A (Chrome DevTools):**
1. Open DevTools → Network tab
2. Set "Throttling" to "Offline"
3. Reload the page (or navigate to the root)

**Option B (OS level):**
Disable your network adapter or turn on Airplane Mode.

### Step 4 — Observe the offline state
You should see:
- ⊘ **Offline banner** at the top of the page:  
  _"Offline — showing last known data (as of HH:MM UTC). Countdown still running."_
- The **Now panel** still shows data (Kp, solar wind, alerts) from the last-known snapshot
- The **countdown** (if a CME was inbound) keeps ticking — it uses the cached arrival estimate
- The **Ask feature** returns answers from deterministic templates (no cloud model)

### Step 5 — Verify no crash, no blank screen
Scroll through all panels. Every section should either show cached data or an explicit
"no data available" message. Nothing should be blank, and there should be no error messages
or JavaScript errors in the console.

### Step 6 — Come back online
Re-enable the network. Within 5 minutes (the cache TTL), the app should refresh with live
data and the offline banner should disappear.

---

## Degradation ladder

| State | What the user sees |
|---|---|
| Online + keys configured | Live data + cloud Granite narration + Guardian gate |
| Online + no keys | Live data + deterministic template answers |
| Offline + cached data | Last-known data + Granite Nano narration (if WebGPU) or templates |
| Offline + no cached data | Offline banner + "no data available" + deterministic core only |

The app never shows a blank screen or an unhandled error at any rung of this ladder.
