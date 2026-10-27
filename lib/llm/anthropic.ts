import Anthropic from "@anthropic-ai/sdk";
import { LlmError, errorKindForStatus, isAbort, parseRetryAfter, type LlmProvider } from "./types";

// The original v0 path, moved here from app/api/turn/route.ts. The system prompt is marked for
// prompt caching because it is identical on every turn.

export function anthropicProvider(o: { id: string; model: string; maxTokens: number; temperature: number }): LlmProvider {
  return {
    id: o.id,
    model: o.model,
    async *stream({ system, user, signal }) {
      const client = new Anthropic();
      try {
        const stream = client.messages.stream(
          {
            model: o.model,
            max_tokens: o.maxTokens,
            temperature: o.temperature,
            system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
            messages: [{ role: "user", content: user }],
          },
          { signal },
        );
        for await (const ev of stream) {
          if (ev.type === "content_block_delta" && ev.delta.type === "text_delta") yield ev.delta.text;
        }
      } catch (e) {
        if (isAbort(e) || signal.aborted) throw e;
        const status = (e as { status?: number }).status;
        const headers = (e as { headers?: { get?: (k: string) => string | null } }).headers;
        if (typeof status === "number") {
          throw new LlmError(`${o.id} ${status}: ${(e as Error).message}`, errorKindForStatus(status), status, parseRetryAfter(headers?.get?.("retry-after") ?? null));
        }
        throw new LlmError(`${o.id}: ${(e as Error).message}`, "network");
      }
    },
  };
}
