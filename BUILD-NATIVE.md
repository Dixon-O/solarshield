# Getting SolarShield onto phones

SolarShield is one Next.js web app. There are two ways to put it on a phone, and
they stack:

1. **Installable PWA — both platforms, today, zero cost.** iPhone and Android can
   install SolarShield straight from the browser; it opens full-screen and works
   offline. This is the shipping path for iPhone right now. Steps are in
   **[INSTALL.md](./INSTALL.md)** — that's the link to hand to judges and users.
2. **Native binaries via Capacitor.** Capacitor wraps the *same* web app into
   native apps with no rewrite. **Android builds now on Windows.** iOS needs a Mac
   and a paid Apple developer account, so it's an optional later step — until then
   iPhone users install the PWA above.

The rest of this page is the native (Capacitor) path.

---

## How the native shell fits together

- The **hosted web deployment is the backend.** Its `/api/snapshot` and
  `/api/ask` routes run there. `/api/ask` holds the IBM watsonx keys, so it must
  stay on the server and never ship inside the app.
- The **native app is a thin shell** around the built web UI. It has no server,
  so it calls the hosted deployment over the network. You tell it where the
  backend lives with `NEXT_PUBLIC_API_BASE` at build time.
- **Offline still works.** The last-known snapshot is cached (IndexedDB +
  service worker), so the countdown keeps running with no network — the core
  promise of the app holds inside the native shell too.

This is the packaging path chosen over Expo EAS Build. EAS only builds React
Native apps; SolarShield is a web app, so EAS cannot build it as-is. Capacitor
is the tool that fits.

---

## Before you start

- **Node** (already installed for the web app).
- **Android:** [Android Studio](https://developer.android.com/studio) — builds on
  your **Windows** machine. This is the native target you can ship today.
- **iOS (optional, later):** a **Mac with Xcode** *and* the **Apple Developer
  Program ($99/year)** to run on a real iPhone or TestFlight. An iOS binary cannot
  be built on Windows. Until you have both, the iPhone story is the PWA in
  [INSTALL.md](./INSTALL.md) — which needs neither.

---

## One-time setup

Deploy the web app first (Vercel, or any Node host) — that URL is your backend.

Then, in the project folder:

```
npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios
```

`capacitor.config.json` is already in the repo (app id `app.solarshield`, web
dir `out`), so there is nothing to initialise. Build the web bundle once, then
add Android:

```
# Windows PowerShell
$env:NEXT_PUBLIC_API_BASE="https://YOUR-DEPLOYMENT"; npm run build:native
npx cap add android
```

Later, on a Mac, add iOS the same way:

```
npx cap add ios
```

`android/` and `ios/` are generated folders (git-ignored). If they ever get out
of sync, delete them and re-run `npx cap add`.

---

## Every build

```
# 1. Build the static web bundle, pointed at your hosted backend
#    Windows PowerShell:
$env:NEXT_PUBLIC_API_BASE="https://YOUR-DEPLOYMENT"; npm run build:native
#    macOS / Linux:
#    NEXT_PUBLIC_API_BASE=https://YOUR-DEPLOYMENT npm run build:native

# 2. Copy the bundle into the native projects
npx cap sync

# 3. Open the native IDE and run / archive from there
npm run cap:android   # Android Studio  (Windows or Mac)
npm run cap:ios       # Xcode           (Mac only)
```

From Android Studio you can run on a device/emulator or build a signed APK/AAB
for Google Play. From Xcode you archive and upload to the App Store. Store
signing (a Google Play keystore, an Apple developer account) is done in those
IDEs — that part is outside this repo.

---

## What `npm run build:native` does

It runs the normal Next.js build in **static-export** mode (`output: 'export'`,
emitting `out/`), which is what Capacitor packages. Because a static export
cannot contain server routes, the script moves `src/app/api` aside for the
duration of the build and restores it right after — your API routes are
untouched in git and keep serving from the hosted deployment. The web build
(`npm run build`) is unaffected and still includes the API routes.
