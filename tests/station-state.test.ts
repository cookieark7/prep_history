import { describe, expect, it } from "vitest";
import { stationState } from "@/lib/review/station-state";

const t = (lessons: number, cards: number, learned: number, overdue: number) => ({ lessons, cards, learned, overdue });

describe("stationState (Progress)", () => {
  it("puts where you are first", () => {
    expect(stationState(true, t(2, 6, 6, 1))).toBe("here");
  });
  it("shows overdue before settled or started", () => {
    expect(stationState(false, t(1, 5, 2, 1))).toBe("overdue");
  });
  it("shows settled when every card is settled", () => {
    expect(stationState(false, t(1, 4, 4, 0))).toBe("settled");
  });
  it("shows started for a lesson begun but not settled, and open otherwise", () => {
    expect(stationState(false, t(1, 4, 1, 0))).toBe("started");
    expect(stationState(false, t(1, 0, 0, 0))).toBe("started");
    expect(stationState(false, t(0, 0, 0, 0))).toBe("open");
  });
});
