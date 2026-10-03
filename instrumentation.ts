// Fail fast at server start: real mode needs a key and a model name.
export function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.MOCK_LLM === "1") {
    console.log("[chronicle] MOCK_LLM=1: serving hand-written fixtures, no LLM calls");
    return;
  }
  const missing = ["ANTHROPIC_API_KEY", "CHRONICLE_MODEL"].filter((k) => !process.env[k]);
  if (missing.length) {
    throw new Error(`[chronicle] Missing ${missing.join(", ")}. Set them, or set MOCK_LLM=1 for fixture mode.`);
  }
}
