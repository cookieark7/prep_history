import type { TurnRequest } from "@/lib/contracts";
import { mockLines } from "@/lib/director/mock";
import { sleep } from "./sleep";
import type { LlmProvider } from "./types";

const MOCK_DELAY_MS = 150;

/**
 * MOCK_LLM=1: streams the hand-written fixture for this turn, one line every 150 ms.
 * MOCK_FIRST_DELAY_MS waits that long before the first line, like a slow free model, to check
 * the waiting state.
 */
export function mockProvider(turn: TurnRequest, delayMs = MOCK_DELAY_MS, firstDelayMs = Number(process.env.MOCK_FIRST_DELAY_MS ?? 0) || 0): LlmProvider {
  return {
    id: "mock",
    model: "fixtures",
    async *stream({ signal }) {
      if (firstDelayMs > 0) await sleep(firstDelayMs, signal);
      for (const [i, line] of mockLines(turn).entries()) {
        if (signal.aborted) return;
        if (i > 0) await sleep(delayMs, signal);
        yield line + "\n";
      }
    },
  };
}
