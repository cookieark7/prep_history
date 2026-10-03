"use client";

import type { QuizBlock as QuizT } from "@/lib/contracts";
import { useWorkspace } from "@/lib/store/workspace";
import { Icon } from "@/components/ui/icons";

const KIND: Record<QuizT["items"][number]["kind"], string> = { mcq: "multiple choice", chronology: "chronology", match: "match" };

/** Compact in the Stage; the full quiz runs in Focus mode. */
export function QuizBlock({ block }: { block: QuizT }) {
  const run = useWorkspace((s) => s.quizRuns[block.id]);
  const done = run ? Object.keys(run).length : 0;
  const right = run ? Object.values(run).filter(Boolean).length : 0;
  const counts = block.items.reduce<Record<string, number>>((a, i) => ({ ...a, [i.kind]: (a[i.kind] ?? 0) + 1 }), {});
  return (
    <div className="rounded-[2px] border border-rule bg-surface p-5">
      <p className="text-[13px] text-muted">
        {block.items.length} question{block.items.length > 1 ? "s" : ""} · {Object.entries(counts).map(([k, n]) => `${n} ${KIND[k as keyof typeof KIND]}`).join(", ")}
      </p>
      <ol className="mt-3 space-y-1.5 font-serif text-[16px]">
        {block.items.slice(0, 3).map((it, i) => (
          <li key={it.id} className="flex gap-2">
            <span className="mono-tab mt-1 text-muted">{i + 1}.</span>
            <span className="flex-1">{it.stem}</span>
            {run && it.id in run && (run[it.id] ? <Icon.check size={14} className="mt-1 text-ok" /> : <Icon.cross size={14} className="mt-1 text-brick" />)}
          </li>
        ))}
        {block.items.length > 3 && <li className="pl-5 text-[14px] text-muted">and {block.items.length - 3} more</li>}
      </ol>
      <div className="mt-4 flex items-center gap-3">
        <button type="button" onClick={() => useWorkspace.getState().startQuiz(block.id)} className="inline-flex h-10 items-center gap-1.5 rounded-md bg-text px-4 text-[14px] text-bg">
          <Icon.test size={14} /> {done ? "Practise again" : "Start in focus mode"}
        </button>
        {done > 0 && <span className="text-[13px] text-muted">Last run: {right} of {done} correct</span>}
      </div>
    </div>
  );
}
