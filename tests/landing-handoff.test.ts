import { describe, expect, it } from "vitest";
import { buildStudyHref, handoffHint, readHandoff, type Handoff } from "@/lib/landing/handoff";
import { finishSignIn, requestStart } from "@/lib/landing/start";

describe("requestStart (L3)", () => {
  const run = (signedIn: boolean, h: Handoff) => {
    const calls: string[] = [];
    requestStart(h, {
      signedIn: () => signedIn,
      navigate: (href) => calls.push(`go ${href}`),
      openLogin: (p) => calls.push(`login ${p.q}`),
    });
    return calls;
  };

  it("goes straight to /study when signed in", () => {
    expect(run(true, { q: "Why did Rome beat Carthage?", kind: "why", ref: "E06" }))
      .toEqual(["go /study?q=Why+did+Rome+beat+Carthage%3F&kind=why&src=landing&ref=E06"]);
  });

  it("opens the login card with the question when signed out", () => {
    expect(run(false, { q: "  What caused the French Revolution? ", kind: "why" }))
      .toEqual(["login What caused the French Revolution?"]);
  });

  it("ignores an empty question", () => {
    expect(run(true, { q: "   ", kind: "free" })).toEqual([]);
  });

  it("finishes sign-in at the waiting question, or an empty /study", () => {
    const go: string[] = [];
    finishSignIn({ q: "Quiz me on the space race.", kind: "quiz", ref: "E19" }, (h) => go.push(h));
    finishSignIn(null, (h) => go.push(h));
    expect(go).toEqual(["/study?q=Quiz+me+on+the+space+race.&kind=quiz&src=landing&ref=E19", "/study"]);
  });

  it("says where the question came from", () => {
    expect(handoffHint({ q: "x", kind: "why", ref: "E06" })).toBe("From Starting points · press Enter to begin");
    expect(handoffHint({ q: "x", kind: "why", ref: "B24" })).toBe("From the film · press Enter to begin");
    expect(handoffHint({ q: "x", kind: "free" })).toBe("From the home page · press Enter to begin");
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
