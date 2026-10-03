"use client";

import { useEffect, useMemo, useState } from "react";
import type { Block, CauseGraphBlock, QuizBlock, QuizItem } from "@/lib/contracts";
import { useWorkspace } from "@/lib/store/workspace";
import { sendTurn } from "@/lib/stream-client";
import { GRAPH_QUIZ_ID, generateGraphQuiz, refFor } from "@/lib/quiz";
import { nodeYear } from "@/lib/graph";
import { formatYear, toAstro } from "@/lib/layout/years";
import { Icon } from "@/components/ui/icons";
import { scrollToBlock } from "@/components/blocks/Markdown";
import { ChronologyView, MatchView, McqView } from "./QuizItems";

/** Which quiz focus mode is showing. */
function useActiveQuiz(): QuizBlock | null {
  const blocks = useWorkspace((s) => s.blocks);
  const focusId = useWorkspace((s) => s.focusId);
  const local = useWorkspace((s) => s.localQuiz);
  return useMemo(() => {
    if (local && focusId === local.id) return local;
    const quizzes = blocks.filter((b): b is QuizBlock => b.type === "quiz");
    return quizzes.find((q) => q.id === focusId) ?? quizzes.at(-1) ?? null;
  }, [blocks, focusId, local]);
}

/** Focus mode: everything else disappears; one question at a time, centred at 680px. */
export function FocusView() {
  const quiz = useActiveQuiz();
  const streaming = useWorkspace((s) => s.streaming);
  const blocks = useWorkspace((s) => s.blocks);
  const graph = blocks.find((b): b is CauseGraphBlock => b.type === "cause_graph");
  const exit = () => useWorkspace.getState().exitFocus();

  return (
    <div role="dialog" aria-modal="true" aria-label="Quiz" className="fixed inset-0 z-40 overflow-y-auto bg-bg">
      {quiz ? (
        <QuizRunner key={quiz.id + quiz.title} quiz={quiz} onExit={exit} />
      ) : (
        <div className="mx-auto flex min-h-full max-w-[680px] flex-col items-center justify-center px-5 text-center">
          {streaming ? (
            <>
              <p className="font-serif text-[22px]">Building your quiz…</p>
              <div className="progress-rule mt-4 w-40" />
            </>
          ) : (
            <>
              <p className="font-serif text-[22px]">No quiz yet.</p>
              <p className="mt-1 text-[14px] text-muted">Build one from what is on the Stage.</p>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {graph && <GraphQuizStart graph={graph} />}
                <button type="button" onClick={() => void sendTurn({ message: "Quiz me on what we covered." })} className="h-10 rounded-md border border-rule px-4 text-[14px] hover:bg-hover">Ask Chronicle for a quiz</button>
              </div>
            </>
          )}
          <button type="button" onClick={exit} className="mt-10 text-[13px] text-muted hover:text-text"><kbd className="font-mono">Esc</kbd> Back to the lesson</button>
        </div>
      )}
    </div>
  );
}

function GraphQuizStart({ graph }: { graph: CauseGraphBlock }) {
  return (
    <button
      type="button"
      onClick={() => { const q = generateGraphQuiz(graph); if (q) useWorkspace.getState().startQuiz(q.id, q); }}
      className="h-10 rounded-md bg-text px-4 text-[14px] text-bg"
    >
      Quiz the cause graph
    </button>
  );
}

function QuizRunner({ quiz, onExit }: { quiz: QuizBlock; onExit: () => void }) {
  const [idx, setIdx] = useState(0);
  const [results, setResults] = useState<Record<string, boolean>>({});
  const items = quiz.items;
  const item = items[idx] as QuizItem | undefined;
  const answered = item ? item.id in results : false;
  const finished = idx >= items.length;
  const isLocal = quiz.id === GRAPH_QUIZ_ID;

  const onDone = (correct: boolean) => {
    if (!item || item.id in results) return;
    setResults((r) => ({ ...r, [item.id]: correct }));
    const st = useWorkspace.getState();
    const ref = refFor(item);
    st.updateMastery(ref, correct);
    st.recordAnswer(quiz.id, item.id, correct);
    // Only misses need the Director (it adds one targeted item); local quizzes stay offline.
    if (!correct && !isLocal) void sendTurn({ event: { event: "quiz_result", ref, correct }, echo: null });
  };
  const next = () => setIdx((i) => i + 1);

  // keyboard: 1-5 pick an option, Enter = check / next
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return;
      if (/^[1-5]$/.test(e.key)) (document.querySelector(`[data-option="${e.key}"]`) as HTMLButtonElement | null)?.click();
      if (e.key === "Enter") {
        e.preventDefault();
        if (answered) next();
        else (document.querySelector("[data-primary]") as HTMLButtonElement | null)?.click();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [answered]);

  const progress = Math.min(1, (idx + (answered ? 1 : 0)) / items.length);

  return (
    <>
      <div className="fixed inset-x-0 top-0 z-10 h-px bg-rule"><div className="h-px bg-accent transition-[width] duration-200" style={{ width: `${progress * 100}%` }} /></div>
      <div className="fixed left-0 right-0 top-0 z-10 flex h-14 items-center justify-between px-5 text-[13px] text-muted">
        <span className="truncate pr-4">{quiz.title}</span>
        <span className="flex items-center gap-4">
          {!finished && <span className="mono-tab">{idx + 1} / {items.length}</span>}
          <button type="button" onClick={onExit} className="inline-flex h-8 items-center gap-1.5 rounded-md px-2 hover:bg-hover hover:text-text">
            <kbd className="font-mono text-[11px]">Esc</kbd> Exit
          </button>
        </span>
      </div>

      <div className="mx-auto max-w-[680px] px-5 pb-24 pt-[16vh]">
        {finished ? (
          <EndScreen quiz={quiz} results={results} onRestart={() => { setIdx(0); setResults({}); }} onExit={onExit} />
        ) : item ? (
          <div key={item.id} className="fade-up">
            <p className="mb-2 text-[12px] uppercase tracking-wide text-muted">
              {item.kind === "mcq" ? "Multiple choice" : item.kind === "chronology" ? "Chronology" : "Match"}
            </p>
            <h2 className="mb-6 font-serif text-[26px] leading-[1.25]">{item.stem}</h2>
            {item.kind === "mcq" && <McqView item={item} onDone={onDone} locked={null} />}
            {item.kind === "chronology" && <ChronologyView item={item} onDone={onDone} />}
            {item.kind === "match" && <MatchView item={item} onDone={onDone} />}

            {answered && (
              <div className="fade-up mt-6 border-t border-rule pt-4">
                <p className={`text-[13.5px] font-medium ${results[item.id] ? "text-ok" : "text-brick"}`}>{results[item.id] ? "Correct." : "Not quite."}</p>
                {(item.kind === "mcq" ? item.why : item.kind === "match" ? item.explain : null) && (
                  <p className="mt-1 font-serif text-[17px] leading-relaxed">{item.kind === "mcq" ? item.why : item.kind === "match" ? item.explain : ""}</p>
                )}
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <button type="button" onClick={next} className="inline-flex h-10 items-center gap-1.5 rounded-md bg-text px-4 text-[14px] text-bg">
                    {idx + 1 < items.length ? "Next" : "Finish"} <kbd className="font-mono text-[11px] opacity-60">↵</kbd>
                  </button>
                  <SeeInLesson block={item.source_ref.block} node={item.source_ref.node} />
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </>
  );
}

function SeeInLesson({ block, node }: { block: string; node: string | null }) {
  const exists = useWorkspace((s) => s.blocks.some((b) => b.id === block));
  if (!exists) return null;
  return (
    <button
      type="button"
      onClick={() => {
        const st = useWorkspace.getState();
        st.exitFocus();
        setTimeout(() => scrollToBlock(block, node, st.flashBlock), 80);
      }}
      className="inline-flex h-10 items-center gap-1.5 rounded-md px-3 text-[13.5px] text-accent hover:bg-accent-soft"
    >
      See in lesson <Icon.chevronRight size={13} />
    </button>
  );
}

/** Year for an item's source, so the end screen can place it on a small timeline. */
function practisedEvents(quiz: QuizBlock, blocks: Block[]): { key: string; label: string; year: number; ref: string }[] {
  const out: { key: string; label: string; year: number; ref: string }[] = [];
  for (const it of quiz.items) {
    const ref = refFor(it);
    if (it.kind === "chronology") {
      for (const e of it.events) out.push({ key: `${it.id}-${e.id}`, label: e.label, year: e.year, ref });
      continue;
    }
    const src = blocks.find((b) => b.id === it.source_ref.block);
    const node = it.source_ref.node;
    if (!src || !node) continue;
    if (src.type === "cause_graph") {
      const n = src.nodes.find((x) => x.id === node);
      const y = n ? nodeYear(src, n) : null;
      if (n && y != null) out.push({ key: it.id, label: n.label, year: y, ref });
    } else if (src.type === "timeline") {
      const e = src.events.find((x) => x.id === node);
      if (e) out.push({ key: it.id, label: e.label, year: e.start, ref });
    } else if (src.type === "lineage") {
      const p = src.people.find((x) => x.id === node);
      if (p?.start != null) out.push({ key: it.id, label: p.name, year: p.start, ref });
    }
  }
  return out;
}

function strengthColor(s: number) {
  // weak (brick) -> middling (ochre) -> strong (ok)
  return s < 0.4 ? "var(--brick)" : s < 0.7 ? "var(--ochre)" : "var(--ok)";
}

function EndScreen({ quiz, results, onRestart, onExit }: { quiz: QuizBlock; results: Record<string, boolean>; onRestart: () => void; onExit: () => void }) {
  const blocks = useWorkspace((s) => s.blocks);
  const mastery = useWorkspace((s) => s.mastery);
  const right = Object.values(results).filter(Boolean).length;
  const weak = quiz.items.filter((it) => results[it.id] === false || (mastery[refFor(it)] ?? 1) < 0.5);
  const evs = practisedEvents(quiz, blocks);
  const lo = evs.length ? Math.min(...evs.map((e) => toAstro(e.year))) : 0;
  const hi = evs.length ? Math.max(...evs.map((e) => toAstro(e.year))) : 1;
  const X = (y: number) => 24 + ((toAstro(y) - lo) / Math.max(1, hi - lo)) * 592;
  const era = evs.some((e) => e.year < 0);

  return (
    <div className="fade-up">
      <p className="text-[12px] uppercase tracking-wide text-muted">Done</p>
      <h2 className="mt-1 font-serif text-[30px] leading-tight">{right} of {quiz.items.length} correct</h2>
      <p className="mt-1 text-[14px] text-muted">{weak.length ? "The weaker spots are marked below. Practise them, or go back and reread." : "Everything held up. Try explaining one link out loud before moving on."}</p>

      {evs.length > 0 && (
        <figure className="mt-8">
          <svg viewBox="0 0 640 86" className="w-full" role="img" aria-label="Events practised, tinted by recall strength">
            <line x1={16} x2={624} y1={40} y2={40} stroke="var(--rule-strong)" />
            {evs.map((e, i) => {
              const s = mastery[e.ref] ?? 0.5;
              const x = X(e.year);
              return (
                <g key={e.key} transform={`translate(${x},40)`}>
                  <title>{`${e.label} (${formatYear(e.year)}): recall ${Math.round(s * 100)}%`}</title>
                  <circle r={6} fill={strengthColor(s)} stroke="var(--surface)" strokeWidth={1.5} />
                  <text y={i % 2 ? 24 : -14} textAnchor="middle" fontSize={10.5} fill="var(--muted)">{e.label.length > 22 ? e.label.slice(0, 21) + "…" : e.label}</text>
                </g>
              );
            })}
            <text x={16} y={82} fontSize={10.5} fontFamily="var(--font-mono)" fill="var(--muted)">{formatYear(Math.min(...evs.map((e) => e.year)), { era })}</text>
            <text x={624} y={82} textAnchor="end" fontSize={10.5} fontFamily="var(--font-mono)" fill="var(--muted)">{formatYear(Math.max(...evs.map((e) => e.year)), { era })}</text>
          </svg>
          <figcaption className="mt-1 flex items-center gap-3 text-[11.5px] text-muted">
            <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-brick" /> weak</span>
            <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-ochre" /> shaky</span>
            <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-ok" /> strong</span>
          </figcaption>
        </figure>
      )}

      <div className="mt-8 flex flex-wrap gap-2">
        {weak.length > 0 && (
          <button
            type="button"
            onClick={() => useWorkspace.getState().startQuiz(GRAPH_QUIZ_ID, { ...quiz, id: GRAPH_QUIZ_ID, title: `Weak spots: ${quiz.title.replace(/^(Weak spots|Graph quiz|Quiz): /, "")}`.slice(0, 80), items: weak })}
            className="h-10 rounded-md bg-text px-4 text-[14px] text-bg"
          >
            Practise weak spots ({weak.length})
          </button>
        )}
        <button type="button" onClick={onRestart} className="h-10 rounded-md border border-rule px-4 text-[14px] hover:bg-hover">Try again</button>
        <button type="button" onClick={onExit} className="h-10 rounded-md px-4 text-[14px] text-muted hover:bg-hover">Back to the lesson</button>
      </div>
    </div>
  );
}
