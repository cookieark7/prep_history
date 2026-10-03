import { describe, expect, it } from "vitest";
import { clampDock, dockKeyStep, DOCK_DEFAULT, DOCK_MAX, DOCK_MIN } from "@/lib/dock";

describe("dock width (E6)", () => {
  it("clamps to 280..520", () => {
    expect(clampDock(100)).toBe(DOCK_MIN);
    expect(clampDock(900)).toBe(DOCK_MAX);
    expect(clampDock(401.6)).toBe(402);
    expect(clampDock(NaN)).toBe(DOCK_DEFAULT);
  });
  it("steps by keyboard: arrows ±16, Shift ±48, Home/End", () => {
    expect(dockKeyStep("ArrowRight", false, 340)).toBe(356);
    expect(dockKeyStep("ArrowLeft", true, 340)).toBe(292);
    expect(dockKeyStep("ArrowLeft", true, 300)).toBe(DOCK_MIN);
    expect(dockKeyStep("Home", false, 400)).toBe(DOCK_MIN);
    expect(dockKeyStep("End", false, 400)).toBe(DOCK_MAX);
    expect(dockKeyStep("a", false, 400)).toBeNull();
  });
});
