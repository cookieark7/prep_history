/**
 * M1: run the Director prompt on the five test turns from the build pack and check the
 * output. Needs ANTHROPIC_API_KEY and CHRONICLE_MODEL.
 *
 *   npx tsx scripts/m1-director-test.ts            # all five turns
 *   npx tsx scripts/m1-director-test.ts 3          # just turn 3
 *
 * Raw outputs are written to scripts/m1-output/turn-N.ndjson for eyeballing against the
 * calibration sample.
 */
import Anthropic from "@anthropic-ai/sdk";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { validateLine, type StreamLine, type TurnRequest, type Block } from "../lib/contracts";
import { DIRECTOR_SYSTEM_PROMPT } from "../lib/director/system-prompt";
import { buildContext, nextBlockId } from "../lib/director/context";
import { ObjectStreamParser } from "../lib/director/stream-parser";

type Summary = { id: string; type: string; title: string };
type Check = { name: string; pass: boolean; note?: string };

const model = process.env.CHRONICLE_MODEL;
if (!process.env.ANTHROPIC_API_KEY || !model) {
  console.error("Set ANTHROPIC_API_KEY and CHRONICLE_MODEL first.");
  process.exit(1);
}
const client = new Anthropic();
const OUT = path.join(process.cwd(), "scripts", "m1-output");
mkdirSync(OUT, { recursive: true });

const romeStage: Summary[] = [];
const mughalStage: Summary[] = [
  { id: "b1", type: "article", title: "The Mughal Empire at its height" },
  { id: "b2", type: "timeline", title: "Mughal emperors, 1526-1707" },
];

async function runTurn(n: number, req: TurnRequest) {
  const ctx = buildContext(req);
  const parser = new ObjectStreamParser();
  const lines: StreamLine[] = [];
  const invalid: string[] = [];
  let raw = "";

  const stream = client.messages.stream({
    model: model!,
    max_tokens: 6000,
    temperature: 0.3,
    system: [{ type: "text", text: DIRECTOR_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: ctx }],
  });
  for await (const ev of stream) {
    if (ev.type === "content_block_delta" && ev.delta.type === "text_delta") {
      raw += ev.delta.text;
      for (const obj of parser.push(ev.delta.text)) {
        const r = validateLine(obj);
        if (r.ok) lines.push(r.line);
        else invalid.push(`${r.reason} :: ${obj.slice(0, 160)}`);
      }
    }
  }
  writeFileSync(path.join(OUT, `turn-${n}.ndjson`), raw);
  return { lines, invalid, raw };
}

function sentences(s: string) {
  return s.split(/(?<=[.?!])\s+/).filter((x) => x.trim()).length;
}

function commonChecks(lines: StreamLine[], invalid: string[], stage: Summary[]): Check[] {
  const say = lines.filter((l) => l.t === "say");
  const adds = lines.flatMap((l) => (l.t === "op" && l.op.op === "add" ? [l.op.block] : []));
  const next = nextBlockId(stage);
  return [
    { name: "all lines valid", pass: invalid.length === 0, note: invalid.join("\n      ") || undefined },
    { name: "say first, exactly once", pass: lines[0]?.t === "say" && say.length === 1 },
    { name: "done last", pass: lines.at(-1)?.t === "done" },
    { name: "say <= 2 sentences", pass: say.every((s) => s.t === "say" && sentences(s.text) <= 2), note: say[0]?.t === "say" ? say[0].text : undefined },
    { name: "<= 3 followups", pass: lines.filter((l) => l.t === "followup").length <= 3 },
    {
      name: `new ids start at b${next}`,
      pass: adds.every((b) => Number(b.id.slice(1)) >= next),
      note: adds.map((b) => b.id).join(", "),
    },
    {
      name: "no re-add of a block already on stage",
      pass: adds.every((b) => !stage.some((s) => s.type === b.type && s.title === b.title)),
    },
  ];
}

function apply(stage: Summary[], lines: StreamLine[]): Summary[] {
  let s = [...stage];
  for (const l of lines) {
    if (l.t !== "op") continue;
    if (l.op.op === "add") s.push({ id: l.op.block.id, type: l.op.block.type, title: l.op.block.title });
    if (l.op.op === "remove") { const id = l.op.id; s = s.filter((b) => b.id !== id); }
  }
  return s;
}

const addsOf = (lines: StreamLine[]): Block[] =>
  lines.flatMap((l) => (l.t === "op" && l.op.op === "add" ? [l.op.block] : []));
const req = (stage: Summary[], message: string | null, event: TurnRequest["event"] = null): TurnRequest => ({
  message, event, workspace: { blocks: stage, level: "some", mastery: [] },
});

const turns: Record<number, () => Promise<Check[]>> = {
  1: async () => {
    const { lines, invalid } = await runTurn(1, req(romeStage, "I want to understand the fall of the Western Roman Empire."));
    const adds = addsOf(lines);
    const graph = adds.find((b) => b.type === "cause_graph");
    const layers = graph?.type === "cause_graph" ? new Set(graph.nodes.map((n) => n.layer)) : new Set();
    const contested = JSON.stringify(adds).match(/\[C\]|"confidence":"C"/g)?.length ?? 0;
    romeStage.push(...apply([], lines));
    return [
      ...commonChecks(lines, invalid, []),
      { name: "3 to 4 blocks", pass: adds.length >= 3 && adds.length <= 4, note: adds.map((b) => b.type).join(", ") },
      { name: "cause graph with >= 3 layers", pass: layers.size >= 3, note: [...layers].join(", ") },
      { name: "at least one contested point", pass: contested > 0, note: `${contested} contested tags` },
    ];
  },
  2: async () => {
    const { lines, invalid } = await runTurn(2, req(mughalStage, "Why did the Mughal empire decline?"));
    const ops = lines.flatMap((l) => (l.t === "op" ? [l.op] : []));
    const restarted = ops.some((o) => o.op === "remove") || ops.some((o) => o.op === "add" && o.after === null);
    const before = [...mughalStage];
    mughalStage.splice(0, mughalStage.length, ...apply(mughalStage, lines));
    return [
      ...commonChecks(lines, invalid, before),
      { name: "patch or add next to existing, not a restart", pass: ops.length > 0 && !restarted, note: ops.map((o) => o.op + ("after" in o ? `(after ${o.after})` : "id" in o ? `(${o.id})` : "")).join(", ") },
    ];
  },
  3: async () => {
    const before = [...mughalStage];
    const { lines, invalid } = await runTurn(3, req(before, "Who succeeded Akbar, and how did the succession go?"));
    const adds = addsOf(lines);
    const lineage = adds.find((b) => b.type === "lineage");
    const uncertain = lineage?.type === "lineage" && lineage.links.some((l) => l.confidence !== "E");
    const timelineTouched = adds.some((b) => b.type === "timeline") ||
      lines.some((l) => l.t === "op" && l.op.op === "patch" && before.find((b) => b.id === (l.op as { id: string }).id)?.type === "timeline");
    mughalStage.splice(0, mughalStage.length, ...apply(mughalStage, lines));
    return [
      ...commonChecks(lines, invalid, before),
      { name: "adds a lineage block", pass: !!lineage },
      { name: "adds (or patches) a timeline", pass: timelineTouched },
      { name: "uncertain links marked L or C", pass: !!uncertain },
    ];
  },
  4: async () => {
    const before = [...mughalStage];
    const { lines, invalid } = await runTurn(4, req(before, "Quiz me on what we covered."));
    const focus = lines.some((l) => l.t === "op" && l.op.op === "layout" && l.op.mode === "focus");
    const quiz = addsOf(lines).find((b) => b.type === "quiz");
    const ids = new Set(before.map((b) => b.id));
    const refsOk = quiz?.type === "quiz" && quiz.items.every((i) => ids.has(i.source_ref.block));
    const firstKind = quiz?.type === "quiz" ? quiz.items[0].kind : undefined;
    return [
      ...commonChecks(lines, invalid, before),
      { name: "layout focus", pass: focus },
      { name: "adds a quiz", pass: !!quiz, note: quiz?.type === "quiz" ? quiz.items.map((i) => i.kind).join(", ") : undefined },
      { name: "source_ref points at existing blocks", pass: !!refsOk },
      { name: "relation question first (not raw date recall)", pass: firstKind === "mcq" || firstKind === "match", note: "heuristic; read the stems in turn-4.ndjson" },
    ];
  },
  5: async () => {
    const stage = romeStage.length ? romeStage : [{ id: "b1", type: "article", title: "How the Western Roman Empire fell" }];
    const article = stage.find((b) => b.type === "article") ?? stage[0];
    const { lines, invalid } = await runTurn(5, req(stage, null, {
      event: "note_created", block_id: article.id, kind: "disagree",
      text: "I don't think Rome fell mainly because of barbarian invasions.",
      quote: "barbarian invasions",
    }));
    const debate = addsOf(lines).find((b) => b.type === "callout" && b.kind === "debate");
    return [
      ...commonChecks(lines, invalid, stage),
      { name: "adds a debate callout", pass: !!debate, note: debate?.type === "callout" ? debate.md : undefined },
    ];
  },
};

async function main() {
  const only = process.argv[2] ? [Number(process.argv[2])] : [1, 2, 3, 4, 5];
  let failed = 0;
  for (const n of only) {
    process.stdout.write(`\nTurn ${n}\n`);
    try {
      const checks = await turns[n]();
      for (const c of checks) {
        if (!c.pass) failed++;
        console.log(`  ${c.pass ? "PASS" : "FAIL"}  ${c.name}${c.note ? `\n      ${c.note}` : ""}`);
      }
    } catch (e) {
      failed++;
      console.log(`  ERROR ${(e as Error).message}`);
    }
  }
  console.log(`\n${failed ? `${failed} check(s) failed` : "All checks passed"}. Raw output in scripts/m1-output/.`);
  process.exit(failed ? 1 : 0);
}

main();
