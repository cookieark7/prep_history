import { describe, expect, it } from "vitest";
import { SLOW_AFTER_S, statusText } from "@/lib/status";

describe("statusText (E2)", () => {
  it("says what is happening and for how long before the first part lands", () => {
    expect(statusText(true, null, 0)).toBe("Writing your lesson");
    expect(statusText(true, null, 3)).toBe("Writing your lesson · 3 s");
  });

  it("explains a long wait honestly", () => {
    expect(statusText(true, null, SLOW_AFTER_S)).toBe(`Writing your lesson · ${SLOW_AFTER_S} s. Free models can take up to 30 s to start.`);
  });

  it("switches to part-driven text once a part lands", () => {
    expect(statusText(true, { type: "cause_graph", kind: "added" }, 3)).toBe("Cause map added · working on the next part");
    expect(statusText(true, { type: "article", kind: "updated" }, 0)).toBe("Article updated · working on the next part");
  });

  it("clears when the turn is not streaming (done, error, abort)", () => {
    expect(statusText(false, null, 0)).toBeNull();
    expect(statusText(false, { type: "timeline", kind: "added" }, 0)).toBeNull();
  });
});
