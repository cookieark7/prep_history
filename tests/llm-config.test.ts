import { describe, expect, it } from "vitest";
import { describeChain, readLlmConfig } from "@/lib/llm/config";

const gemini = {
  LLM_GEMINI_BASE_URL: "https://generativelanguage.googleapis.com/v1beta/openai/",
  LLM_GEMINI_API_KEY: "g-key",
  LLM_GEMINI_MODEL: "flash-x",
};
const groq = { LLM_GROQ_BASE_URL: "https://api.groq.com/openai/v1", LLM_GROQ_API_KEY: "q-key", LLM_GROQ_MODEL: "llama-x" };

describe("readLlmConfig", () => {
  it("MOCK_LLM=1 wins over everything", () => {
    expect(readLlmConfig({ MOCK_LLM: "1", LLM_CHAIN: "gemini", ...gemini })).toEqual({ ok: true, chain: [{ kind: "mock", id: "mock", model: "fixtures" }] });
  });

  it("keeps the old Anthropic setup working without LLM_CHAIN", () => {
    const c = readLlmConfig({ ANTHROPIC_API_KEY: "a", CHRONICLE_MODEL: "claude-x" });
    expect(c).toEqual({ ok: true, chain: [{ kind: "anthropic", id: "anthropic", model: "claude-x", maxTokens: 6000, temperature: 0.3 }] });
  });

  it("reads a chain in order, with defaults and per-provider tuning", () => {
    const c = readLlmConfig({ LLM_CHAIN: " Gemini , groq ", ...gemini, ...groq, LLM_GROQ_MAX_TOKENS: "3500", LLM_GEMINI_REASONING_EFFORT: "none" });
    expect(c.ok).toBe(true);
    if (!c.ok) return;
    expect(c.chain).toEqual([
      { kind: "openai-compatible", id: "gemini", baseUrl: gemini.LLM_GEMINI_BASE_URL, apiKey: "g-key", model: "flash-x", reasoningEffort: "none", firstTokenTimeoutMs: 45000, maxTokens: 6000, temperature: 0.3 },
      { kind: "openai-compatible", id: "groq", baseUrl: groq.LLM_GROQ_BASE_URL, apiKey: "q-key", model: "llama-x", reasoningEffort: undefined, firstTokenTimeoutMs: 45000, maxTokens: 3500, temperature: 0.3 },
    ]);
    expect(describeChain(c.chain)).toBe("gemini (flash-x) → groq (llama-x)");
  });

  it("names every missing variable, and never the values", () => {
    const c = readLlmConfig({ LLM_CHAIN: "gemini,groq", LLM_GEMINI_BASE_URL: gemini.LLM_GEMINI_BASE_URL, LLM_GEMINI_API_KEY: "secret-value" });
    expect(c.ok).toBe(false);
    if (c.ok) return;
    expect(c.error).toContain("LLM_GEMINI_MODEL");
    expect(c.error).toContain("LLM_GROQ_BASE_URL, LLM_GROQ_MODEL, LLM_GROQ_API_KEY");
    expect(c.error).not.toContain("secret-value");
  });

  it("needs no key for a local server such as Ollama", () => {
    const c = readLlmConfig({ LLM_CHAIN: "ollama", LLM_OLLAMA_BASE_URL: "http://localhost:11434/v1", LLM_OLLAMA_MODEL: "llama-small" });
    expect(c.ok).toBe(true);
  });

  it("rejects bad names, bad URLs and an unconfigured server", () => {
    expect(readLlmConfig({ LLM_CHAIN: "gem-ini" })).toMatchObject({ ok: false });
    expect(readLlmConfig({ LLM_CHAIN: "gemini", ...gemini, LLM_GEMINI_BASE_URL: "not a url" })).toMatchObject({ ok: false });
    expect(readLlmConfig({})).toMatchObject({ ok: false, error: expect.stringContaining("LLM_CHAIN") });
  });

  it("lets anthropic sit in a chain", () => {
    const c = readLlmConfig({ LLM_CHAIN: "gemini,anthropic", ...gemini, ANTHROPIC_API_KEY: "a", CHRONICLE_MODEL: "claude-x" });
    expect(c.ok && c.chain.map((p) => `${p.kind}:${p.model}`)).toEqual(["openai-compatible:flash-x", "anthropic:claude-x"]);
  });
});
