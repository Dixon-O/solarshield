// SolarShield — native (Capacitor) web build.
//
// Produces the static `out/` bundle that Capacitor wraps into the iOS +
// Android apps. A Next.js static export cannot contain server API routes, so
// this script moves `src/app/api` aside for the duration of the build and
// always restores it afterwards (even if the build fails). The wrapped app
// reaches those routes over the network instead, on the hosted deployment
// named by NEXT_PUBLIC_API_BASE.
//
// Usage:
//   NEXT_PUBLIC_API_BASE=https://your-deployment npm run build:native

import { rename } from "node:fs/promises";
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const API_DIR = join(root, "src", "app", "api");
const STASH_DIR = join(root, "src", "app", "_api.native-stash");

async function restore() {
  if (existsSync(STASH_DIR) && !existsSync(API_DIR)) {
    await rename(STASH_DIR, API_DIR);
  }
}

async function main() {
  if (!process.env.NEXT_PUBLIC_API_BASE) {
    console.warn(
      "[build:native] NEXT_PUBLIC_API_BASE is not set — the app will call " +
        "relative URLs that do not exist inside the native shell. Set it to " +
        "your hosted deployment origin before shipping.",
    );
  }

  const hadApi = existsSync(API_DIR);
  if (hadApi) await rename(API_DIR, STASH_DIR);

  try {
    // Single command string (not an args array) so Node does not warn about
    // shell:true — the command is fixed, never built from external input.
    const result = spawnSync("npx next build", {
      cwd: root,
      stdio: "inherit",
      shell: true,
      env: { ...process.env, BUILD_TARGET: "native" },
    });
    if (result.status !== 0) process.exitCode = result.status ?? 1;
  } finally {
    await restore();
  }
}

main().catch(async (err) => {
  await restore();
  console.error(err);
  process.exit(1);
});
