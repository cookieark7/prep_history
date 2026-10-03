import { describe, expect, it } from "vitest";
import { classifyPaste, composerKeyAction, PASTE_THRESHOLD, SOURCE_TEXT_MAX, wordCount } from "@/lib/composer";
import { buildContext } from "@/lib/director/context";
import { mockLines } from "@/lib/director/mock";
import { TurnRequest, validateLine } from "@/lib/contracts";

describe("composerKeyAction (E1)", () => {
  it("Enter sends, Shift+Enter does not", () => {
    expect(composerKeyAction({ key: "Enter" }, false)).toBe("send");
    expect(composerKeyAction({ key: "Enter", shiftKey: true }, false)).toBe("none");
  });

  it("never sends while an IME is composing", () => {
    expect(composerKeyAction({ key: "Enter", isComposing: true }, false)).toBe("none");
    // Safari / older Chrome report composition as keyCode 229 with isComposing false
    expect(composerKeyAction({ key: "Enter", keyCode: 229 }, false)).toBe("none");
    expect(composerKeyAction({ key: "Process", keyCode: 229 }, true)).toBe("none");
  });

  it("Esc stops only while streaming", () => {
    expect(composerKeyAction({ key: "Escape" }, true)).toBe("stop");
    expect(composerKeyAction({ key: "Escape" }, false)).toBe("none");
  });
});

describe("classifyPaste (E1)", () => {
  it("inserts short pastes normally", () => {
    expect(classifyPaste("a".repeat(PASTE_THRESHOLD)).kind).toBe("inline");
  });

  it("turns a 5,000-character paste into a card with a word count", () => {
    const text = "Hannibal crossed the Alps. ".repeat(186).slice(0, 5000);
    const r = classifyPaste(text);
    expect(r.kind).toBe("card");
    if (r.kind !== "card") return;
    expect(r.card.text).toHaveLength(5000);
    expect(r.card.words).toBe(wordCount(text));
    expect(r.card.truncated).toBe(false);
  });

  it("caps at SOURCE_TEXT_MAX and says so", () => {
    const r = classifyPaste("x ".repeat(6000));
    expect(r.kind === "card" && r.card.text.length).toBe(SOURCE_TEXT_MAX);
    expect(r.kind === "card" && r.card.truncated).toBe(true);
  });
});

describe("source_text (E1 contract)", () => {
  const base = { message: "Help me understand what I'm reading.", event: null, workspace: { blocks: [], level: "some" as const, mastery: [] } };

  it("is optional and capped at 8,000 characters", () => {
    expect(TurnRequest.safeParse(base).success).toBe(true);
    expect(TurnRequest.safeParse({ ...base, source_text: "a".repeat(8000) }).success).toBe(true);
    expect(TurnRequest.safeParse({ ...base, source_text: "a".repeat(8001) }).success).toBe(false);
  });

  it("adds a <source_text> block to the Director context, before <input>", () => {
    const ctx = buildContext({ ...base, source_text: "Carthage was founded by Phoenicians." });
    expect(ctx).toContain("<source_text>\nCarthage was founded by Phoenicians.\n</source_text>");
    expect(ctx.indexOf("<source_text>")).toBeGreaterThan(ctx.indexOf("</context>"));
    expect(ctx.indexOf("<source_text>")).toBeLessThan(ctx.indexOf("<input>"));
    expect(buildContext(base)).not.toContain("<source_text>");
  });

  it("mock mode routes a paste by its topic, and answers honestly otherwise", () => {
    const routed = mockLines({ ...base, source_text: "After Cannae, Hannibal waited outside Rome." });
    expect(JSON.parse(routed[1]).op.block.title).toBe("Why Rome beat Carthage");
    const unknown = mockLines({ ...base, source_text: "The Meiji Restoration began in 1868." });
    expect(unknown).toHaveLength(2);
    expect(JSON.parse(unknown[0]).text).toMatch(/cannot read pasted text/);
    expect(unknown.every((l) => validateLine(l).ok)).toBe(true);
  });
});
