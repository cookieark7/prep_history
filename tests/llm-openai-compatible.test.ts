import { describe, expect, it, vi } from "vitest";
import { openAiCompatible } from "@/lib/llm/openai-compatible";
import { LlmError } from "@/lib/llm/types";

/** An OpenAI-style streaming body: one chat.completion.chunk per text piece, then [DONE]. */
export function sseBody(pieces: string[], { done = true } = {}) {
  const events = [
    `data: ${JSON.stringify({ object: "chat.completion.chunk", choices: [{ index: 0, delta: { role: "assistant", content: "" } }] })}\n\n`,
    ...pieces.map((p) => `data: ${JSON.stringify({ object: "chat.completion.chunk", choices: [{ index: 0, delta: { content: p } }] })}\n\n`),
    ...(done ? ["data: [DONE]\n\n"] : []),
  ];
  return new Response(events.join(""), { status: 200, headers: { "content-type": "text/event-stream" } });
}

const base = { id: "gemini", baseUrl: "https://example.test/v1beta/openai/", apiKey: "k-test", model: "flash-x", maxTokens: 900, temperature: 0.3, firstTokenTimeoutMs: 2000 };
const req = (signal = new AbortController().signal) => ({ system: "SYS", user: "USER", signal });
async function text(p: ReturnType<typeof openAiCompatible>, signal?: AbortSignal) {
  let out = "";
  for await (const d of p.stream(req(signal))) out += d;
  return out;
}
async function failure(p: ReturnType<typeof openAiCompatible>) {
  try { await text(p); } catch (e) { return e as LlmError; }
  throw new Error("expected a failure");
}

describe("openAiCompatible", () => {
  it("posts one system and one user message and streams the deltas", async () => {
    const fetch = vi.fn(async () => sseBody(['{"t":"say",', '"text":"Hi."}\n', '{"t":"done"}']));
    const p = openAiCompatible({ ...base, fetch });
    expect(await text(p)).toBe('{"t":"say","text":"Hi."}\n{"t":"done"}');

    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://example.test/v1beta/openai/chat/completions");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer k-test");
    expect(JSON.parse(init.body as string)).toEqual({
      model: "flash-x",
      messages: [{ role: "system", content: "SYS" }, { role: "user", content: "USER" }],
      stream: true, max_tokens: 900, temperature: 0.3,
    });
  });

  it("sends reasoning_effort only when set, and no Authorization without a key", async () => {
    const fetch = vi.fn(async () => sseBody(["x"]));
    await text(openAiCompatible({ ...base, apiKey: undefined, reasoningEffort: "none", fetch }));
    const init = (fetch.mock.calls[0] as unknown as [string, RequestInit])[1];
    expect(JSON.parse(init.body as string).reasoning_effort).toBe("none");
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
  });

  it("maps a 429 to rate_limit with the wait from Retry-After or from Gemini's body", async () => {
    const header = await failure(openAiCompatible({ ...base, fetch: async () => new Response("slow down", { status: 429, headers: { "retry-after": "2" } }) }));
    expect(header).toMatchObject({ kind: "rate_limit", status: 429, retryAfterMs: 2000 });

    const gemini = JSON.stringify([{ error: { code: 429, status: "RESOURCE_EXHAUSTED", details: [{ "@type": "type.googleapis.com/google.rpc.RetryInfo", retryDelay: "34s" }] } }]);
    expect(await failure(openAiCompatible({ ...base, fetch: async () => new Response(gemini, { status: 429 }) }))).toMatchObject({ kind: "rate_limit", retryAfterMs: 34000 });
  });

  it("maps other statuses", async () => {
    const kind = async (status: number) => (await failure(openAiCompatible({ ...base, fetch: async () => new Response("x", { status }) }))).kind;
    expect(await kind(401)).toBe("auth");
    expect(await kind(402)).toBe("billing");
    expect(await kind(400)).toBe("bad_request");
    expect(await kind(503)).toBe("server");
    expect(await kind(504)).toBe("timeout");
  });

  it("turns an error event inside the stream into an LlmError", async () => {
    const body = `data: ${JSON.stringify({ choices: [{ delta: { content: "{" } }] })}\n\ndata: ${JSON.stringify({ error: { message: "quota", code: 429 } })}\n\n`;
    const e = await failure(openAiCompatible({ ...base, fetch: async () => new Response(body) }));
    expect(e).toMatchObject({ kind: "rate_limit", status: 429 });
  });

  it("fails loudly when a stream sends typed pieces (a Cloudflare serving bug)", async () => {
    const body = ['{"t":"op","when":', -218, ',"to":"n2"}'].map((c) => `data: ${JSON.stringify({ choices: [{ delta: { content: c } }] })}\n\n`).join("");
    const e = await failure(openAiCompatible({ ...base, fetch: async () => new Response(body) }));
    expect(e.kind).toBe("bad_request");
    expect(e.message).toContain("typed pieces");
  });

  it("fails as empty when the response has no text", async () => {
    expect((await failure(openAiCompatible({ ...base, fetch: async () => sseBody([]) }))).kind).toBe("empty");
  });

  it("fails as network when fetch throws", async () => {
    expect((await failure(openAiCompatible({ ...base, fetch: async () => { throw new TypeError("fetch failed"); } }))).kind).toBe("network");
  });

  it("times out when no text arrives in time", async () => {
    const hang: typeof fetch = (_u, init) => new Promise((_r, reject) =>
      init!.signal!.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" }))));
    const e = await failure(openAiCompatible({ ...base, firstTokenTimeoutMs: 20, fetch: hang }));
    expect(e.kind).toBe("timeout");
  });

  it("passes the caller's abort through as an AbortError", async () => {
    const ctrl = new AbortController();
    const hang: typeof fetch = (_u, init) => new Promise((_r, reject) =>
      init!.signal!.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" }))));
    const p = text(openAiCompatible({ ...base, fetch: hang }), ctrl.signal);
    ctrl.abort();
    await expect(p).rejects.toMatchObject({ name: "AbortError" });
  });
});
