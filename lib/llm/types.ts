// The LLM layer (docs/PROTOTYPE_PLAN.md, section 4). A provider turns a system prompt and one
// user message into a stream of text deltas; the Director pipeline does everything else.

export interface LlmRequest {
  /** static and cacheable (lib/prompts/director) */
  system: string;
  /** the per-turn context (lib/director/context.ts) */
  user: string;
  signal: AbortSignal;
}

export interface LlmProvider {
  /** the chain name from env, e.g. "gemini", "groq", "anthropic", "mock" */
  id: string;
  model: string;
  stream(req: LlmRequest): AsyncIterable<string>;
}

export type LlmErrorKind = "rate_limit" | "billing" | "server" | "timeout" | "auth" | "bad_request" | "network" | "empty";

/** A provider failure the router can act on. Aborts by the caller stay plain AbortErrors. */
export class LlmError extends Error {
  constructor(
    message: string,
    readonly kind: LlmErrorKind,
    readonly status?: number,
    readonly retryAfterMs?: number,
  ) {
    super(message);
    this.name = "LlmError";
  }
}

export function errorKindForStatus(status: number): LlmErrorKind {
  if (status === 429) return "rate_limit";
  if (status === 402) return "billing"; // out of credits (Gemini prepay, OpenRouter balance)
  if (status === 401 || status === 403) return "auth";
  if (status === 408 || status === 504) return "timeout";
  if (status >= 500) return "server";
  return "bad_request";
}

/** Retry-After as seconds or an HTTP date, in ms; undefined when absent or unreadable. */
export function parseRetryAfter(value: string | null, now = Date.now()): number | undefined {
  if (!value) return undefined;
  const secs = Number(value);
  if (Number.isFinite(secs)) return Math.max(0, secs * 1000);
  const at = Date.parse(value);
  return Number.isNaN(at) ? undefined : Math.max(0, at - now);
}

export const isAbort = (e: unknown) => (e as Error)?.name === "AbortError";
