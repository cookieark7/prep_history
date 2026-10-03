import { describe, expect, it } from "vitest";
import { QuizBlock, blockProblem, type CauseGraphBlock, type StreamLine } from "@/lib/contracts";
import { readFixture } from "@/lib/fixtures";
import { checkChronology, generateGraphQuiz, refFor, seededShuffle } from "@/lib/quiz";
import { reachable } from "@/lib/layout/cause-graph-layout";

const graphFrom = (file: string) =>
  readFixture(file)
    .map((l) => JSON.parse(l) as StreamLine)
    .flatMap((l) => (l.t === "op" && l.op.op === "add" && l.op.block.type === "cause_graph" ? [l.op.block] : []))[0] as CauseGraphBlock;

describe("seededShuffle", () => {
  it("is stable for a seed and never returns the original order", () => {
    const xs = [1, 2, 3, 4];
    expect(seededShuffle(xs, "q1")).toEqual(seededShuffle(xs, "q1"));
    for (const seed of ["a", "b", "c", "q3", "gq-order"]) expect(seededShuffle(xs, seed)).not.toEqual(xs);
    expect([...seededShuffle(xs, "z")].sort()).toEqual(xs);
  });
});

describe("checkChronology", () => {
  const ev = [{ id: "a", year: -241 }, { id: "b", year: -219 }, { id: "c", year: -216 }];
  it("checks order from years, BCE included", () => {
    expect(checkChronology(["a", "b", "c"], ev)).toBe(true);
    expect(checkChronology(["b", "a", "c"], ev)).toBe(false);
    expect(checkChronology(["a", "b"], ev)).toBe(false);
  });
});

describe.each(["punic-wars.ndjson", "fall-of-rome.ndjson"])("generateGraphQuiz(%s)", (file) => {
  const g = graphFrom(file);
  const quiz = generateGraphQuiz(g)!;

  it("produces a valid quiz block", () => {
    expect(QuizBlock.safeParse(quiz).success).toBe(true);
    expect(blockProblem(quiz)).toBeNull();
    expect(quiz.items.length).toBeGreaterThanOrEqual(2);
  });

  it("'What led to X?' answers are real incoming sources; distractors are unconnected", () => {
    for (const it of quiz.items) {
      if (it.kind !== "mcq") continue;
      const target = it.source_ref.node!;
      expect(g.edges.some((e) => e.from === it.answer_id && e.to === target)).toBe(true);
      const connected = new Set([...reachable(target, g.edges, "back"), ...reachable(target, g.edges, "forward"), target]);
      for (const o of it.options) if (o.id !== it.answer_id) expect(connected.has(o.id)).toBe(false);
      expect(new Set(it.options.map((o) => o.id)).size).toBe(it.options.length);
    }
  });

  it("'Order these causes' uses causes with distinct years", () => {
    const chrono = quiz.items.find((i) => i.kind === "chronology");
    expect(chrono).toBeDefined();
    if (chrono?.kind !== "chronology") return;
    const years = chrono.events.map((e) => e.year);
    expect(new Set(years).size).toBe(years.length);
    for (const e of chrono.events) expect(g.nodes.find((n) => n.id === e.id)?.layer).not.toBe("consequence");
  });

  it("refs point back at the graph", () => {
    for (const it of quiz.items) expect(refFor(it).startsWith(g.id)).toBe(true);
  });
});
