import type { TurnRequest } from "@/lib/contracts";
import { TOPIC_FIXTURES, readFixture } from "@/lib/fixtures";
import { nextBlockId } from "./context";

/**
 * MOCK_LLM=1: pick a hand-written Director output for this turn. No network.
 *
 * Fixtures number their own blocks b1..bN; those are renumbered from next_block_id so a
 * second lesson does not collide with the first. Placeholders refer to blocks already on
 * the stage: {{title:<exact title>}} and {{event.block_id}}. A line whose placeholder
 * cannot be resolved is dropped.
 */
export function mockLines(req: TurnRequest): string[] {
  const { file, say } = pickFixture(req);
  if (!file) return [JSON.stringify({ t: "say", text: say }), JSON.stringify({ t: "done" })];
  return renumberAndResolve(readFixture(file), req);
}

const TOPIC_TITLE_HINTS: Record<string, string> = {
  "punic-wars": "Why Rome beat Carthage",
  "fall-of-rome": "How the Western Roman Empire fell",
  "mughal-succession": "Mughal succession: Babur to Aurangzeb",
};

function topicOnStage(req: TurnRequest): string | null {
  const titles = new Set(req.workspace.blocks.map((b) => b.title));
  // most recently added topic wins
  for (const b of [...req.workspace.blocks].reverse()) {
    for (const [topic, title] of Object.entries(TOPIC_TITLE_HINTS)) if (b.title === title) return topic;
  }
  return Object.entries(TOPIC_TITLE_HINTS).find(([, t]) => titles.has(t))?.[0] ?? null;
}

function pickFixture(req: TurnRequest): { file?: string; say?: string } {
  const topic = topicOnStage(req);
  const ev = req.event;

  if (ev) {
    switch (ev.event) {
      case "note_created":
        if (topic === "fall-of-rome" && (ev.kind === "disagree" || ev.kind === "question"))
          return { file: "mock/fall-of-rome.disagree.ndjson" };
        return { say: `Noted (${ev.kind}). Mock mode has a scripted reply only for disagreements on the fall of Rome lesson.` };
      case "predict_answer":
        return { say: ev.correct ? "Correct. The block below shows how it played out." : "Not quite. The block below shows what happened instead." };
      case "quiz_result":
        return { say: ev.correct ? "Correct." : "Worth another look. Use See in lesson to revisit where this came from." };
      case "ask_why":
        return { say: `Mock mode cannot research "${ev.selection.slice(0, 80)}". With a live model, an explanation lands next to this block.` };
      case "expand_node":
        return { say: `Mock mode cannot expand "${ev.label}". With a live model, a focused explanation lands next to the graph.` };
    }
  }

  const msg = (req.message ?? "").toLowerCase();
  if (msg.includes("__broken__")) return { file: "mock/broken-edge.ndjson" };

  const wantsQuiz = /\b(quiz|test me|test)\b/.test(msg);
  const wantsDeeper = /\b(deeper|go deep|more detail|why did the allies|east survive|aurangzeb win)\b/.test(msg);
  if (topic && wantsQuiz) return { file: `mock/${topic}.quiz.ndjson` };
  if (topic && wantsDeeper) return { file: `mock/${topic}.deeper.ndjson` };

  // topics can be recognised from pasted reading too (quiz/deeper intent only from the message)
  const source = (req.source_text ?? "").toLowerCase();
  const match = TOPIC_FIXTURES.find((f) => f.keywords.some((k) => msg.includes(k) || source.includes(k)));
  if (match) return { file: match.file };
  if (source) {
    const words = source.trim().split(/\s+/).length;
    return { say: `Mock mode cannot read pasted text (${words} words) unless it mentions one of its three lessons. With a live model, the lesson anchors to what you pasted.` };
  }
  if (!req.workspace.blocks.length) return { file: "punic-wars.ndjson" };
  return {
    say: "Mock mode knows three lessons (the Second Punic War, the fall of Rome, the Mughal succession) plus quiz and go-deeper turns for each. Set MOCK_LLM=0 with an API key for anything else.",
  };
}

function renumberAndResolve(lines: string[], req: TurnRequest): string[] {
  // local fixture id -> fresh stage id
  const next = nextBlockId(req.workspace.blocks);
  const local = new Map<string, string>();
  for (const l of lines) {
    const obj = JSON.parse(l);
    if (obj.t === "op" && obj.op.op === "add") local.set(obj.op.block.id, `b${next + local.size}`);
  }
  const mapId = (id: string | null) => (id != null && local.has(id) ? local.get(id)! : id);

  const byTitle = new Map(req.workspace.blocks.map((b) => [b.title, b.id]));
  const eventBlock = req.event && "block_id" in req.event ? req.event.block_id : null;

  const out: string[] = [];
  for (const l of lines) {
    const obj = JSON.parse(l);
    if (obj.t === "op" && obj.op.op === "add") {
      const b = obj.op.block;
      b.id = mapId(b.id);
      obj.op.after = mapId(obj.op.after);
      if (b.type === "predict_gate") b.reveals = mapId(b.reveals);
      if (b.type === "quiz") for (const it of b.items) it.source_ref.block = mapId(it.source_ref.block);
    }
    let text = JSON.stringify(obj);
    let unresolved = false;
    text = text.replace(/\{\{title:([^}]+)\}\}/g, (_, title: string) => {
      const id = byTitle.get(title);
      if (!id) unresolved = true;
      return id ?? "";
    });
    text = text.replace(/\{\{event\.block_id\}\}/g, () => {
      if (!eventBlock) unresolved = true;
      return eventBlock ?? "";
    });
    if (unresolved) {
      console.warn(`[mock] dropped line with unresolved placeholder: ${l.slice(0, 120)}`);
      continue;
    }
    out.push(text);
  }
  return out;
}
