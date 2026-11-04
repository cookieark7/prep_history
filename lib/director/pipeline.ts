import { validateLine, type StreamLine } from "@/lib/contracts";
import { mendJson, repairLine } from "./repair";
import { ObjectStreamParser } from "./stream-parser";

export const ERROR_SAY: StreamLine = { t: "say", text: "Something went wrong. Please try again." };

export interface LineStats {
  /** lines forwarded (including a final "done") */
  forwarded: number;
  /** objects dropped as invalid */
  dropped: number;
  /** objects that passed only after light repair (lib/director/repair.ts) */
  repaired: number;
  said: boolean;
}
export const newLineStats = (): LineStats => ({ forwarded: 0, dropped: 0, repaired: 0, said: false });

/**
 * Text deltas in, valid stream lines out, counted in `stats`. Invalid objects are dropped and
 * logged; only the first "say" passes; it stops after a "done". Errors from the source are
 * thrown, and no closing "done" is added: callers decide (see validatedLines, lib/llm/router).
 */
export async function* validLines(
  deltas: AsyncIterable<string>,
  log: (msg: string) => void,
  stats: LineStats,
): AsyncGenerator<StreamLine> {
  const parser = new ObjectStreamParser();
  for await (const delta of deltas) {
    for (const obj of parser.push(delta)) {
      const fixed = repaired(obj);
      if (parser.closedByResync.has(obj)) fixed.fixes.unshift("closed an object the model left open");
      const r = validateLine(fixed.text);
      if (!r.ok) {
        stats.dropped++;
        log(`[turn] dropped line: ${r.reason} :: ${obj.slice(0, 200)}`);
        continue;
      }
      if (r.line.t === "sources") {
        stats.dropped++; // server-only: a model can't vouch for its own sources
        log("[turn] dropped line: the model sent a sources line");
        continue;
      }
      if (fixed.fixes.length) {
        stats.repaired++;
        log(`[turn] repaired line (${fixed.fixes.join(", ")}) :: ${obj.slice(0, 120)}`);
      }
      if (r.line.t === "say") {
        if (stats.said) continue; // exactly one say
        stats.said = true;
      }
      stats.forwarded++;
      yield r.line;
      if (r.line.t === "done") return;
    }
  }
  if (parser.pending) log(`[turn] stream ended inside an object: ${parser.pending.slice(0, 200)}`);
}

/** The object text after light repair; unparseable text is passed on for validateLine to report. */
function repaired(text: string): { text: string; fixes: string[] } {
  let value: unknown;
  const fixes: string[] = [];
  try {
    value = JSON.parse(text);
  } catch {
    const mended = mendJson(text);
    try {
      if (!mended) throw new Error("no fix");
      value = JSON.parse(mended.text);
      fixes.push(...mended.fixes);
    } catch {
      return { text, fixes: [] };
    }
  }
  const r = repairLine(value);
  fixes.push(...r.fixes);
  return fixes.length ? { text: JSON.stringify(r.value), fixes } : { text, fixes: [] };
}

/**
 * Text deltas in, validated stream lines out. Invalid objects are dropped and logged.
 * Always ends with exactly one {"t":"done"}; nothing after "done" is forwarded.
 * If the source throws, a calm "say" is forwarded (only if no say was sent yet) before "done".
 */
export async function* validatedLines(
  deltas: AsyncIterable<string>,
  log: (msg: string) => void = (m) => console.warn(m),
): AsyncGenerator<StreamLine> {
  const stats = newLineStats();
  try {
    for await (const line of validLines(deltas, log, stats)) {
      yield line;
      if (line.t === "done") return;
    }
  } catch (e) {
    if ((e as Error).name === "AbortError") return; // client went away; nothing to send
    log(`[turn] upstream error: ${(e as Error).message}`);
    if (!stats.said) yield ERROR_SAY;
  }
  yield { t: "done" };
}
