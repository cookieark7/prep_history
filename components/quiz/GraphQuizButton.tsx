"use client";

import type { CauseGraphBlock } from "@/lib/contracts";
import { generateGraphQuiz } from "@/lib/quiz";
import { useWorkspace } from "@/lib/store/workspace";
import { Icon } from "@/components/ui/icons";

/** "Quiz this graph": a client-side quiz from the graph's edges and dates (no LLM). */
export function GraphQuizButton({ graph }: { graph: CauseGraphBlock }) {
  const quiz = generateGraphQuiz(graph);
  if (!quiz) return null;
  return (
    <button
      type="button"
      onClick={() => useWorkspace.getState().startQuiz(quiz.id, quiz)}
      className="ml-1 inline-flex h-9 items-center gap-1.5 rounded-[5px] bg-accent px-3 text-[12.5px] text-surface"
      title="Questions built from this graph"
    >
      <Icon.test size={14} /> Quiz this graph
    </button>
  );
}
