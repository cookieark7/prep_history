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

/** The dynamic part of each turn (Part 4 context template). The system prompt stays static. */
export function buildContext(req: TurnRequest): string {
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

  return [
    "<context>",
    `learner_level: ${workspace.level}`,
    "stage_blocks:",
    stage,
    `next_block_id: b${nextBlockId(workspace.blocks)}`,
    `lowest_mastery: ${lowest || "(none)"}`,
    "</context>",
    "",
    ...source,
    "<input>",
    input,
    "</input>",
  ].join("\n");
}
