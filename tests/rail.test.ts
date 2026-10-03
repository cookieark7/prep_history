import { describe, expect, it } from "vitest";
import type { Block, Op, StreamLine } from "@/lib/contracts";
import { readFixture } from "@/lib/fixtures";
import { isComplete, landedFor, lastLanded, railItems, type CompletionState } from "@/lib/rail";
import { applyInverse, applyOp, newTurnContext, type HistoryEntry, type StageState } from "@/lib/store/reducer";
import { migrateV1toV2 } from "@/lib/store/migrate";

const none: CompletionState = { completed: {}, gates: {}, quizRuns: {} };
const empty: StageState = { blocks: [], mode: "reader", focusId: null, fullscreen: false };
const opsOf = (file: string) => readFixture(file).map((l) => JSON.parse(l) as StreamLine).flatMap((l) => (l.t === "op" ? [l.op] : []));

function play(ops: Op[], turn = "c1", start = empty) {
  const ctx = newTurnContext();
  let state = start;
  const history: HistoryEntry[] = [];
  for (const op of ops) {
    const r = applyOp(state, op, ctx);
    state = r.state;
    if (r.entry) history.push({ ...r.entry, turn });
  }
  return { state, history };
}

describe("railItems (E3)", () => {
  it("has exactly one tick per block, in Stage order with pins first", () => {
    const { state } = play(opsOf("punic-wars.ndjson"));
    expect(railItems(state.blocks, [], none).map((i) => i.id)).toEqual(["b1", "b2", "b3", "b4"]);
    expect(railItems(state.blocks, ["b3"], none).map((i) => i.id)).toEqual(["b3", "b1", "b2", "b4"]);
  });

  it("matches the block list after undo", () => {
    const { state, history } = play(opsOf("punic-wars.ndjson"));
    const addGate = history.find((h) => h.op === "add" && h.blockId === "b3")!;
    const after = applyInverse(state, addGate.inverse!);
    expect(railItems(after.blocks, [], none).map((i) => i.id)).toEqual(after.blocks.map((b) => b.id));
  });

  it("works with 1 block and with 12", () => {
    const one: Block[] = [{ id: "b1", type: "callout", title: "One", because: "t", kind: "anchor", md: "x" }];
    expect(railItems(one, [], none)).toHaveLength(1);
    const twelve = Array.from({ length: 12 }, (_, i) => ({ ...one[0], id: `b${i + 1}` }));
    expect(railItems(twelve, [], none)).toHaveLength(12);
  });
});

describe("isComplete (E3)", () => {
  const { state } = play(opsOf("punic-wars.ndjson"));
  const gate = state.blocks.find((b) => b.type === "predict_gate")!;
  const article = state.blocks[0];
  it("fills a gate once answered or skipped", () => {
    expect(isComplete(gate, none)).toBe(false);
    expect(isComplete(gate, { ...none, gates: { b3: { answer: "b", skipped: false } } })).toBe(true);
    expect(isComplete(gate, { ...none, gates: { b3: { answer: null, skipped: true } } })).toBe(true);
  });
  it("fills a quiz only when every item was attempted", () => {
    const quiz = opsOf("mock/punic-wars.quiz.ndjson").flatMap((o) => (o.op === "add" ? [o.block] : []))[0];
    expect(isComplete(quiz, { ...none, quizRuns: { b1: { q1: true, q2: false } } })).toBe(false);
    expect(isComplete(quiz, { ...none, quizRuns: { b1: { q1: true, q2: false, q3: true, q4: true } } })).toBe(true);
  });
  it("fills passive blocks from the dwell record", () => {
    expect(isComplete(article, none)).toBe(false);
    expect(isComplete(article, { ...none, completed: { b1: true } })).toBe(true);
  });
});

describe("step trace (E3)", () => {
  it("landed chips come from history: adds and patches of the turn, once per block", () => {
    const { state, history } = play(opsOf("fall-of-rome.ndjson"), "c9");
    expect(landedFor(history, "c9", state.blocks)).toEqual(["b1", "b2", "b3", "b4"]);
    expect(landedFor(history, "other", state.blocks)).toEqual([]);
    expect(lastLanded(history, "c9")?.op).toBe("patch");
  });
});

describe("migrateV1toV2 (E3)", () => {
  const v1 = {
    lessonId: "l1",
    chat: [
      { id: "u1", role: "learner", text: "Why did Rome beat Carthage?", landed: [], followups: [] },
      { id: "c1", role: "director", text: "Scoped.", landed: ["b1", "b2"], followups: [], status: "done" },
      { id: "c2", role: "director", text: "Deeper.", landed: ["b1"], followups: [], status: "done" },
    ],
    history: [
      { id: "h1", label: "Added Article: A", at: 1, blockId: "b1", inverse: { kind: "remove", id: "b1" } },
      { id: "h2", label: "Added Cause graph: G", at: 2, blockId: "b2", inverse: { kind: "remove", id: "b2" }, undone: true },
      { id: "h3", label: "Switched to focus", at: 3, blockId: null, inverse: { kind: "view", mode: "reader", focusId: null, fullscreen: false } },
      { id: "h4", label: "Update skipped for Article: A (bad)", at: 4, blockId: "b1", inverse: null },
      { id: "h5", label: "Updated Article: A", at: 5, blockId: "b1", inverse: { kind: "replace", block: {} } },
    ],
  };
  const v2 = migrateV1toV2(v1) as { chat: Record<string, unknown>[]; history: Record<string, unknown>[]; completed: object };

  it("adds op, status and turn to every history entry", () => {
    expect(v2.history.map((h) => [h.op, h.status, h.turn])).toEqual([
      ["add", "applied", "c1"],
      ["add", "undone", "c1"],
      ["layout", "applied", null],
      ["patch", "skipped", null],
      ["patch", "applied", "c2"],
    ]);
    expect(v2.history.every((h) => !("undone" in h))).toBe(true);
  });

  it("drops chat.landed and defaults new fields", () => {
    expect(v2.chat.every((c) => !("landed" in c))).toBe(true);
    expect(v2.completed).toEqual({});
  });
});
