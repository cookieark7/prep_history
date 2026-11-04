import { z } from "zod";
import { anthropicProvider } from "@/lib/llm/anthropic";
import type { ProviderConfig } from "@/lib/llm/config";
import { openAiCompatible } from "@/lib/llm/openai-compatible";
import type { LlmProvider } from "@/lib/llm/types";

// "Check my answer" (docs/PROTOTYPE_PLAN.md, section 7.4): the student's typed recall against the
// card's answer, judged by meaning, in one sentence. Only when they ask, to save the free quota.
// With the mock model (MOCK_LLM=1) a plain word match stands in, so the flow can be tested.

export const Verdict = z.enum(["right", "partly", "missed"]);
export type Verdict = z.infer<typeof Verdict>;
export const CheckResult = z.object({ verdict: Verdict, feedback: z.string().min(2).max(300) });
export type CheckResult = z.infer<typeof CheckResult>;

export interface CheckInput { front: string; back: string; answer: string }

const SYSTEM = `You check a student's answer to a history flashcard for the UPSC exam against the
card's model answer. Judge the meaning, not the wording; ignore spelling. Reply with one JSON
object and nothing else:
{"verdict":"right|partly|missed","feedback":"one sentence to the student, at most 200 characters: what they got right, and what is missing or wrong"}
right: the main point is there and nothing important is wrong. partly: some of it, or one error.
missed: the main point is absent or wrong. Be exact and kind; never repeat the whole answer.`;

export async function checkAnswer(input: CheckInput, chain: ProviderConfig[], signal: AbortSignal): Promise<CheckResult | null> {
  if (chain[0]?.kind === "mock") return wordMatch(input);
  const user = `Question: ${input.front}\nModel answer: ${input.back}\nStudent's answer: ${input.answer}`;
  for (const p of providers(chain)) {
    try {
      let text = "";
      for await (const d of p.stream({ system: SYSTEM, user, signal })) text += d;
      const json = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
      const parsed = CheckResult.safeParse(JSON.parse(json));
      if (parsed.success) return parsed.data;
    } catch (e) {
      if (signal.aborted) return null;
      console.warn(`[check] ${p.id} failed: ${(e as Error).message}`);
    }
  }
  return null;
}

function providers(chain: ProviderConfig[]): LlmProvider[] {
  return chain.flatMap((c) => (c.kind === "anthropic" ? [anthropicProvider(c)] : c.kind === "openai-compatible" ? [openAiCompatible(c)] : []));
}

const STOP = new Set("about after also because been being before between both came could from have into more most only other over such than that their them then there these they this those through under were what when where which while with would your".split(" "));
const words = (s: string) => new Set((s.toLowerCase().match(/[a-z0-9]{4,}/g) ?? []).filter((w) => !STOP.has(w)));

/** The share of the answer's key words the student used: a stand-in for the model, for tests. */
export function wordMatch({ back, answer }: CheckInput): CheckResult {
  const key = [...words(back)];
  const said = words(answer);
  const hit = key.filter((w) => said.has(w));
  const share = key.length ? hit.length / key.length : 0;
  const missing = key.filter((w) => !said.has(w)).slice(0, 3).join(", ");
  if (share >= 0.5) return { verdict: "right", feedback: "That matches the answer's main point." };
  if (share >= 0.2) return { verdict: "partly", feedback: `Part of it. The answer also mentions ${missing}.` };
  return { verdict: "missed", feedback: `Not this time. The answer is about ${missing || "something else"}.` };
}
