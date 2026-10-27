import { sseData } from "./sse";
import { LlmError, errorKindForStatus, isAbort, parseRetryAfter, type LlmProvider } from "./types";

// One adapter for every provider that speaks the OpenAI Chat Completions API: Gemini (its
// OpenAI-compatible endpoint), Groq, OpenRouter, Ollama, Cerebras, Cloudflare Workers AI.

export interface OpenAiCompatibleOptions {
  id: string;
  baseUrl: string;
  apiKey?: string;
  model: string;
  maxTokens: number;
  temperature: number;
  /** sent as `reasoning_effort` only when set (Gemini thinking models, gpt-oss); some models reject it */
  reasoningEffort?: string;
  /** give up (and let the router fall back) when no text has arrived by then */
  firstTokenTimeoutMs: number;
  fetch?: typeof fetch;
}

export function openAiCompatible(o: OpenAiCompatibleOptions): LlmProvider {
  const url = `${o.baseUrl.replace(/\/+$/, "")}/chat/completions`;
  const doFetch = o.fetch ?? fetch;

  return {
    id: o.id,
    model: o.model,
    async *stream({ system, user, signal }) {
      const timer = new AbortController();
      const t = setTimeout(() => timer.abort(), o.firstTokenTimeoutMs);
      const both = AbortSignal.any([signal, timer.signal]);
      const timedOut = () => !signal.aborted && timer.signal.aborted;
      const timeoutError = () => new LlmError(`${o.id}: no text within ${Math.round(o.firstTokenTimeoutMs / 1000)}s`, "timeout");

      try {
        let res: Response;
        try {
          res = await doFetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(o.apiKey ? { Authorization: `Bearer ${o.apiKey}` } : {}),
            },
            body: JSON.stringify({
              model: o.model,
              messages: [
                { role: "system", content: system },
                { role: "user", content: user },
              ],
              stream: true,
              max_tokens: o.maxTokens,
              temperature: o.temperature,
              ...(o.reasoningEffort ? { reasoning_effort: o.reasoningEffort } : {}),
            }),
            signal: both,
          });
        } catch (e) {
          if (timedOut()) throw timeoutError();
          if (isAbort(e)) throw e;
          throw new LlmError(`${o.id}: ${(e as Error).message}`, "network");
        }

        if (!res.ok || !res.body) {
          const text = (await res.text().catch(() => "")).slice(0, 600);
          // Gemini puts the wait in the body ("retryDelay": "34s") rather than a header
          const bodyDelay = /"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/.exec(text)?.[1];
          const retryAfterMs = parseRetryAfter(res.headers.get("retry-after")) ??
            (bodyDelay ? Number(bodyDelay) * 1000 : undefined);
          throw new LlmError(`${o.id} ${res.status}: ${oneLine(text) || res.statusText}`, errorKindForStatus(res.status), res.status, retryAfterMs);
        }

        let gotText = false;
        try {
          for await (const payload of sseData(res.body)) {
            let chunk: StreamChunk;
            try {
              chunk = JSON.parse(payload) as StreamChunk;
            } catch {
              continue; // keep-alives and junk
            }
            if (chunk.error) {
              const status = Number(chunk.error.code) || undefined;
              throw new LlmError(`${o.id}: ${chunk.error.message ?? "stream error"}`, status ? errorKindForStatus(status) : "server", status);
            }
            const text = chunk.choices?.[0]?.delta?.content;
            if (typeof text === "number" || typeof text === "boolean") {
              // Some Cloudflare models stream pieces decoded as JSON values ("218" arrives as 218,
              // '":"' arrives as ':'), which corrupts any JSON the model writes. Fail loudly.
              throw new LlmError(`${o.id}: the stream sends typed pieces instead of text, so its JSON is unreliable; pick another model`, "bad_request");
            }
            if (typeof text === "string" && text) {
              if (!gotText) { gotText = true; clearTimeout(t); }
              yield text;
            }
          }
        } catch (e) {
          if (timedOut()) throw timeoutError();
          throw e;
        }
        if (!gotText) throw new LlmError(`${o.id}: the response had no text`, "empty");
      } finally {
        clearTimeout(t);
      }
    },
  };
}

interface StreamChunk {
  choices?: { delta?: { content?: string | null } }[];
  error?: { message?: string; code?: number | string };
}

const oneLine = (s: string) => s.replace(/\s+/g, " ").trim().slice(0, 300);
