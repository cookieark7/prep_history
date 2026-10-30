"use client";

import type { CauseGraphBlock } from "@/lib/contracts";
import { generateGraphQuiz } from "@/lib/quiz";
import { useWorkspace } from "@/lib/store/workspace";
import { Icon } from "@/components/ui/icons";

/** "Quiz me on this map": a client-side quiz from the map's links and dates (no LLM). */
export function GraphQuizButton({ graph }: { graph: CauseGraphBlock }) {
  const quiz = generateGraphQuiz(graph);
  if (!quiz) return null;
  return (
    <button
      type="button"
      onClick={() => useWorkspace.getState().startQuiz(quiz.id, quiz)}
      className="ml-1 inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md bg-accent px-3 text-[13.5px] font-semibold text-bg hover:bg-accent-ink active:scale-[0.97]"
      title="Questions built from this map"
    >
      <Icon.test size={14} /> Quiz me on this map
    </button>
  );
}
