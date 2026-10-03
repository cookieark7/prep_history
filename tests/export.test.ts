import { describe, expect, it } from "vitest";
import { lessonToMarkdown } from "@/lib/export";
import { cleanQuote } from "@/lib/notes";
import { readFixture } from "@/lib/fixtures";
import type { Block, StreamLine } from "@/lib/contracts";

const blocks = (file: string) =>
  readFixture(file).map((l) => JSON.parse(l) as StreamLine)
    .flatMap((l) => (l.t === "op" && l.op.op === "add" ? [l.op.block as Block] : []));

describe("lessonToMarkdown", () => {
  it("exports articles as plain text, graph edges as bullets, and notes", () => {
    const md = lessonToMarkdown({
      topic: "Why did Rome beat Carthage?",
      blocks: blocks("punic-wars.ndjson"),
      notes: [{ blockId: "b1", kind: "disagree", quote: "Rome then took Sardinia", text: "Mattered more" }],
    });
    expect(md.startsWith("# Why did Rome beat Carthage?\n")).toBe(true);
    expect(md).toContain("### The short version");
    expect(md).toContain("even after Cannae (216 BCE)"); // entity markup stripped
    expect(md).not.toMatch(/\[\[|\[E\]/);
    expect(md).toContain("- Siege of Saguntum → Second Punic War (established): Rome treated the siege as grounds for war.");
    expect(md).toContain("- **Disagree** “Rome then took Sardinia” — Mattered more");
  });

  it("exports timelines in date order and lineage succession", () => {
    const md = lessonToMarkdown({ topic: "Mughals", blocks: blocks("mughal-succession.ndjson"), notes: [] });
    expect(md.indexOf("1526-1530: Babur")).toBeLessThan(md.indexOf("1658-1707: Aurangzeb"));
    expect(md).toContain("- Shah Jahan → Aurangzeb");
  });
});

describe("cleanQuote", () => {
  it("drops confidence-tag letters picked up by a selection", () => {
    expect(cleanQuote("destroyed a Roman army E . Carthage won")).toBe("destroyed a Roman army. Carthage won");
    expect(cleanQuote("allies L .\n\nWhy it started")).toBe("allies. Why it started");
  });
});
