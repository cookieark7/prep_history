"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { ChronologyItem, MatchItem, McqItem } from "@/lib/contracts";
import { ACCOUNTS } from "@/lib/auth";
import { startSync } from "@/lib/store/sync";
import { useHydrated } from "@/components/ui/hydration";
import { AppShell } from "@/components/shell/AppShell";
import { ChronologyView, MatchView, McqView } from "@/components/quiz/QuizItems";
import { Icon } from "@/components/ui/icons";

// Daily review (docs/PROTOTYPE_PLAN.md, section 7.4), phone first: try to recall, then see the
// answer and say how it went; quiz-style cards check themselves. FSRS decides when each card
// comes back, so a session is short and the ideas stay.

interface Item {
  id: string;
  kind: string;
  front: string;
  back: string;
  payload: unknown;
  lessonTopic: string | null;
  isNew: boolean;
  preview: Record<string, string>;
}

const AUTO = new Set(["mcq", "chronology", "match"]);
const KIND_LABEL: Record<string, string> = {
  why: "Why", consequence: "What it led to", sequence: "In what order", anchor: "When", significance: "Why it matters",
  mcq: "Question", chronology: "Put in order", match: "Match",
};
const RATINGS: { grade: 1 | 2 | 3 | 4; label: string; hint: string }[] = [
  { grade: 1, label: "Again", hint: "I didn't remember" },
  { grade: 2, label: "Hard", hint: "with effort" },
  { grade: 3, label: "Good", hint: "I remembered" },
  { grade: 4, label: "Easy", hint: "instantly" },
];
const tz = () => -new Date().getTimezoneOffset();

export function ReviewSession() {
  const hydrated = useHydrated();
  const [items, setItems] = useState<Item[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [done, setDone] = useState({ reviewed: 0, remembered: 0 });

  useEffect(() => {
    if (!hydrated || !ACCOUNTS) return;
    let live = true;
    void startSync()
      .then(() => fetch(`/api/review/queue?tz=${tz()}&limit=30`))
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: { items: Item[] }) => { if (live) setItems(d.items); })
      .catch(() => { if (live) setError("Couldn't load your review. Check your connection and try again."); });
    return () => { live = false; };
  }, [hydrated]);

  const answered = useCallback((grade: number) => {
    setDone((d) => ({ reviewed: d.reviewed + 1, remembered: d.remembered + (grade >= 2 ? 1 : 0) }));
    setIndex((i) => i + 1);
  }, []);

  const item = items?.[index];
  return (
    <AppShell place="review">
      <main className="mx-auto flex max-w-[640px] flex-col px-4 pb-10 pt-6 md:px-6 md:pt-10">
        {!ACCOUNTS ? (
          <Empty title="Reviews need the database" text="Set DATABASE_URL and NEXT_PUBLIC_CHRONICLE_ACCOUNTS=1 to save cards and review them." />
        ) : error ? (
          <Empty title="Something went wrong" text={error} />
        ) : !items ? (
          <div className="mt-24 flex justify-center"><div className="progress-rule w-40" /></div>
        ) : item ? (
          <>
            <div className="mt-6 flex items-center gap-3">
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-rule" aria-hidden>
                <div className="h-full bg-accent transition-[width] duration-300" style={{ width: `${(index / items.length) * 100}%` }} />
              </div>
              <span className="tnum text-[11px] text-muted">{index + 1} of {items.length}</span>
            </div>
            <ReviewCard key={item.id} item={item} onAnswered={answered} />
          </>
        ) : items.length === 0 ? (
          <Empty title="Nothing to review right now" text="Cards come from your lessons and return just before you'd forget them. Learn something new, and come back tomorrow.">
            <Link href="/start" className="mt-6 inline-flex h-10 items-center rounded-[7px] bg-accent px-4 text-[14px] font-semibold text-surface hover:bg-accent-ink">Start a lesson</Link>
          </Empty>
        ) : (
          <Empty title="Done for now" text={`You reviewed ${done.reviewed} card${done.reviewed === 1 ? "" : "s"} and remembered ${done.remembered}. Each one comes back just before you'd forget it.`}>
            <div className="mt-6 flex gap-2">
              <Link href="/stats" className="inline-flex h-10 items-center rounded-[7px] border border-rule-strong px-4 text-[14px] hover:bg-hover">See progress</Link>
              <Link href="/start" className="inline-flex h-10 items-center rounded-[7px] bg-accent px-4 text-[14px] font-semibold text-surface hover:bg-accent-ink">Learn something new</Link>
            </div>
          </Empty>
        )}
      </main>
    </AppShell>
  );
}

function ReviewCard({ item, onAnswered }: { item: Item; onAnswered: (grade: number) => void }) {
  const shownAt = useRef(0);
  const [revealed, setRevealed] = useState(false);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<boolean | null>(null); // auto-checked kinds
  const [autoGrade, setAutoGrade] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const auto = AUTO.has(item.kind) && !!item.payload;

  useEffect(() => { shownAt.current = Date.now(); }, []);

  const rate = useCallback(async (grade: number, correct: boolean | null = null) => {
    if (sending) return;
    setSending(true);
    await fetch(`/api/review/${encodeURIComponent(item.id)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating: grade, correct, answerText: answer.trim() || null, durationMs: Date.now() - shownAt.current }),
    }).catch(() => {}); // offline: the card simply comes back next time
    onAnswered(grade);
  }, [answer, item.id, onAnswered, sending]);

  // keys: space or enter shows the answer, 1-4 rate it (not while typing)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement)?.closest?.("textarea, input");
      if (!revealed && !auto && (e.key === " " || e.key === "Enter") && !typing) { e.preventDefault(); setRevealed(true); }
      if (revealed && !auto && !typing && /^[1-4]$/.test(e.key)) void rate(Number(e.key));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [auto, rate, revealed]);

  // quiz-style: wrong is "again"; right is "good", or "easy" when it came in under 8 seconds
  const autoDone = (correct: boolean) => {
    setResult(correct);
    setAutoGrade(!correct ? 1 : Date.now() - shownAt.current < 8000 ? 4 : 3);
    setRevealed(true);
  };

  return (
    <article className="fade-up mt-6" aria-live="polite">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-muted">
        <span className="font-medium uppercase tracking-wide text-accent">{KIND_LABEL[item.kind] ?? "Recall"}</span>
        {item.isNew && <span className="rounded-[3px] bg-accent-soft px-1.5 py-px text-[11px] text-accent">new</span>}
        {item.lessonTopic && <span className="truncate">· {item.lessonTopic}</span>}
      </p>
      <h1 className="mt-3 font-heading text-[24px] leading-[1.25] md:text-[28px]">{item.front}</h1>

      {auto ? (
        <div className="mt-6">
          {item.kind === "mcq" && <McqView item={item.payload as McqItem} onDone={autoDone} locked={null} />}
          {item.kind === "chronology" && <ChronologyView item={item.payload as ChronologyItem} onDone={autoDone} />}
          {item.kind === "match" && <MatchView item={item.payload as MatchItem} onDone={autoDone} />}
          {result !== null && (
            <div className="fade-up mt-5">
              <p className={`text-[15px] font-medium ${result ? "text-ok" : "text-brick"}`}>{result ? "Right." : "Not quite."}</p>
              <p className="mt-1 text-[15.5px] leading-relaxed text-muted">{item.back}</p>
              <button type="button" disabled={sending} onClick={() => void rate(autoGrade!, result)}
                className="mt-5 inline-flex h-11 items-center gap-1.5 rounded-[7px] bg-accent px-5 text-[14px] font-semibold text-surface hover:bg-accent-ink disabled:opacity-45">
                Next <Icon.chevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      ) : !revealed ? (
        <div className="mt-6">
          <label htmlFor="recall" className="text-[13px] text-muted">Say it to yourself, or write it down. Trying first is what makes it stick.</label>
          <textarea
            id="recall" rows={3} value={answer} onChange={(e) => setAnswer(e.target.value)}
            placeholder="Your answer (optional)"
            className="mt-2 block w-full resize-none rounded-[10px] border border-rule-strong bg-surface px-3.5 py-3 text-[16px] leading-relaxed outline-none transition-colors placeholder:text-muted focus:border-accent"
          />
          <button type="button" onClick={() => setRevealed(true)}
            className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-[7px] bg-accent text-[15px] font-semibold text-surface hover:bg-accent-ink sm:w-auto sm:px-6">
            Show answer
          </button>
        </div>
      ) : (
        <div className="mt-6">
          {answer.trim() && (
            <div className="mb-3 rounded-md border border-rule bg-surface px-3.5 py-2.5">
              <p className="text-[11px] uppercase tracking-wide text-muted">You wrote</p>
              <p className="mt-0.5 whitespace-pre-wrap text-[15px] leading-relaxed">{answer.trim()}</p>
            </div>
          )}
          <div className="fade-up rounded-md border border-accent bg-surface px-3.5 py-3">
            <p className="text-[11px] uppercase tracking-wide text-accent">Answer</p>
            <p className="mt-0.5 text-[17px] leading-relaxed">{item.back}</p>
          </div>
          <p className="mt-5 text-[13px] text-muted">How did it go?</p>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4" role="group" aria-label="How well did you remember?">
            {RATINGS.map((r) => (
              <button key={r.grade} type="button" disabled={sending} onClick={() => void rate(r.grade)}
                className={`flex min-h-14 flex-col items-center justify-center rounded-[7px] border px-2 py-1.5 text-center disabled:opacity-45 ${r.grade === 3 ? "border-accent bg-accent-soft text-accent" : "border-rule-strong bg-surface hover:border-text"}`}>
                <span className="text-[14px] font-semibold">{r.label} <span className="tnum text-[11px] font-normal text-muted">{r.grade}</span></span>
                <span className="text-[11.5px] text-muted">{item.preview[String(r.grade)] ? `back in ${item.preview[String(r.grade)]}` : r.hint}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}

function Empty({ title, text, children }: { title: string; text: string; children?: React.ReactNode }) {
  return (
    <div className="mt-24 text-center">
      <h1 className="font-heading text-[26px] leading-tight">{title}</h1>
      <p className="mx-auto mt-3 max-w-[42ch] text-[15px] leading-relaxed text-muted">{text}</p>
      {children && <div className="flex justify-center">{children}</div>}
    </div>
  );
}
