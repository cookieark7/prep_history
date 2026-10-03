import { describe, expect, it } from "vitest";
import { readdirSync } from "node:fs";
import path from "node:path";
import type { Op, StreamLine } from "@/lib/contracts";
import { readFixture } from "@/lib/fixtures";
import { mockLines } from "@/lib/director/mock";
import { applyInverse, applyOp, newTurnContext, type HistoryEntry, type StageState } from "@/lib/store/reducer";
import { validateLine } from "@/lib/contracts";

const root = path.join(process.cwd(), "lib/fixtures");
const files = [
  ...readdirSync(root).filter((f) => f.endsWith(".ndjson")),
  ...readdirSync(path.join(root, "mock")).filter((f) => f.endsWith(".ndjson")).map((f) => `mock/${f}`),
];
const parse = (file: string) => readFixture(file).map((l) => JSON.parse(l) as StreamLine);
const empty: StageState = { blocks: [], mode: "reader", focusId: null, fullscreen: false };

describe.each(files)("E5 fixture shape: %s", (file) => {
  const lines = parse(file);
  const ops = lines.flatMap((l) => (l.t === "op" ? [l.op] : []));

  it("adds articles with only their first section", () => {
    for (const o of ops) if (o.op === "add" && o.block.type === "article") expect(o.block.sections).toHaveLength(1);
  });

  it("streams the rest one section per patch, after every add", () => {
    const addedArticles = ops.filter((o): o is Extract<Op, { op: "add" }> => o.op === "add" && o.block.type === "article").map((o) => o.block.id);
    const lastAdd = ops.map((o) => o.op).lastIndexOf("add");
    ops.forEach((o, i) => {
      if (o.op !== "patch" || !addedArticles.includes(o.id)) return;
      expect(i).toBeGreaterThan(lastAdd);
      expect(Object.keys(o.set)).toEqual(["sections"]);
      expect((o.set.sections as unknown[]).length).toBe(1);
    });
  });
});

function run(state: StageState, ops: Op[]) {
  const turn = newTurnContext();
  const entries: HistoryEntry[] = [];
  for (const op of ops) {
    const r = applyOp(state, op, turn);
    state = r.state;
    if (r.entry) entries.push(r.entry);
  }
  return { state, entries };
}

describe("E5 reducer", () => {
  const ops = parse("fall-of-rome.ndjson").flatMap((l) => (l.t === "op" ? [l.op] : []));

  it("patches a block added earlier in the same turn; first paint is the brief alone", () => {
    const firstAdd = run(empty, ops.slice(0, 1)).state.blocks[0];
    expect(firstAdd.type === "article" && firstAdd.sections.map((s) => s.depth)).toEqual(["brief"]);
    const { state, entries } = run(empty, ops);
    const art = state.blocks[0];
    expect(art.type === "article" && art.sections.map((s) => s.h)).toEqual(["The short version", "Why it happened", "What it led to", "The debate"]);
    expect(entries.filter((e) => e.op === "patch").every((e) => e.inverse?.kind === "sections")).toBe(true);
  });

  it("undoing one section patch removes only that section", () => {
    const { state, entries } = run(empty, ops);
    const middle = entries.filter((e) => e.op === "patch")[1]; // "What it led to"
    const after = applyInverse(state, middle.inverse!);
    const art = after.blocks[0];
    expect(art.type === "article" && art.sections.map((s) => s.h)).toEqual(["The short version", "Why it happened", "The debate"]);
  });

  it("undoing a replacing patch restores the previous section text", () => {
    const { state } = run(empty, ops);
    const r = applyOp(state, { op: "patch", id: "b1", set: { sections: [{ h: "Why it happened", depth: "standard", md: "rewritten" }] } });
    const back = applyInverse(r.state, r.entry!.inverse!);
    expect(back.blocks[0]).toEqual(state.blocks[0]);
  });

  it("follows a rename when the patched article collided on id", () => {
    const first = run(empty, ops).state; // b1..b4 on stage
    const { state } = run(first, ops); // replay: article becomes b5
    const b5 = state.blocks.find((b) => b.id === "b5");
    expect(b5?.type === "article" && b5.sections).toHaveLength(4);
    const b1 = state.blocks.find((b) => b.id === "b1");
    expect(b1?.type === "article" && b1.sections).toHaveLength(4); // untouched by the replay's patches
  });
});

describe("E5 mock re-test turn 2: Mughal decline on an existing stage", () => {
  const stage = parse("mughal-succession.ndjson").flatMap((l) =>
    l.t === "op" && l.op.op === "add" ? [{ id: l.op.block.id, type: l.op.block.type, title: l.op.block.title }] : []);

  it("adds next to the stage instead of restarting, and patches its own article", () => {
    const lines = mockLines({ message: "Why did the Mughal empire decline?", event: null, workspace: { blocks: stage, level: "some", mastery: [] } });
    expect(lines.every((l) => validateLine(l).ok)).toBe(true);
    const ops = lines.map((l) => JSON.parse(l)).filter((o) => o.t === "op").map((o) => o.op);
    expect(ops.some((o) => o.op === "remove")).toBe(false);
    expect(ops.filter((o) => o.op === "add").map((o) => o.block.id)).toEqual(["b4", "b5"]);
    expect(ops.filter((o) => o.op === "patch").every((o) => o.id === "b4")).toBe(true);
  });
});
