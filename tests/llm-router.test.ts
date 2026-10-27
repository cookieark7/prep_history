import { describe, expect, it, vi } from "vitest";
import type { StreamLine } from "@/lib/contracts";
import { BUSY_SAY, describeAttempts, streamTurn, type Attempt } from "@/lib/llm/router";
import { LlmError, type LlmProvider } from "@/lib/llm/types";

const SAY = '{"t":"say","text":"Scoped to the war."}\n';
const ADD = '{"t":"op","op":{"op":"layout","mode":"reader"}}\n';
const DONE = '{"t":"done"}\n';

/** A provider that yields `pieces`, then throws `error` if given. */
function provider(id: string, pieces: string[], error?: unknown): LlmProvider & { calls: number } {
  const p = {
    id, model: `${id}-model`, calls: 0,
    async *stream() {
      p.calls++;
      for (const x of pieces) yield x;
      if (error) throw error;
    },
  };
  return p;
}
/** Fails the first `n` calls with `error`, then answers. */
function flaky(id: string, n: number, error: unknown): LlmProvider & { calls: number } {
  const p = {
    id, model: `${id}-model`, calls: 0,
    async *stream() {
      p.calls++;
      if (p.calls <= n) throw error;
      yield SAY; yield DONE;
    },
  };
  return p;
}

async function run(chain: LlmProvider[], signal = new AbortController().signal, sleep = vi.fn(async () => {})) {
  const attempts: Attempt[] = [];
  const lines: StreamLine[] = [];
  for await (const l of streamTurn(chain, { system: "S", user: "U", signal }, { attempts, sleep, log: () => {} })) lines.push(l);
  return { lines, attempts, sleep };
}
const rateLimit = (ms?: number) => new LlmError("429", "rate_limit", 429, ms);

describe("streamTurn", () => {
  it("uses the first provider when it works", async () => {
    const a = provider("gemini", [SAY, ADD, DONE]);
    const b = provider("groq", [SAY, DONE]);
    const { lines, attempts } = await run([a, b]);
    expect(lines.map((l) => l.t)).toEqual(["say", "op", "done"]);
    expect(b.calls).toBe(0);
    expect(attempts).toMatchObject([{ provider: "gemini", outcome: "ok", lines: 3 }]);
  });

  it("falls back on a 429 before anything was sent", async () => {
    const a = provider("gemini", [], rateLimit());
    const b = provider("groq", [SAY, ADD, DONE]);
    const { lines, attempts } = await run([a, b]);
    expect(lines.map((l) => l.t)).toEqual(["say", "op", "done"]);
    expect(attempts.map((x) => [x.provider, x.outcome])).toEqual([["gemini", "rate_limit"], ["groq", "ok"]]);
    expect(describeAttempts(attempts)).toMatch(/^gemini 429 rate_limit \d+ms → groq ok 3 lines/);
  });

  it("waits once for a short Retry-After and retries the same provider", async () => {
    const a = flaky("gemini", 1, rateLimit(1200));
    const b = provider("groq", [SAY, DONE]);
    const { lines, attempts, sleep } = await run([a, b]);
    expect(sleep).toHaveBeenCalledWith(1200, expect.anything());
    expect(a.calls).toBe(2);
    expect(b.calls).toBe(0);
    expect(lines.at(-1)).toEqual({ t: "done" });
    expect(attempts.map((x) => x.outcome)).toEqual(["rate_limit", "ok"]);
  });

  it("does not wait for a long Retry-After; it falls back", async () => {
    const a = provider("gemini", [], rateLimit(34000));
    const b = provider("groq", [SAY, DONE]);
    const { sleep } = await run([a, b]);
    expect(sleep).not.toHaveBeenCalled();
    expect(b.calls).toBe(1);
  });

  it("does not switch models once a line has reached the client", async () => {
    const a = provider("gemini", [SAY, ADD], new LlmError("reset", "network"));
    const b = provider("groq", [SAY, DONE]);
    const { lines, attempts } = await run([a, b]);
    expect(b.calls).toBe(0);
    expect(lines).toEqual([{ t: "say", text: "Scoped to the war." }, { t: "op", op: { op: "layout", mode: "reader" } }, { t: "done" }]);
    expect(attempts[0]).toMatchObject({ outcome: "network", lines: 2 });
  });

  it("adds a calm say when the first model failed before its say", async () => {
    const a = provider("gemini", [ADD], new LlmError("reset", "network"));
    const { lines } = await run([a]);
    expect(lines.map((l) => l.t)).toEqual(["op", "say", "done"]);
  });

  it("treats a reply with no valid line as a failure and falls back", async () => {
    const a = provider("gemini", ["Sure! Here is a lesson about Rome.", '{"t":"say"}']);
    const b = provider("groq", [SAY, DONE]);
    const { lines, attempts } = await run([a, b]);
    expect(attempts.map((x) => [x.outcome, x.dropped])).toEqual([["empty", 1], ["ok", 0]]);
    expect(lines.map((l) => l.t)).toEqual(["say", "done"]);
  });

  it("adds the final done when a provider forgets it", async () => {
    const { lines } = await run([provider("gemini", [SAY, ADD])]);
    expect(lines.at(-1)).toEqual({ t: "done" });
  });

  it("says the model is busy when every provider is rate-limited", async () => {
    const { lines } = await run([provider("gemini", [], rateLimit()), provider("groq", [], rateLimit())]);
    expect(lines).toEqual([BUSY_SAY, { t: "done" }]);
  });

  it("gives the general error say when the providers fail in other ways", async () => {
    const { lines } = await run([provider("gemini", [], new LlmError("bad key", "auth", 401)), provider("groq", [], new Error("boom"))]);
    expect(lines).toEqual([{ t: "say", text: "Something went wrong. Please try again." }, { t: "done" }]);
  });

  it("records the attempt even when the consumer stops right after done", async () => {
    const attempts: Attempt[] = [];
    const gen = streamTurn([provider("cf", [SAY, ADD, DONE])], { system: "S", user: "U", signal: new AbortController().signal }, { attempts, log: () => {} });
    for await (const l of gen) if (l.t === "done") break; // like withCitations, which returns at done
    expect(attempts[0]).toMatchObject({ provider: "cf", outcome: "ok", lines: 3 });
  });

  it("stops quietly when the client aborts", async () => {
    const ctrl = new AbortController();
    const a: LlmProvider = {
      id: "gemini", model: "m",
      async *stream() { ctrl.abort(); throw Object.assign(new Error("aborted"), { name: "AbortError" }); },
    };
    const b = provider("groq", [SAY, DONE]);
    const { lines, attempts } = await run([a, b], ctrl.signal);
    expect(lines).toEqual([]);
    expect(b.calls).toBe(0);
    expect(attempts[0].outcome).toBe("aborted");
  });
});
