import type { TurnRequest } from "@/lib/contracts";

/** Highest numeric block id on the stage + 1. */
export function nextBlockId(blocks: { id: string }[]): number {
  let max = 0;
  for (const b of blocks) {
    const m = /^b(\d+)$/.exec(b.id);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return max + 1;
}

export interface ContextExtras {
  /** the lesson's last few exchanges, oldest first (lib/turns/log.ts) */
  recent?: { input: string; say: string }[];
  /** the <sources> block of retrieved passages (lib/rag/citations.ts formatSources) */
  sources?: string;
}

/** The dynamic part of each turn (Part 4 context template). The system prompt stays static. */
export function buildContext(req: TurnRequest, extras: ContextExtras = {}): string {
  const { workspace } = req;
  const stage = workspace.blocks.length
    ? workspace.blocks.map((b) => `- ${b.id} | ${b.type} | ${b.title}`).join("\n")
    : "(empty)";
  const lowest = [...workspace.mastery]
    .sort((a, b) => a.strength - b.strength)
    .slice(0, 5)
    .map((m) => `${m.ref}: ${m.strength.toFixed(2)}`)
    .join(", ");

  let input: string;
  if (req.event) {
    input = `ui_event: ${JSON.stringify(req.event)}`;
    if (req.detail) input += `\ndetail:\n${req.detail}`;
  } else {
    input = `learner message: ${JSON.stringify(req.message ?? "")}`;
  }

  const source = req.source_text?.trim()
    ? ["<source_text>", req.source_text.trim(), "</source_text>", ""]
    : [];

  const recent = extras.recent?.filter((r) => r.input || r.say) ?? [];

  return [
    "<context>",
    `learner_level: ${workspace.level}`,
    ...(req.topic ? [`lesson_topic: ${JSON.stringify(req.topic)}`] : []),
    "stage_blocks:",
    stage,
    `next_block_id: b${nextBlockId(workspace.blocks)}`,
    `lowest_mastery: ${lowest || "(none)"}`,
    ...(recent.length
      ? ["recent_exchanges (oldest first):", ...recent.map((r) => `- ${r.input} → you said: ${JSON.stringify(r.say)}`)]
      : []),
    "</context>",
    "",
    ...(extras.sources ? [extras.sources, ""] : []),
    ...source,
    "<input>",
    input,
    "</input>",
  ].join("\n");
}
