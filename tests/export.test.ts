import { describe, expect, it } from "vitest";
import { articleText, blockToHtml, blockToMarkdown, lessonToHtml, lessonToMarkdown } from "@/lib/export";
import { cleanQuote } from "@/lib/notes";
import { readFixture } from "@/lib/fixtures";
import type { Block, StreamLine } from "@/lib/contracts";
import { applyOp, newTurnContext, type StageState } from "@/lib/store/reducer";

/** Final blocks of a fixture, with streamed article sections merged in. */
function blocks(file: string): Block[] {
  const ctx = newTurnContext();
  let s: StageState = { blocks: [], mode: "reader", focusId: null, fullscreen: false };
  for (const l of readFixture(file).map((x) => JSON.parse(x) as StreamLine)) if (l.t === "op") s = applyOp(s, l.op, ctx).state;
  return s.blocks;
}
const of = (file: string, type: Block["type"]) => blocks(file).find((b) => b.type === type)!;

describe("serializers (E7): one per block type", () => {
  it("article: headings, paragraphs, confidence as words", () => {
    const b = of("punic-wars.ndjson", "article");
    const md = blockToMarkdown(b);
    expect(md).toContain("## Why Rome beat Carthage");
    expect(md).toContain("### Why it started");
    expect(md).toContain("even after Cannae (216 BCE) destroyed a Roman army (established).");
    expect(md).toContain("a lasting grievance (contested).");
    expect(md).not.toMatch(/\[\[|\[E\]|\[L\]|\[C\]/);
    const html = blockToHtml(b);
    expect(html).toContain("<h2>Why Rome beat Carthage</h2>");
    expect(html).toContain("<h3>Why it started</h3>");
    expect(html).toMatch(/<p>Rome won the Second Punic War .*\(established\).*<\/p>/);
  });

  it("cause_graph: cause → effect: why", () => {
    const b = of("punic-wars.ndjson", "cause_graph");
    expect(blockToMarkdown(b)).toContain("- Siege of Saguntum → Second Punic War: Rome treated the siege as grounds for war. (established)");
    expect(blockToHtml(b)).toContain("<li>Siege of Saguntum → Second Punic War: Rome treated the siege as grounds for war. <em>(established)</em></li>");
  });

  it("timeline: a table of year, event, track in date order", () => {
    const b = of("fall-of-rome.ndjson", "timeline");
    const md = blockToMarkdown(b);
    expect(md).toContain("| Year | Event | Track |");
    // an all-CE timeline prints bare years
    expect(md.indexOf("| 376 | Goths cross the Danube |")).toBeGreaterThan(0);
    expect(md.indexOf("| 376 | Goths cross the Danube |")).toBeLessThan(md.indexOf("| 476 | Odoacer deposes Romulus Augustulus |"));
    expect(md).toContain("| 451-452 | Attila invades Gaul and Italy | Goths, Vandals, Huns |");
    expect(blockToHtml(b)).toContain("<tr><td>378</td><td>Defeat at Adrianople</td><td>Eastern Empire</td></tr>");
  });

  it("lineage: nested by generation, succession order noted", () => {
    const b = of("mughal-succession.ndjson", "lineage");
    const md = blockToMarkdown(b);
    expect(md).toContain("- Generation 1\n  - Babur (1526-1530) — succession 1");
    expect(md).toContain("  - Aurangzeb (1658-1707) — succession 6");
    expect(md).toContain("  - Shahryar (c. 1605-1628)");
    expect(blockToHtml(b).replace(/\n/g, "")).toContain("<li>Generation 3<ul><li>Akbar (1556-1605) — succession 3</li></ul></li>");
  });

  it("predict_gate: prompt, options, answer with explanation", () => {
    const b = of("punic-wars.ndjson", "predict_gate");
    const md = blockToMarkdown(b);
    expect(md).toContain("**After the disaster at Cannae (216 BCE), what does Rome do?**");
    expect(md).toContain("B. Avoid another set-piece battle and keep raising armies");
    expect(md).toContain("Answer: Avoid another set-piece battle and keep raising armies. Rome kept raising armies");
    expect(blockToHtml(b)).toContain('<ol type="A">');
  });

  it("quiz: each item with its answer", () => {
    const b = of("mock/punic-wars.quiz.ndjson", "quiz");
    const md = blockToMarkdown(b);
    expect(md).toContain("1. What does the graph mark as the immediate trigger of the war?");
    expect(md).toContain("   - Answer: The siege of Saguntum.");
    expect(md).toContain("   - Answer: First Punic War ends (241 BCE) → Rome seizes Sardinia and Corsica (238 BCE)");
    expect(md).toContain("   - Fabius: Denied Hannibal a decisive battle");
    expect(blockToHtml(b)).toMatch(/^<h2>Quiz: the Second Punic War<\/h2>\n<ol>/);
  });

  it("callout: a blockquote", () => {
    const b = of("mughal-succession.ndjson", "callout");
    expect(blockToMarkdown(b)).toContain("> **Live debate.** The Mughals did not follow primogeniture; any son could claim the throne (established).");
    expect(blockToHtml(b)).toMatch(/^<h2>.*<\/h2>\n<blockquote><p><strong>Live debate\.<\/strong>/);
  });

  it("escapes HTML in content", () => {
    expect(blockToHtml({ id: "b1", type: "callout", title: "<x>", because: "t", kind: "anchor", md: "a < b & c" }))
      .toBe("<h2>&lt;x&gt;</h2>\n<blockquote><p><strong>Remember this.</strong> a &lt; b &amp; c</p></blockquote>");
  });
});

describe("lesson export / Copy lesson", () => {
  it("keeps every block in order, plus notes in the Markdown export", () => {
    const md = lessonToMarkdown({
      topic: "Why did Rome beat Carthage?",
      blocks: blocks("punic-wars.ndjson"),
      notes: [{ blockId: "b1", kind: "disagree", quote: "Rome then took Sardinia", text: "Mattered more" }],
    });
    expect(md.startsWith("# Why did Rome beat Carthage?\n")).toBe(true);
    expect(md.indexOf("## Why Rome beat Carthage")).toBeLessThan(md.indexOf("## After Cannae"));
    expect(md).toContain("- **Disagree** “Rome then took Sardinia” — Mattered more");
    expect(lessonToHtml({ topic: "T", blocks: blocks("punic-wars.ndjson") }).match(/<h2>/g)).toHaveLength(4);
  });

  it("articleText turns tags into words and entities into names", () => {
    expect(articleText("Rome won [E] at [[Zama|event]] [L].")).toBe("Rome won (established) at Zama (likely).");
  });
});

describe("cleanQuote", () => {
  it("drops confidence-tag letters picked up by a selection", () => {
    expect(cleanQuote("destroyed a Roman army E . Carthage won")).toBe("destroyed a Roman army. Carthage won");
    expect(cleanQuote("allies L .\n\nWhy it started")).toBe("allies. Why it started");
  });
});
