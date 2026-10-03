import { describe, expect, it } from "vitest";
import { statusText, WAITING_VERBS } from "@/lib/status";

describe("statusText (E2)", () => {
  it("rotates waiting verbs before the first op", () => {
    expect(statusText(true, null, 0)).toBe(`${WAITING_VERBS[0]}…`);
    expect(statusText(true, null, 1)).toBe(`${WAITING_VERBS[1]}…`);
    expect(statusText(true, null, WAITING_VERBS.length)).toBe(`${WAITING_VERBS[0]}…`);
  });

  it("switches to op-driven text once an op lands", () => {
    expect(statusText(true, { type: "cause_graph", kind: "added" }, 3)).toBe("Cause graph added · working on the next block");
    expect(statusText(true, { type: "article", kind: "updated" }, 0)).toBe("Article updated · working on the next block");
  });

  it("clears when the turn is not streaming (done, error, abort)", () => {
    expect(statusText(false, null, 0)).toBeNull();
    expect(statusText(false, { type: "timeline", kind: "added" }, 0)).toBeNull();
  });
});
