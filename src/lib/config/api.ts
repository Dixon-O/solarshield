/**
 * Base URL for SolarShield's own API.
 *
 * The web/PWA build talks to its own Next.js server, so the base is empty and
 * every call uses a relative path ("/api/..."). The native (Capacitor) build
 * has no server of its own — its API routes cannot run inside the wrapped app,
 * and /api/ask holds IBM watsonx secret keys that must never ship to a device.
 * So the native build points at the hosted web deployment instead by setting
 * NEXT_PUBLIC_API_BASE to that origin (e.g. "https://solarshield.example") at
 * build time.
 *
 * Default "" keeps the web build byte-for-byte unchanged.
 */
export const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

/** Resolve an app API path against the configured base. */
export function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}
