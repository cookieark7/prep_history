import { describe, expect, it } from "vitest";
import { applyInverse, applyOp, newTurnContext, type StageState } from "@/lib/store/reducer";
import { readFixture } from "@/lib/fixtures";
import type { Block, Op, StreamLine } from "@/lib/contracts";

const empty: StageState = { blocks: [], mode: "reader", focusId: null, fullscreen: false };
const punicOps = readFixture("punic-wars.ndjson")
  .map((l) => JSON.parse(l) as StreamLine)
  .flatMap((l) => (l.t === "op" ? [l.op] : []));

function run(state: StageState, ops: Op[]) {
  const turn = newTurnContext();
  const entries = [];
  for (const op of ops) {
    const r = applyOp(state, op, turn);
    state = r.state;
    if (r.entry) entries.push(r.entry);
  }
  return { state, entries };
}

const callout = (id: string, title = "Note"): Block => ({
  id, type: "callout", title, because: "test", kind: "anchor", md: "x",
});

describe("applyOp", () => {
  it("adds blocks in order, honouring `after`", () => {
    const { state } = run(empty, punicOps);
    expect(state.blocks.map((b) => b.id)).toEqual(["b1", "b2", "b3", "b4"]);
    const { state: s2 } = run(state, [{ op: "add", after: "b1", block: callout("b5") }]);
    expect(s2.blocks.map((b) => b.id)).toEqual(["b1", "b5", "b2", "b3", "b4"]);
    const { state: s3 } = run(state, [{ op: "add", after: null, block: callout("b5") }]);
    expect(s3.blocks.at(-1)!.id).toBe("b5");
  });

  it("renames on id collision and rewrites same-turn references (reveals, source_ref, after)", () => {
    const { state } = run(empty, punicOps); // b1..b4 on stage
    // replay the same lesson: every id collides
    const { state: s2 } = run(state, punicOps);
    const ids = s2.blocks.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(["b1", "b2", "b3", "b4", "b5", "b6", "b7", "b8"]);
    const gate = s2.blocks.find((b) => b.id === "b7");
    expect(gate?.type === "predict_gate" && gate.reveals).toBe("b8");

    const quiz: Block = {
      id: "b1", type: "quiz", title: "Q", because: "t",
      items: [{ kind: "chronology", id: "q1", stem: "s", events: [
        { id: "a", label: "a", year: 1 }, { id: "b", label: "b", year: 2 }, { id: "c", label: "c", year: 3 },
      ], source_ref: { block: "b2", node: null } }],
    };
    const { state: s3 } = run(state, [
      { op: "add", after: null, block: callout("b2", "new") }, // collides -> b5
      { op: "add", after: "b2", block: quiz }, // collides -> b6; after and source_ref follow the rename
    ]);
    expect(s3.blocks.map((b) => b.id)).toEqual(["b1", "b2", "b3", "b4", "b5", "b6"]);
    const q = s3.blocks.find((b) => b.type === "quiz");
    expect(q?.type === "quiz" && q.items[0].source_ref.block).toBe("b5");
  });

  it("patches article sections by heading and records an undo", () => {
    const { state } = run(empty, punicOps);
    const r = applyOp(state, {
      op: "patch", id: "b1",
      set: { sections: [
        { h: "Why it started", depth: "standard", md: "replaced" },
        { h: "Deep dive", depth: "deep", md: "new" },
      ] },
    });
    const art = r.state.blocks[0];
    expect(art.type === "article" && art.sections.map((s) => s.h)).toEqual(["The short version", "Why it started", "What it led to", "Deep dive"]);
    expect(art.type === "article" && art.sections[1].md).toBe("replaced");
    expect(r.landed).toBe("b1");
    expect(applyInverse(r.state, r.entry!.inverse!).blocks[0]).toEqual(state.blocks[0]);
  });

  it("rejects an invalid patch and keeps the old block", () => {
    const { state } = run(empty, punicOps);
    const bad = applyOp(state, { op: "patch", id: "b2", set: { nodes: [] } });
    expect(bad.state.blocks[1]).toBe(state.blocks[1]);
    expect(bad.entry?.label).toMatch(/Update skipped/);
    expect(bad.entry?.inverse).toBeNull();
    const semantic = applyOp(state, { op: "patch", id: "b3", set: { answer_id: "zzz" } });
    expect(semantic.entry?.label).toMatch(/Update skipped/);
    const missing = applyOp(state, { op: "patch", id: "b99", set: { title: "x" } });
    expect(missing.entry?.label).toMatch(/no block b99/);
  });

  it("removes and restores at the same position", () => {
    const { state } = run(empty, punicOps);
    const r = applyOp(state, { op: "remove", id: "b2" });
    expect(r.state.blocks.map((b) => b.id)).toEqual(["b1", "b3", "b4"]);
    expect(applyInverse(r.state, r.entry!.inverse!).blocks.map((b) => b.id)).toEqual(["b1", "b2", "b3", "b4"]);
  });

  it("handles layout and focus with undo", () => {
    const { state } = run(empty, punicOps);
    const l = applyOp(state, { op: "layout", mode: "focus" });
    expect(l.state.mode).toBe("focus");
    expect(applyInverse(l.state, l.entry!.inverse!).mode).toBe("reader");
    const f = applyOp(state, { op: "focus", id: "b2", fullscreen: true });
    expect(f.state).toMatchObject({ focusId: "b2", fullscreen: true });
    expect(applyOp(state, { op: "focus", id: "nope", fullscreen: true }).state).toBe(state);
  });
});
