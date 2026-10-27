import { describe, expect, it } from "vitest";
import { buildStudyHref, readHandoff, type Handoff } from "@/lib/landing/handoff";
import { finishSignIn, requestStart } from "@/lib/landing/start";

describe("requestStart", () => {
  const run = (h: Handoff) => {
    const calls: string[] = [];
    requestStart(h, { navigate: (href) => calls.push(href), token: () => "k1" });
    return calls;
  };

  it("goes straight to /study with the question and a one-time token, signed in or not", () => {
    expect(run({ q: "Why did Rome beat Carthage?", kind: "why", ref: "E06" }))
      .toEqual(["/study?q=Why+did+Rome+beat+Carthage%3F&kind=why&src=landing&ref=E06&t=k1"]);
    expect(run({ q: "  What caused the French Revolution? ", kind: "why" }))
      .toEqual(["/study?q=What+caused+the+French+Revolution%3F&kind=why&src=landing&t=k1"]);
  });

  it("ignores an empty question", () => {
    expect(run({ q: "   ", kind: "free" })).toEqual([]);
  });

  it("finishes sign-in at the waiting question, or an empty /study", () => {
    const go: string[] = [];
    finishSignIn({ q: "Quiz me on the space race.", kind: "quiz", ref: "E19" }, (h) => go.push(h));
    finishSignIn(null, (h) => go.push(h));
    expect(go).toEqual(["/study?q=Quiz+me+on+the+space+race.&kind=quiz&src=landing&ref=E19", "/study"]);
  });
});

describe("handoff (prompt 7)", () => {
  it("builds the /study URL", () => {
    expect(buildStudyHref({ q: "Why did Rome beat Carthage?", kind: "why", ref: "E06" }))
      .toBe("/study?q=Why+did+Rome+beat+Carthage%3F&kind=why&src=landing&ref=E06");
    expect(buildStudyHref({ q: "  hello  ", kind: "free" })).toBe("/study?q=hello&kind=free&src=landing");
    expect(buildStudyHref({ q: "   ", kind: "free" })).toBe("/study");
  });

  it("caps the question at the TurnRequest limit", () => {
    const href = buildStudyHref({ q: "x".repeat(1500), kind: "free" });
    expect(new URL(href, "http://x").searchParams.get("q")).toHaveLength(1000);
  });

  it("round-trips through the URL and ignores other sources", () => {
    const h = { q: "Map the Mughal succession.", kind: "who" as const, ref: "E14" };
    expect(readHandoff(new URL(buildStudyHref(h), "http://x").searchParams)).toEqual(h);
    expect(readHandoff(new URLSearchParams("q=hi"))).toBeNull();
    expect(readHandoff(new URLSearchParams("q=hi&src=landing&kind=bogus"))).toEqual({ q: "hi", kind: "free" });
  });
});
