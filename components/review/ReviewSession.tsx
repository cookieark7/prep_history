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
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!hydrated || !ACCOUNTS) return;
    let live = true;
    void startSync()
      .then(() => fetch(`/api/review/queue?tz=${tz()}&limit=30`))
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: { items: Item[] }) => { if (live) setItems(d.items); })
      .catch(() => { if (live) setError("Check your connection, then try again."); });
    return () => { live = false; };
  }, [hydrated, attempt]);

  const answered = useCallback((grade: number) => {
    setDone((d) => ({ reviewed: d.reviewed + 1, remembered: d.remembered + (grade >= 2 ? 1 : 0) }));
    setIndex((i) => i + 1);
  }, []);

  const item = items?.[index];
  return (
    <AppShell place="review">
      <main className="mx-auto flex max-w-[640px] flex-col px-4 pb-10 pt-6 md:px-6 md:pt-10">
        {/* without accounts (a local copy with no database) cards are not stored */}
        {!ACCOUNTS ? (
          <Empty title="Review isn't available here" text="This copy of Chronicle doesn't keep cards, so there is nothing to review." />
        ) : error ? (
          <Empty title="Your review couldn't be loaded" text={error}>
            <button type="button" onClick={() => { setError(null); setItems(null); setAttempt((n) => n + 1); }} className="mt-6 inline-flex h-10 items-center rounded-md bg-accent px-4 text-[14.5px] font-semibold text-bg hover:bg-accent-ink active:scale-[0.97]">Try again</button>
          </Empty>
        ) : !items ? (
          <div className="mt-24 flex justify-center"><div className="progress-rule w-40" /></div>
        ) : item ? (
          <>
            <CardLine total={items.length} at={index} />
            <ReviewCard key={item.id} item={item} onAnswered={answered} />
          </>
        ) : items.length === 0 ? (
          <Empty title="Nothing to review right now" text="Cards come from your lessons and return just before you'd forget them. Learn something new, and come back tomorrow.">
            <Link href="/start" className="mt-6 inline-flex h-10 items-center rounded-md bg-accent px-4 text-[14.5px] font-semibold text-bg hover:bg-accent-ink active:scale-[0.97]">Start a lesson</Link>
          </Empty>
        ) : (
          <>
          {/* the day's line runs on to its last station: a small, once-a-day finish */}
          <CardLine total={items.length} at={items.length - 1} finished />
          <Empty title="Done for now" delayed text={`You reviewed ${done.reviewed} card${done.reviewed === 1 ? "" : "s"} and remembered ${done.remembered}. Each one comes back just before you'd forget it.`}>
            <div className="mt-6 flex gap-2">
              <Link href="/stats" className="inline-flex h-10 items-center rounded-md bg-sunk px-4 text-[14.5px] font-medium hover:bg-hover active:scale-[0.97]">See progress</Link>
              <Link href="/start" className="inline-flex h-10 items-center rounded-md bg-accent px-4 text-[14.5px] font-semibold text-bg hover:bg-accent-ink active:scale-[0.97]">Learn something new</Link>
            </div>
          </Empty>
          </>
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
      <h1 className="mt-2 font-heading text-[25px] font-bold leading-[1.25] tracking-[-0.01em] md:text-[29px]">{item.front}</h1>
      <p className="mt-2 truncate text-[13.5px] text-muted">
        {KIND_LABEL[item.kind] ?? "Recall"}{item.isNew ? ", new card" : ""}{item.lessonTopic ? ` · from ${item.lessonTopic}` : ""}
      </p>

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
                className="mt-5 inline-flex h-11 items-center gap-1.5 rounded-md bg-accent px-5 text-[15px] font-semibold text-bg hover:bg-accent-ink active:scale-[0.97] disabled:opacity-45">
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
            className="mt-2 block w-full resize-none rounded-lg border border-rule-strong bg-bg px-3.5 py-3 text-[16px] leading-relaxed outline-none transition-colors placeholder:text-muted focus:border-accent"
          />
          <button type="button" onClick={() => setRevealed(true)}
            className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-md bg-accent text-[15px] font-semibold text-bg hover:bg-accent-ink active:scale-[0.97] sm:w-auto sm:px-6">
            Show answer
          </button>
        </div>
      ) : (
        <div className="mt-6">
          {answer.trim() && (
            <div className="mb-3 rounded-lg border border-rule px-4 py-3">
              <p className="text-[12.5px] font-medium text-muted">You wrote</p>
              <p className="mt-0.5 whitespace-pre-wrap text-[15px] leading-relaxed">{answer.trim()}</p>
            </div>
          )}
          <div className="fade-up rounded-lg bg-frame px-4 py-3.5">
            <p className="text-[13px] font-semibold text-muted">Answer</p>
            <p className="mt-1 text-[17.5px] leading-relaxed">{item.back}</p>
          </div>
          <p className="mt-5 text-[13px] text-muted">How did it go?</p>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4" role="group" aria-label="How well did you remember?">
            {RATINGS.map((r) => (
              <button key={r.grade} type="button" disabled={sending} onClick={() => void rate(r.grade)}
                className={`flex min-h-14 flex-col items-center justify-center rounded-md border px-2 py-1.5 text-center transition-transform duration-150 active:scale-[0.97] disabled:opacity-45 ${r.grade === 3 ? "border-accent bg-accent-soft text-accent" : "border-rule-strong bg-bg hover:border-text"}`}>
                <span className="text-[14px] font-semibold">{r.label} <span className="tnum text-[12px] font-normal text-muted">{r.grade}</span></span>
                <span className="text-[12.5px] text-muted">{item.preview[String(r.grade)] ? `back in ${item.preview[String(r.grade)]}` : r.hint}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}

/**
 * Today's cards as the route line: the same 3px ink line everywhere, answered cards filled in, the
 * card in hand on the yellow board. At the end every station fills, left to right, once a day.
 */
function CardLine({ total, at, finished = false }: { total: number; at: number; finished?: boolean }) {
  return (
    <div className="mt-4 flex items-center gap-4">
      <div className="relative h-6 flex-1" aria-hidden>
        <span className="absolute inset-x-0 top-1/2 -mt-[1.5px] h-[3px] bg-line" />
        {Array.from({ length: total }, (_, k) => {
          const here = !finished && k === at;
          const filled = finished || k < at;
          return (
            <span
              key={k}
              className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-line ${
                here ? "h-[18px] w-[18px] bg-board" : `h-3 w-3 ${filled ? "bg-line" : "bg-bg"}`
              } ${finished ? "fill-in" : ""}`}
              style={{ left: total > 1 ? `${(k / (total - 1)) * 100}%` : "0%", ...(finished ? { transitionDelay: `${Math.min(k * 40, 600)}ms` } : {}) }}
            />
          );
        })}
      </div>
      <span className="text-[13.5px] text-muted tnum">{finished ? `${total} of ${total}` : `${at + 1} of ${total}`}</span>
    </div>
  );
}

function Empty({ title, text, children, delayed = false }: { title: string; text: string; children?: React.ReactNode; delayed?: boolean }) {
  return (
    <div className={`mt-24 text-center ${delayed ? "fade-up [animation-delay:60ms]" : ""}`}>
      <h1 className="font-heading text-[26px] font-bold leading-tight">{title}</h1>
      <p className="mx-auto mt-3 max-w-[42ch] text-[15px] leading-relaxed text-muted">{text}</p>
      {children && <div className="flex justify-center">{children}</div>}
    </div>
  );
}
