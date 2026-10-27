"use client";

import type { PredictGateBlock as GateT } from "@/lib/contracts";
import { useWorkspace } from "@/lib/store/workspace";
import { sendTurn } from "@/lib/stream-client";
import { Icon } from "@/components/ui/icons";
import { scrollToEl } from "@/lib/scroll";

export function PredictGateBlock({ block }: { block: GateT }) {
  const gate = useWorkspace((s) => s.gates[block.id]);
  const revealsTitle = useWorkspace((s) => s.blocks.find((b) => b.id === block.reveals)?.title);
  const done = !!gate && (gate.answer != null || gate.skipped);
  const chosen = gate?.answer ?? null;
  const correct = chosen === block.answer_id;

  const answer = (id: string) => {
    if (done) return;
    const ok = id === block.answer_id;
    useWorkspace.getState().answerGate(block.id, id);
    const label = block.options.find((o) => o.id === id)?.label ?? id;
    void sendTurn({ event: { event: "predict_answer", block_id: block.id, answer_id: id, correct: ok }, echo: `Predicted: ${label}` });
    revealNext(block.reveals);
  };
  const skip = () => {
    useWorkspace.getState().answerGate(block.id, null);
    revealNext(block.reveals);
  };

  return (
    <div className="rounded-[2px] border border-rule bg-surface p-5">
      <p className="font-heading text-[20px] leading-snug">{block.prompt}</p>
      <ul className="mt-4 space-y-2" role="list">
        {block.options.map((o, i) => {
          const isAnswer = o.id === block.answer_id;
          const isChosen = o.id === chosen;
          const state = !done ? "idle" : isAnswer ? "right" : isChosen ? "wrong" : "other";
          return (
            <li key={o.id}>
              <button
                type="button"
                disabled={done}
                onClick={() => answer(o.id)}
                aria-pressed={isChosen}
                className={`flex min-h-11 w-full items-center gap-3 rounded-md border px-3.5 py-2 text-left text-[15px] transition-colors ${
                  state === "idle" ? "border-rule hover:border-text" :
                  state === "right" ? "border-ok text-text" :
                  state === "wrong" ? "border-brick text-text" : "border-rule text-muted"
                }`}
              >
                <span className="tnum grid h-6 w-6 shrink-0 place-items-center rounded-full border border-rule text-[11px] text-muted">
                  {state === "right" ? <Icon.check size={12} className="text-ok" /> : state === "wrong" ? <Icon.cross size={12} className="text-brick" /> : String.fromCharCode(65 + i)}
                </span>
                {o.label}
              </button>
            </li>
          );
        })}
      </ul>

      {!done ? (
        <p className="mt-4 flex items-center justify-between gap-3 text-[12.5px] text-muted">
          <span className="inline-flex items-center gap-1.5"><Icon.eye size={13} /> {revealsTitle ? <>“{revealsTitle}” stays blurred until you answer.</> : "Answer to reveal what happened."}</span>
          <button type="button" onClick={skip} className="shrink-0 underline-offset-2 hover:text-text hover:underline">Skip</button>
        </p>
      ) : (
        <div className="fade-up mt-4 border-t border-rule pt-4">
          {chosen != null && (
            <p className={`mb-1 text-[13px] font-medium ${correct ? "text-ok" : "text-brick"}`}>{correct ? "Correct." : "Not quite."}</p>
          )}
          <p className="text-[17px] leading-relaxed">{block.explanation}</p>
        </div>
      )}
    </div>
  );
}

function revealNext(id: string) {
  setTimeout(() => scrollToEl(document.getElementById(`block-${id}`)), 700);
}
