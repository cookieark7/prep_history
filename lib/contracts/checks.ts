import type { Block } from "./blocks";
import { StreamLine } from "./ops";

/**
 * Light semantic checks beyond the zod shape, so the UI never receives a block it
 * cannot draw. Returns a reason string when the block is unusable, otherwise null.
 */
export function blockProblem(block: Block): string | null {
  switch (block.type) {
    case "cause_graph": {
      const events = block.nodes.filter((n) => n.layer === "event").length;
      if (events !== 1) return `cause_graph ${block.id}: expected exactly one "event" node, got ${events}`;
      const ids = new Set(block.nodes.map((n) => n.id));
      const bad = block.edges.find((e) => !ids.has(e.from) || !ids.has(e.to));
      if (bad) return `cause_graph ${block.id}: edge ${bad.from}->${bad.to} references a missing node`;
      return null;
    }
    case "timeline": {
      const tracks = new Set(block.tracks.map((t) => t.id));
      const badTrack = block.events.find((e) => !tracks.has(e.track));
      if (badTrack) return `timeline ${block.id}: event ${badTrack.id} uses unknown track "${badTrack.track}"`;
      const zero = block.events.find((e) => e.start === 0 || e.end === 0);
      if (zero || block.range.from === 0 || block.range.to === 0) return `timeline ${block.id}: year 0 does not exist`;
      return null;
    }
    case "predict_gate":
      if (!block.options.some((o) => o.id === block.answer_id))
        return `predict_gate ${block.id}: answer_id "${block.answer_id}" is not an option`;
      return null;
    default:
      return null;
  }
}

export type LineResult =
  | { ok: true; line: StreamLine }
  | { ok: false; reason: string };

/** JSON text -> validated StreamLine (shape + semantic checks for "add" ops). */
export function validateLine(text: string): LineResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (e) {
    return { ok: false, reason: `invalid JSON: ${(e as Error).message}` };
  }
  const parsed = StreamLine.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, reason: `schema: ${issue.path.join(".")}: ${issue.message}` };
  }
  const line = parsed.data;
  if (line.t === "op" && line.op.op === "add") {
    const problem = blockProblem(line.op.block);
    if (problem) return { ok: false, reason: problem };
  }
  return { ok: true, line };
}
