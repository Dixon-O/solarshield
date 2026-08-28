/**
 * /judges demonstration — headless arc test.
 *
 * Steps through the full scripted sequence and asserts the pain→relief
 * invariants: the story escalates to G5, the blackout act drops the network,
 * and through the blackout the guidance and the countdown are still on screen.
 * Fails on any non-act console.error.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import JudgesDemo from "./page";

const consoleErrors: string[] = [];

function isActWarning(msg: string): boolean {
  return /not wrapped in act|inside a test was not wrapped|IS_REACT_ACT_ENVIRONMENT/i.test(
    msg,
  );
}

beforeEach(() => {
  consoleErrors.length = 0;
  vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    consoleErrors.push(args.map((a) => String(a)).join(" "));
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("Judges demonstration — full pain→relief arc", () => {
  it("escalates to G5, drops the network, and keeps protecting through the blackout", async () => {
    const user = userEvent.setup();
    render(<JudgesDemo />);

    // Act 1 — all clear.
    expect(
      screen.getByRole("heading", { level: 1, name: "All clear" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Re-enactment of the 10–11 May 2024/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Begin demonstration/ }));

    // Step: Storm inbound.
    await user.click(screen.getByRole("button", { name: "Next ›" }));
    expect(
      screen.getByRole("heading", { level: 1, name: "Storm inbound" }),
    ).toBeInTheDocument();

    // Step: Severe storm (G4).
    await user.click(screen.getByRole("button", { name: "Next ›" }));
    expect(
      screen.getByRole("heading", { level: 1, name: "Severe storm" }),
    ).toBeInTheDocument();

    // Step: Extreme — G5. The recorded G5 alert now appears.
    await user.click(screen.getByRole("button", { name: "Next ›" }));
    expect(
      screen.getByRole("heading", { level: 1, name: /Extreme/ }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Active NOAA Alerts/)).toBeInTheDocument();

    // Step: The blackout — network lost.
    await user.click(screen.getByRole("button", { name: "Next ›" }));
    expect(
      screen.getByRole("heading", { level: 1, name: "The blackout" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Offline — network lost/)).toBeInTheDocument();
    // The Now panel shows the real degraded state.
    expect(screen.getByText(/Some sources unavailable/)).toBeInTheDocument();

    // Step: Still protecting you — the relief.
    await user.click(screen.getByRole("button", { name: "Next ›" }));
    expect(
      screen.getByRole("heading", { level: 1, name: "Still protecting you" }),
    ).toBeInTheDocument();
    // Guidance persists through the blackout...
    expect(screen.getByText("Impact & Actions")).toBeInTheDocument();
    // ...and the countdown is still mounted and running.
    expect(await screen.findByRole("timer")).toBeInTheDocument();
    // Offline notice still shown.
    expect(screen.getByText(/Offline — network lost/)).toBeInTheDocument();

    const realErrors = consoleErrors.filter((m) => !isActWarning(m));
    expect(realErrors).toEqual([]);
  });
});
