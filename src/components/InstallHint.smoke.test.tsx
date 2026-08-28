/**
 * InstallHint — headless behaviour test.
 *
 * The hint must appear ONLY on iOS Safari when the app is not already installed,
 * stay hidden everywhere else, and disappear (permanently) when dismissed. We
 * drive it by stubbing `navigator.userAgent` / standalone / localStorage in
 * jsdom. Fails on any console.error.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { InstallHint } from "./InstallHint";

const IPHONE_SAFARI =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const IPHONE_CHROME =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0 Mobile/15E148 Safari/604.1";
const DESKTOP_CHROME =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

const consoleErrors: string[] = [];

function setUserAgent(ua: string) {
  Object.defineProperty(navigator, "userAgent", { configurable: true, value: ua });
}

function setStandalone(on: boolean) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: (query: string) => ({
      matches: on && query.includes("standalone"),
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      onchange: null,
      dispatchEvent: () => false,
    }),
  });
}

beforeEach(() => {
  consoleErrors.length = 0;
  vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    consoleErrors.push(args.map((a) => String(a)).join(" "));
  });
  window.localStorage.clear();
  setStandalone(false);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  window.localStorage.clear();
});

describe("InstallHint", () => {
  it("shows on iOS Safari when not installed", () => {
    setUserAgent(IPHONE_SAFARI);
    render(<InstallHint />);
    expect(screen.getByText(/Add to Home Screen/i)).toBeTruthy();
    expect(consoleErrors).toEqual([]);
  });

  it("stays hidden on non-iOS browsers", () => {
    setUserAgent(DESKTOP_CHROME);
    const { container } = render(<InstallHint />);
    expect(container).toBeEmptyDOMElement();
  });

  it("stays hidden inside other iOS browsers (no Add-to-Home-Screen action)", () => {
    setUserAgent(IPHONE_CHROME);
    const { container } = render(<InstallHint />);
    expect(container).toBeEmptyDOMElement();
  });

  it("stays hidden when already installed (standalone)", () => {
    setUserAgent(IPHONE_SAFARI);
    setStandalone(true);
    const { container } = render(<InstallHint />);
    expect(container).toBeEmptyDOMElement();
  });

  it("dismisses permanently and remembers it", () => {
    setUserAgent(IPHONE_SAFARI);
    const { container, rerender } = render(<InstallHint />);
    fireEvent.click(screen.getByRole("button", { name: /dismiss/i }));
    expect(container).toBeEmptyDOMElement();
    // A fresh mount stays hidden because the dismissal was persisted.
    rerender(<InstallHint />);
    cleanup();
    render(<InstallHint />);
    expect(screen.queryByText(/Add to Home Screen/i)).toBeNull();
    expect(consoleErrors).toEqual([]);
  });
});
