import type { TurnRequest } from "@/lib/contracts";
import { anthropicProvider } from "./anthropic";
import { mockProvider } from "./mock";
import { openAiCompatible } from "./openai-compatible";
import type { LlmProvider } from "./types";

// Which providers to call, in order, read from env (docs/PROTOTYPE_PLAN.md, section 4.4):
//
//   LLM_CHAIN=gemini,groq
//   LLM_GEMINI_BASE_URL=…   LLM_GEMINI_API_KEY=…   LLM_GEMINI_MODEL=…
//   optional per name: _MAX_TOKENS (6000), _TEMPERATURE (0.3), _REASONING_EFFORT, _FIRST_TOKEN_TIMEOUT_MS (45000)
//
// "anthropic" in the chain uses ANTHROPIC_API_KEY and LLM_ANTHROPIC_MODEL (or CHRONICLE_MODEL).
// Without LLM_CHAIN, ANTHROPIC_API_KEY + CHRONICLE_MODEL still work as before. MOCK_LLM=1 wins over all.

type Env = Record<string, string | undefined>;

interface Common { id: string; model: string; maxTokens: number; temperature: number }
export type ProviderConfig =
  | { kind: "mock"; id: "mock"; model: "fixtures" }
  | (Common & { kind: "anthropic" })
  | (Common & { kind: "openai-compatible"; baseUrl: string; apiKey?: string; reasoningEffort?: string; firstTokenTimeoutMs: number });

export type LlmConfig = { ok: true; chain: ProviderConfig[] } | { ok: false; error: string };

const NAME = /^[a-z][a-z0-9_]*$/;

export function readLlmConfig(env: Env = process.env): LlmConfig {
  if (env.MOCK_LLM === "1") return { ok: true, chain: [{ kind: "mock", id: "mock", model: "fixtures" }] };

  const chainVar = env.LLM_CHAIN?.trim();
  if (!chainVar) {
    if (env.ANTHROPIC_API_KEY && env.CHRONICLE_MODEL) {
      return { ok: true, chain: [{ kind: "anthropic", id: "anthropic", model: env.CHRONICLE_MODEL, ...tuning(env, "ANTHROPIC") }] };
    }
    return { ok: false, error: "No LLM is configured. Set LLM_CHAIN (see .env.example), or ANTHROPIC_API_KEY and CHRONICLE_MODEL, or MOCK_LLM=1." };
  }

  const names = chainVar.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  const problems: string[] = [];
  const chain: ProviderConfig[] = [];
  for (const name of names) {
    if (!NAME.test(name)) { problems.push(`"${name}" in LLM_CHAIN is not a valid name (letters, digits, _)`); continue; }
    if (name === "mock") { chain.push({ kind: "mock", id: "mock", model: "fixtures" }); continue; }
    const P = `LLM_${name.toUpperCase()}_`;

    if (name === "anthropic") {
      const model = env[`${P}MODEL`] ?? env.CHRONICLE_MODEL;
      const missing = [!env.ANTHROPIC_API_KEY && "ANTHROPIC_API_KEY", !model && `${P}MODEL`].filter(Boolean);
      if (missing.length) { problems.push(`${missing.join(", ")} not set`); continue; }
      chain.push({ kind: "anthropic", id: name, model: model!, ...tuning(env, "ANTHROPIC") });
      continue;
    }

    const baseUrl = env[`${P}BASE_URL`];
    const model = env[`${P}MODEL`];
    const apiKey = env[`${P}API_KEY`] || undefined;
    const local = baseUrl ? isLocal(baseUrl) : false;
    const missing = [!baseUrl && `${P}BASE_URL`, !model && `${P}MODEL`, !apiKey && !local && `${P}API_KEY`].filter(Boolean);
    if (missing.length) { problems.push(`${missing.join(", ")} not set`); continue; }
    if (!isUrl(baseUrl!)) { problems.push(`${P}BASE_URL is not a URL`); continue; }
    chain.push({
      kind: "openai-compatible", id: name, baseUrl: baseUrl!, apiKey, model: model!,
      reasoningEffort: env[`${P}REASONING_EFFORT`] || undefined,
      firstTokenTimeoutMs: num(env[`${P}FIRST_TOKEN_TIMEOUT_MS`], 45_000),
      ...tuning(env, name.toUpperCase()),
    });
  }

  if (problems.length) return { ok: false, error: `LLM config: ${problems.join("; ")}.` };
  if (!chain.length) return { ok: false, error: "LLM_CHAIN is empty." };
  return { ok: true, chain };
}

/** Providers for one turn. The mock needs the turn itself; the others only need the prompt. */
export function buildChain(chain: ProviderConfig[], turn: TurnRequest): LlmProvider[] {
  return chain.map((c) => {
    switch (c.kind) {
      case "mock": return mockProvider(turn);
      case "anthropic": return anthropicProvider(c);
      case "openai-compatible": return openAiCompatible(c);
    }
  });
}

/** For logs and the eval report: "gemini (model-id) → groq (model-id)". */
export function describeChain(chain: ProviderConfig[]): string {
  return chain.map((c) => `${c.id} (${c.model})`).join(" → ");
}

function tuning(env: Env, NAME_: string) {
  return {
    maxTokens: num(env[`LLM_${NAME_}_MAX_TOKENS`], 6000),
    temperature: num(env[`LLM_${NAME_}_TEMPERATURE`], 0.3),
  };
}

function num(v: string | undefined, fallback: number): number {
  const n = Number(v);
  return v !== undefined && v !== "" && Number.isFinite(n) ? n : fallback;
}

function isUrl(s: string) {
  try { return /^https?:$/.test(new URL(s).protocol); } catch { return false; }
}

function isLocal(s: string) {
  try { return ["localhost", "127.0.0.1", "[::1]", "0.0.0.0"].includes(new URL(s).hostname); } catch { return false; }
}
