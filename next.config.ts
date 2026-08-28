import type { NextConfig } from "next";

/*
 * SolarShield has two build targets from one codebase:
 *
 *   web     (default)          → normal Next.js server build. The API routes
 *                                run here and this deployment is the backend.
 *   native  (BUILD_TARGET=native) → static export (`out/`) that Capacitor wraps
 *                                into the iOS + Android apps. The wrapped app
 *                                has no server, so it calls the hosted web
 *                                deployment via NEXT_PUBLIC_API_BASE. The API
 *                                routes are excluded from this build (see
 *                                scripts/build-native.mjs) because a static
 *                                export cannot contain server routes.
 */
const isNative = process.env.BUILD_TARGET === "native";

const nextConfig: NextConfig = {
  // Images from allowlisted domains only (SSRF prevention — never user-supplied URLs)
  images: {
    remotePatterns: [],
    // The static export has no image-optimization server.
    unoptimized: isNative,
  },
  // Emit a fully static site for the native shell.
  ...(isNative ? { output: "export" as const } : {}),
};

export default nextConfig;
