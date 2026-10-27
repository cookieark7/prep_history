import type { TurnRequest } from "@/lib/contracts";
import { mockLines } from "@/lib/director/mock";
import { sleep } from "./sleep";
import type { LlmProvider } from "./types";

const MOCK_DELAY_MS = 150;

/** MOCK_LLM=1: streams the hand-written fixture for this turn, one line every 150 ms. */
export function mockProvider(turn: TurnRequest, delayMs = MOCK_DELAY_MS): LlmProvider {
  return {
    id: "mock",
    model: "fixtures",
    async *stream({ signal }) {
      for (const [i, line] of mockLines(turn).entries()) {
        if (signal.aborted) return;
        if (i > 0) await sleep(delayMs, signal);
        yield line + "\n";
      }
    },
  };
}
