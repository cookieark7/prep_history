/**
 * Run the golden turns (tests/evals/cases.ts) through the real provider chain and write a report
 * (docs/PROTOTYPE_PLAN.md, section 5.5). Reads .env.local the way Next does ($VAR references work).
 *
 *   npx tsx scripts/eval.ts                       # LLM_CHAIN from .env.local
 *   npx tsx scripts/eval.ts --chain cf --delay 30
 *   npx tsx scripts/eval.ts --only punic-why,quiz --out /tmp/trial
 *   npx tsx scripts/eval.ts --chain cf --model @cf/qwen/qwen3.8-27b --effort low   # try another model
 *
 * Writes <out>/<date>-<prompt version>-<chain>.md (default out: docs/evals), and the raw lines and
 * logs per case to scripts/eval-output/<chain>/ (git-ignored). Free tiers have small per-minute
 * limits: --delay (seconds, default 8) spaces the turns out.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { loadEnvConfig } from "@next/env";
import type { Block, StreamLine } from "../lib/contracts";
import { nextBlockId } from "../lib/director/context";
import { prepareTurn } from "../lib/director/turn";
import { getDb } from "../lib/db/client";
import { withCitations } from "../lib/rag/citations";
import { getEmbedder } from "../lib/rag/embed";
import { buildChain, describeChain, readLlmConfig } from "../lib/llm/config";
import { streamTurn, type Attempt } from "../lib/llm/router";
import { sleep } from "../lib/llm/sleep";
import { DIRECTOR_SYSTEM_PROMPT, PROMPT_VERSION } from "../lib/prompts/director";
import { EVAL_CASES, type EvalCase } from "../tests/evals/cases";

const args = parseArgs(process.argv.slice(2));
loadEnvConfig(process.cwd(), true, { info: () => {}, error: console.error });
if (args.chain) process.env.LLM_CHAIN = args.chain;
// --model / --effort override the first provider in the chain, to try a model without new config
const first = (process.env.LLM_CHAIN ?? "").split(",")[0]?.trim().toUpperCase();
if (first && args.model) process.env[`LLM_${first}_MODEL`] = args.model;
if (first && args.effort) process.env[`LLM_${first}_REASONING_EFFORT`] = args.effort;
if (args.chain !== "mock") delete process.env.MOCK_LLM; // evals are about real models
const config = readLlmConfig();
if (!config.ok) {
  console.error(config.error);
  process.exit(1);
}
const delayMs = Number(args.delay ?? 8) * 1000;
const cases = args.only ? EVAL_CASES.filter((c) => args.only!.split(",").includes(c.id)) : EVAL_CASES;
const chainIds = config.chain.map((p) => p.id).join("+");
const RAW = path.join(process.cwd(), "scripts", "eval-output", chainIds);
mkdirSync(RAW, { recursive: true });

interface Check { name: string; pass: boolean; note?: string }
interface Result { c: EvalCase; lines: StreamLine[]; attempts: Attempt[]; checks: Check[]; firstLineMs?: number; totalMs: number; logs: string[]; sources: number; cited: number; removed: number }

async function runCase(c: EvalCase): Promise<Result> {
  const attempts: Attempt[] = [];
  const lines: StreamLine[] = [];
  const logs: string[] = [];
  const started = Date.now();
  let firstLineMs: number | undefined;
  const signal = AbortSignal.timeout(180_000);
  // the same preparation as /api/turn: retrieved passages and citations when the database is set up
  const prep = await prepareTurn(c.req, { db: getDb(), embedder: getEmbedder(), signal });
  // keep each provider's raw text too, to see exactly how dropped lines went wrong
  const raw: string[] = [];
  const chain = buildChain(config.ok ? config.chain : [], c.req).map((p) => ({
    ...p,
    async *stream(r: Parameters<typeof p.stream>[0]) {
      raw.push(`----- ${p.id} (${p.model})\n`);
      for await (const d of p.stream(r)) { raw.push(d); yield d; }
    },
  }));
  const routed = streamTurn(chain, { system: DIRECTOR_SYSTEM_PROMPT, user: prep.context, signal }, { attempts, log: (m) => logs.push(m) });
  for await (const line of prep.citations ? withCitations(routed, prep.citations) : routed) {
    firstLineMs ??= Date.now() - started;
    lines.push(line);
  }
  const totalMs = Date.now() - started;
  writeFileSync(path.join(RAW, `${c.id}.ndjson`), lines.map((l) => JSON.stringify(l)).join("\n") + "\n");
  writeFileSync(path.join(RAW, `${c.id}.raw.txt`), raw.join(""));
  writeFileSync(path.join(RAW, `${c.id}.log`), [...logs, ...attempts.map((a) => JSON.stringify(a))].join("\n") + "\n");
  const cites = prep.citations?.stats ?? { cited: 0, removed: 0 };
  const checks = checksFor(c, lines, attempts);
  const addsArticle = lines.some((l) => l.t === "op" && l.op.op === "add" && l.op.block.type === "article");
  if (prep.sources.length && addsArticle) checks.push({ name: "cites the sources", pass: cites.cited > 0, note: `${cites.cited} cited, ${cites.removed} removed` });
  return { c, lines, attempts, checks, firstLineMs, totalMs, logs, sources: prep.sources.length, cited: cites.cited, removed: cites.removed };
}

function checksFor(c: EvalCase, lines: StreamLine[], attempts: Attempt[]): Check[] {
  const stage = c.req.workspace.blocks;
  const ok = attempts.find((a) => a.outcome === "ok");
  const says = lines.filter((l) => l.t === "say");
  const ops = lines.flatMap((l) => (l.t === "op" ? [l.op] : []));
  const adds: Block[] = ops.flatMap((o) => (o.op === "add" ? [o.block] : []));
  const next = nextBlockId(stage);
  const sentences = (s: string) => s.split(/(?<=[.?!])\s+/).filter((x) => x.trim()).length;
  const checks: Check[] = [
    { name: "a provider answered", pass: !!ok, note: attempts.map((a) => `${a.provider}:${a.outcome}`).join(" → ") },
    { name: "no dropped lines", pass: !!ok && ok.dropped === 0, note: ok?.dropped ? `${ok.dropped} dropped` : undefined },
    { name: "say first, exactly once", pass: lines[0]?.t === "say" && says.length === 1 },
    { name: "say ≤ 2 sentences", pass: says.every((s) => s.t === "say" && sentences(s.text) <= 2), note: says[0]?.t === "say" ? says[0].text : undefined },
    { name: "done last", pass: lines.at(-1)?.t === "done" },
    { name: "≤ 3 followups", pass: lines.filter((l) => l.t === "followup").length <= 3 },
    // an exam lesson has up to five parts (lib/prompts/director/goals.ts)
    { name: `≤ ${c.req.workspace.goal === "exam" ? 5 : 4} blocks added`, pass: adds.length <= (c.req.workspace.goal === "exam" ? 5 : 4), note: adds.map((b) => b.type).join(", ") || undefined },
    { name: `new ids from b${next}`, pass: adds.every((b) => Number(b.id.slice(1)) >= next), note: adds.map((b) => b.id).join(", ") || undefined },
    { name: "articles add the brief section only", pass: adds.every((b) => b.type !== "article" || b.sections.length === 1) },
  ];
  const e = c.expect;
  if (e?.anyType) checks.push({ name: `adds one of: ${e.anyType.join(", ")}`, pass: adds.some((b) => e.anyType!.includes(b.type)) });
  if (e?.allTypes) checks.push({ name: `adds all of: ${e.allTypes.join(", ")}`, pass: e.allTypes.every((t) => adds.some((b) => b.type === t)) });
  if (e?.layout) checks.push({ name: `layout ${e.layout}`, pass: ops.some((o) => o.op === "layout" && o.mode === e.layout) });
  if (e?.someOp) checks.push({ name: "changes the stage", pass: ops.some((o) => o.op === "add" || o.op === "patch") });
  if (e?.noRestart) {
    checks.push({ name: "no restart", pass: !ops.some((o) => o.op === "remove") && !ops.some((o) => o.op === "add" && o.after === null && stage.length > 0) });
  }
  if (e?.maxNodes) {
    const big = adds.find((b) => b.type === "cause_graph" && b.nodes.length > e.maxNodes!);
    checks.push({ name: `cause map ≤ ${e.maxNodes} nodes`, pass: !big, note: big?.type === "cause_graph" ? `${big.nodes.length} nodes` : undefined });
  }
  if (e?.mentions) checks.push({ name: `mentions ${e.mentions.source}`, pass: e.mentions.test(JSON.stringify(ops)) });
  return checks;
}

async function main() {
  if (!config.ok) return;
  const chainLabel = describeChain(config.chain);
  console.log(`eval · ${PROMPT_VERSION} · ${chainLabel} · ${cases.length} cases · ${delayMs / 1000}s apart\n`);
  const results: Result[] = [];
  for (const [i, c] of cases.entries()) {
    if (i > 0) await sleep(delayMs);
    const r = await runCase(c);
    results.push(r);
    const failed = r.checks.filter((k) => !k.pass);
    console.log(`${failed.length ? "✗" : "✓"} ${c.id.padEnd(18)} ${r.attempts.map((a) => `${a.provider}:${a.outcome}`).join("→").padEnd(26)} ${String(r.totalMs).padStart(6)}ms  ${failed.map((k) => k.name).join("; ")}`);
  }
  const file = writeReport(results, chainLabel);
  console.log(`\nreport: ${path.relative(process.cwd(), file)}`);
  process.exit(0); // the database pool would otherwise keep the process alive
}

function writeReport(results: Result[], chainLabel: string): string {
  const okAttempts = results.flatMap((r) => r.attempts.filter((a) => a.outcome === "ok"));
  const byProvider = new Map<string, { lines: number; dropped: number; repaired: number; turns: number }>();
  for (const a of okAttempts) {
    const p = byProvider.get(a.provider) ?? { lines: 0, dropped: 0, repaired: 0, turns: 0 };
    p.lines += a.lines; p.dropped += a.dropped; p.repaired += a.repaired; p.turns++;
    byProvider.set(a.provider, p);
  }
  const median = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : NaN; };
  const passed = results.filter((r) => r.checks.every((k) => k.pass)).length;
  const fallbacks = results.filter((r) => r.attempts.length > 1).length;
  const date = new Date().toLocaleDateString("en-CA"); // local YYYY-MM-DD

  const out = [
    `# Eval ${date} · ${PROMPT_VERSION} · ${chainIds}`,
    "",
    `Chain: ${chainLabel}. Cases: ${results.length}, ${delayMs / 1000}s apart. Made by \`scripts/eval.ts\`.`,
    "",
    `- **Cases passing every check:** ${passed} of ${results.length}`,
    ...[...byProvider].map(([p, s]) => `- **Valid line rate, ${p}:** ${pct(s.lines, s.lines + s.dropped)} (${s.lines} valid, of which ${s.repaired} repaired; ${s.dropped} dropped; over ${s.turns} turns)`),
    `- **Turns that fell back:** ${fallbacks}`,
    `- **Retrieval:** ${results.filter((r) => r.sources).length} of ${results.length} turns had sources; ${results.reduce((n, r) => n + r.cited, 0)} citations kept, ${results.reduce((n, r) => n + r.removed, 0)} removed (unknown ids or outside markdown)`,
    `- **Median time to first line:** ${median(results.flatMap((r) => (r.firstLineMs !== undefined ? [r.firstLineMs] : [])))} ms; **median turn:** ${median(results.map((r) => r.totalMs))} ms`,
    "",
    "| Case | Kind | Served by | Lines | Repaired | Dropped | Sources | Cited | First line | Total | Failed checks |",
    "|---|---|---|---|---|---|---|---|---|---|---|",
    ...results.map((r) => {
      const ok = r.attempts.find((a) => a.outcome === "ok");
      const failed = r.checks.filter((k) => !k.pass).map((k) => k.name).join("; ");
      const served = r.attempts.map((a) => (a.outcome === "ok" ? a.provider : `${a.provider} (${a.outcome})`)).join(" → ");
      return `| ${r.c.id} | ${r.c.label} | ${served} | ${ok?.lines ?? 0} | ${ok?.repaired ?? 0} | ${ok?.dropped ?? 0} | ${r.sources} | ${r.cited} | ${r.firstLineMs ?? "-"} ms | ${r.totalMs} ms | ${failed || "none"} |`;
    }),
    "",
    "## Details of failed checks",
    "",
    ...results.flatMap((r) => {
      const failed = r.checks.filter((k) => !k.pass);
      if (!failed.length) return [];
      return [`**${r.c.id}**`, "", ...failed.map((k) => `- ${k.name}${k.note ? `: ${k.note.replace(/\n/g, " ")}` : ""}`), ...r.logs.slice(0, 5).map((l) => `- log: \`${l.slice(0, 220).replace(/`/g, "'")}\``), ""];
    }),
  ];
  const dir = args.out ? path.resolve(args.out) : path.join(process.cwd(), "docs", "evals");
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${date}-${PROMPT_VERSION}-${chainIds}.md`);
  writeFileSync(file, out.join("\n") + "\n");
  return file;
}

function pct(a: number, b: number) {
  return b ? `${((a / b) * 100).toFixed(1)}%` : "n/a";
}

function parseArgs(argv: string[]) {
  const out: { chain?: string; delay?: string; only?: string; out?: string; model?: string; effort?: string } = {};
  const keys = ["chain", "delay", "only", "out", "model", "effort"] as const;
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i].replace(/^--/, "") as (typeof keys)[number];
    if (keys.includes(k)) out[k] = argv[++i];
  }
  return out;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
