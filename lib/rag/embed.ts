// Embeddings for the knowledge base (docs/PROTOTYPE_PLAN.md, section 6). One adapter for any
// OpenAI-compatible /embeddings endpoint (Cloudflare Workers AI, Gemini, Ollama, OpenAI), and a
// deterministic fake for tests. The corpus and the queries must use the same model; chunks
// record theirs, and retrieval only compares vectors of the current model.

import { EMBED_DIM } from "@/lib/db/schema";

export interface Embedder {
  model: string;
  dim: number;
  embed(texts: string[], signal?: AbortSignal): Promise<number[][]>;
}

type Env = Record<string, string | undefined>;

/** The configured embedder, or null when retrieval is off (no EMBED_* settings). */
export function getEmbedder(env: Env = process.env): Embedder | null {
  if (env.EMBED_PROVIDER === "fake") return fakeEmbedder();
  const { EMBED_BASE_URL: baseUrl, EMBED_API_KEY: apiKey, EMBED_MODEL: model } = env;
  if (!baseUrl || !model) return null;
  return openAiCompatibleEmbedder({ baseUrl, apiKey, model, dim: Number(env.EMBED_DIM) || EMBED_DIM });
}

export function openAiCompatibleEmbedder(o: { baseUrl: string; apiKey?: string; model: string; dim: number; batch?: number; fetch?: typeof fetch }): Embedder {
  const url = `${o.baseUrl.replace(/\/+$/, "")}/embeddings`;
  const doFetch = o.fetch ?? fetch;
  const batch = o.batch ?? 32;
  return {
    model: o.model,
    dim: o.dim,
    async embed(texts, signal) {
      const out: number[][] = [];
      for (let i = 0; i < texts.length; i += batch) {
        const res = await doFetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(o.apiKey ? { Authorization: `Bearer ${o.apiKey}` } : {}) },
          body: JSON.stringify({ model: o.model, input: texts.slice(i, i + batch) }),
          signal: signal ?? AbortSignal.timeout(30_000),
        });
        if (!res.ok) throw new Error(`embeddings ${res.status}: ${(await res.text()).slice(0, 200)}`);
        const data = ((await res.json()) as { data: { embedding: number[]; index?: number }[] }).data;
        const sorted = [...data].sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
        for (const d of sorted) {
          if (d.embedding.length !== o.dim) throw new Error(`embeddings: expected ${o.dim} dimensions, got ${d.embedding.length}`);
          out.push(d.embedding);
        }
      }
      return out;
    },
  };
}

/**
 * Tests only: hashed bag of words, normalised. Texts that share words get similar vectors,
 * which is enough to check retrieval without a network.
 */
export function fakeEmbedder(dim = EMBED_DIM): Embedder {
  return {
    model: "fake-bow",
    dim,
    async embed(texts) {
      return texts.map((t) => {
        const v = new Array<number>(dim).fill(0);
        for (const w of t.toLowerCase().match(/[a-z0-9]{3,}/g) ?? []) {
          let h = 2166136261;
          for (let i = 0; i < w.length; i++) h = Math.imul(h ^ w.charCodeAt(i), 16777619);
          v[(h >>> 0) % dim] += 1;
        }
        const n = Math.hypot(...v) || 1;
        return v.map((x) => x / n);
      });
    },
  };
}
