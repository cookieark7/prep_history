// Fail fast at server start: real mode needs a working LLM_CHAIN (or the older Anthropic pair).
// With DATABASE_URL, apply pending migrations; if the database is unreachable, say so and carry
// on without accounts rather than refusing to serve lessons.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  // imported here so the edge build never sees the provider adapters or the database driver
  const { describeChain, readLlmConfig } = await import("./lib/llm/config");
  const config = readLlmConfig();
  if (!config.ok) throw new Error(`[chronicle] ${config.error}`);
  if (config.chain[0].kind === "mock") console.log("[chronicle] MOCK_LLM=1: serving hand-written fixtures, no LLM calls");
  else console.log(`[chronicle] LLM chain: ${describeChain(config.chain)}`);

  if (process.env.DATABASE_URL) {
    const { migrateDb } = await import("./lib/db/client");
    try {
      await migrateDb();
      console.log("[chronicle] database ready (migrations applied)");
    } catch (e) {
      console.error(`[chronicle] database unavailable, accounts and sync are off: ${(e as Error).message}`);
    }
  } else {
    console.log("[chronicle] no DATABASE_URL: lessons stay in the browser, accounts are off");
  }
}
