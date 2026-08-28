/**
 * ServiceWorkerRegister — headless registration test.
 *
 * jsdom has no service-worker implementation, so we install a mock
 * `navigator.serviceWorker` and assert the component registers `/sw.js` on
 * mount and renders nothing. NODE_ENV is pinned to "production" so the
 * development guard does not skip registration. Fails on any console.error.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { ServiceWorkerRegister } from "./ServiceWorkerRegister";

const register = vi.fn(() => Promise.resolve({} as ServiceWorkerRegistration));
const consoleErrors: string[] = [];

beforeEach(() => {
  vi.stubEnv("NODE_ENV", "production");
  register.mockClear();
  consoleErrors.length = 0;
  vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    consoleErrors.push(args.map((a) => String(a)).join(" "));
  });
  Object.defineProperty(navigator, "serviceWorker", {
    configurable: true,
    value: { register },
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  // Remove the mock so it never leaks into other suites.
  delete (navigator as { serviceWorker?: unknown }).serviceWorker;
});

describe("ServiceWorkerRegister", () => {
  it("registers /sw.js on mount", () => {
    render(<ServiceWorkerRegister />);
    expect(register).toHaveBeenCalledWith("/sw.js");
    expect(consoleErrors).toEqual([]);
  });

  it("renders nothing", () => {
    const { container } = render(<ServiceWorkerRegister />);
    expect(container).toBeEmptyDOMElement();
  });

  it("does not throw when the service worker API is absent", () => {
    delete (navigator as { serviceWorker?: unknown }).serviceWorker;
    expect(() => render(<ServiceWorkerRegister />)).not.toThrow();
    expect(register).not.toHaveBeenCalled();
    expect(consoleErrors).toEqual([]);
  });
});
