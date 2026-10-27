import type { StreamLine } from "@/lib/contracts";
import { ERROR_SAY, newLineStats, validLines } from "@/lib/director/pipeline";
import { sleep as realSleep } from "./sleep";
import { LlmError, isAbort, type LlmErrorKind, type LlmProvider, type LlmRequest } from "./types";

// The fallback policy (docs/PROTOTYPE_PLAN.md, section 4.3):
// - try the providers in order;
// - fall back only while nothing has reached the client, so a lesson never mixes two models;
// - on a rate limit with a short Retry-After (≤ 3 s), wait and retry the same provider once;
// - a provider that answers with no valid line counts as a failure ("empty").

export const BUSY_SAY: StreamLine = { t: "say", text: "The free model is busy right now. Please try again in a minute." };
const SHORT_WAIT_MS = 3000;

export interface Attempt {
  provider: string;
  model: string;
  outcome: "ok" | "aborted" | LlmErrorKind;
  status?: number;
  ms: number;
  /** ms until the first valid line reached the client */
  firstLineMs?: number;
  lines: number;
  dropped: number;
  /** lines that passed only after light repair */
  repaired: number;
  error?: string;
}

export interface TurnOptions {
  log?: (msg: string) => void;
  sleep?: (ms: number, signal?: AbortSignal) => Promise<void>;
  /** filled in as the turn runs; read it when the stream has ended */
  attempts?: Attempt[];
  now?: () => number;
}

/** Valid stream lines for one turn from the first provider that delivers. Always ends with one "done". */
export async function* streamTurn(chain: LlmProvider[], req: LlmRequest, opts: TurnOptions = {}): AsyncGenerator<StreamLine> {
  const log = opts.log ?? ((m: string) => console.warn(m));
  const sleep = opts.sleep ?? realSleep;
  const attempts = opts.attempts ?? [];
  const now = opts.now ?? Date.now;

  for (const provider of chain) {
    let retriedShortWait = false;
    for (;;) {
      const stats = newLineStats();
      const started = now();
      const attempt: Attempt = { provider: provider.id, model: provider.model, outcome: "ok", ms: 0, lines: 0, dropped: 0, repaired: 0 };
      attempts.push(attempt);
      let closed = false;
      // runs once, also when the consumer stops reading early (finally below)
      const close = () => {
        if (closed) return;
        closed = true;
        attempt.ms = now() - started; attempt.lines = stats.forwarded; attempt.dropped = stats.dropped; attempt.repaired = stats.repaired;
      };

      try {
        let done = false;
        for await (const line of validLines(provider.stream(req), log, stats)) {
          if (attempt.firstLineMs === undefined) attempt.firstLineMs = now() - started;
          if (line.t === "done") { close(); yield line; done = true; break; }
          yield line;
        }
        if (stats.forwarded === 0) throw new LlmError(`${provider.id}: no valid lines`, "empty");
        close();
        if (!done) yield { t: "done" };
        return;
      } catch (e) {
        close();
        if (isAbort(e) || req.signal.aborted) { attempt.outcome = "aborted"; return; }
        const err = e instanceof LlmError ? e : new LlmError(`${provider.id}: ${(e as Error).message}`, "server");
        attempt.outcome = err.kind;
        attempt.status = err.status;
        attempt.error = err.message;
        log(`[turn] ${provider.id} failed (${err.kind}${err.status ? ` ${err.status}` : ""}): ${err.message}`);

        if (stats.forwarded > 0) {
          // the learner already sees this model's lesson: end it calmly instead of switching
          if (!stats.said) yield ERROR_SAY;
          yield { t: "done" };
          return;
        }
        const wait = err.retryAfterMs;
        if (err.kind === "rate_limit" && !retriedShortWait && wait !== undefined && wait <= SHORT_WAIT_MS) {
          retriedShortWait = true;
          await sleep(wait, req.signal);
          if (req.signal.aborted) return;
          continue;
        }
        break; // next provider
      } finally {
        close();
      }
    }
  }

  yield attempts.length > 0 && attempts.every((a) => a.outcome === "rate_limit") ? BUSY_SAY : ERROR_SAY;
  yield { t: "done" };
}

/** One log line per turn: "gemini 429 rate_limit 812ms → groq ok 9 lines 2400ms". */
export function describeAttempts(attempts: Attempt[]): string {
  return attempts
    .map((a) => [
      a.provider,
      a.status,
      a.outcome,
      a.outcome === "ok" ? `${a.lines} lines${a.dropped ? `, ${a.dropped} dropped` : ""}${a.repaired ? `, ${a.repaired} repaired` : ""}` : undefined,
      a.firstLineMs !== undefined ? `first line ${a.firstLineMs}ms` : undefined,
      `${a.ms}ms`,
    ].filter((x) => x !== undefined && x !== "").join(" "))
    .join(" → ");
}
