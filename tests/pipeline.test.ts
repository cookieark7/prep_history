import { describe, expect, it, vi } from "vitest";
import { validatedLines } from "@/lib/director/pipeline";
import { mockLines } from "@/lib/director/mock";
import { readFixture } from "@/lib/fixtures";
import { validateLine, type StreamLine, type TurnRequest } from "@/lib/contracts";

async function collect(src: AsyncIterable<string>, log = vi.fn()) {
  const out: StreamLine[] = [];
  for await (const l of validatedLines(src, log)) out.push(l);
  return { out, log };
}
async function* from(chunks: string[]) { for (const c of chunks) yield c; }
async function* failing() { yield '{"t":"say","text":"hi"}\n'; throw new Error("boom"); }

const req = (message: string | null, blocks: TurnRequest["workspace"]["blocks"] = [], event: TurnRequest["event"] = null): TurnRequest =>
  ({ message, event, workspace: { blocks, level: "some", mastery: [] } });

describe("validatedLines", () => {
  it("drops the broken graph and year-0 timeline, forwards the rest, logs why", async () => {
    const { out, log } = await collect(from([readFixture("mock/broken-edge.ndjson").join("\n")]));
    expect(out.map((l) => l.t)).toEqual(["say", "op", "followup", "done"]);
    expect(log).toHaveBeenCalledWith(expect.stringContaining("references a missing node"));
    expect(log).toHaveBeenCalledWith(expect.stringContaining("year 0"));
  });

  it("adds done when the source forgets it, and stops after done", async () => {
    expect((await collect(from(['{"t":"say","text":"a"}']))).out.at(-1)).toEqual({ t: "done" });
    const { out } = await collect(from(['{"t":"say","text":"a"}{"t":"done"}{"t":"say","text":"late"}']));
    expect(out).toEqual([{ t: "say", text: "a" }, { t: "done" }]);
  });

  it("ends with done on upstream error, without a second say", async () => {
    const { out } = await collect(failing());
    expect(out).toEqual([{ t: "say", text: "hi" }, { t: "done" }]);
    const { out: out2 } = await collect((async function* () { throw new Error("x"); })());
    expect(out2).toEqual([{ t: "say", text: "Something went wrong. Please try again." }, { t: "done" }]);
  });
});

describe("mockLines", () => {
  const valid = (lines: string[]) => lines.map((l) => validateLine(l)).every((r) => r.ok);

  it("defaults to the Punic War sample on an empty stage", () => {
    const lines = mockLines(req("hello"));
    expect(JSON.parse(lines[1]).op.block.title).toBe("Why Rome beat Carthage");
    expect(valid(lines)).toBe(true);
  });

  it("renumbers fixture ids from next_block_id and keeps internal references", () => {
    const lines = mockLines(req("why did rome beat carthage", [{ id: "b4", type: "callout", title: "x" }]));
    const adds = lines.map((l) => JSON.parse(l)).filter((o) => o.t === "op").map((o) => o.op);
    expect(adds.map((o) => o.block.id)).toEqual(["b5", "b6", "b7", "b8"]);
    expect(adds[1].after).toBe("b5");
    expect(adds[2].block.reveals).toBe("b8");
  });

  it("resolves quiz source_refs to stage ids by title", () => {
    const stage = mockLines(req("Mughal succession")).map((l) => JSON.parse(l))
      .filter((o) => o.t === "op").map((o) => ({ id: o.op.block.id, type: o.op.block.type, title: o.op.block.title }));
    const lines = mockLines(req("quiz me", stage));
    expect(valid(lines)).toBe(true);
    const quiz = lines.map((l) => JSON.parse(l)).find((o) => o.op?.block?.type === "quiz").op.block;
    expect(quiz.id).toBe("b4");
    for (const it of quiz.items) expect(stage.map((s) => s.id)).toContain(it.source_ref.block);
  });

  it("answers a disagree note on the Rome lesson with a debate callout after that block", () => {
    const lines = mockLines(req(null, [{ id: "b1", type: "article", title: "How the Western Roman Empire fell" }],
      { event: "note_created", block_id: "b1", kind: "disagree", text: "Not invasions", quote: "invasions" }));
    const op = JSON.parse(lines[1]).op;
    expect(op.after).toBe("b1");
    expect(op.block).toMatchObject({ id: "b2", type: "callout", kind: "debate" });
  });
});
