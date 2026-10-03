import { describe, expect, it } from "vitest";
import { chipLabel, landingDirection } from "@/lib/landing";

describe("landingDirection (E4)", () => {
  const vh = 900;
  it("is null when any part of the block is visible", () => {
    expect(landingDirection({ top: 100, bottom: 400 }, vh)).toBeNull();
    expect(landingDirection({ top: 880, bottom: 1400 }, vh)).toBeNull();
    expect(landingDirection({ top: -500, bottom: 80 }, vh)).toBeNull();
  });
  it("says below / above when the block is off-screen", () => {
    expect(landingDirection({ top: 900, bottom: 1300 }, vh)).toBe("below");
    expect(landingDirection({ top: 2400, bottom: 2900 }, vh)).toBe("below");
    expect(landingDirection({ top: -800, bottom: 60 }, vh)).toBe("above"); // hidden under the 64px top bar
  });
});

describe("chipLabel (E4)", () => {
  it("names a single block and collapses several", () => {
    expect(chipLabel([])).toBeNull();
    expect(chipLabel([{ id: "b2", type: "cause_graph", dir: "below" }])).toBe("Cause graph added, below");
    expect(chipLabel([
      { id: "b2", type: "cause_graph", dir: "below" },
      { id: "b3", type: "timeline", dir: "below" },
      { id: "b4", type: "callout", dir: "below" },
    ])).toBe("3 blocks added, below");
    expect(chipLabel([
      { id: "b2", type: "cause_graph", dir: "above" },
      { id: "b5", type: "quiz", dir: "below" },
    ])).toBe("2 blocks added");
  });
});
