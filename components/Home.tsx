"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { Level } from "@/lib/contracts";
import { useWorkspace } from "@/lib/store/workspace";
import { useHydrated, ThemeSync } from "@/components/ui/hydration";
import { getLesson, listLessons, type LessonSummary } from "@/lib/store/lessons";
import { sendTurn } from "@/lib/stream-client";
import { formatYear } from "@/lib/layout/years";
import { Icon } from "@/components/ui/icons";

const ERAS = ["Ancient", "Medieval", "Early modern", "Modern"] as const;
const LEVELS: { id: Level; label: string }[] = [
  { id: "new", label: "New to this" },
  { id: "some", label: "Some background" },
  { id: "advanced", label: "Revising" },
];
const EXAMPLES = [
  "Why did Rome beat Carthage?",
  "How did the Mughal empire decline?",
  "What caused the French Revolution?",
  "Who succeeded Ashoka, and why did it fall apart?",
];

export function Home() {
  const hydrated = useHydrated();
  const router = useRouter();
  const [text, setText] = useState("");
  const [era, setEra] = useState<(typeof ERAS)[number] | null>(null);
  const [level, setLevel] = useState<Level>("some");

  const curId = useWorkspace((s) => s.lessonId);
  const curTopic = useWorkspace((s) => s.topic);
  const curCount = useWorkspace((s) => s.blocks.length);
  const current = curCount ? { id: curId, topic: curTopic, n: curCount } : null;

  const recent = useMemo<LessonSummary[]>(() => (hydrated ? listLessons() : []), [hydrated]);

  const start = (topic: string) => {
    const t = topic.trim();
    if (!t) return;
    useWorkspace.getState().startLesson(t, level);
    void sendTurn({ message: era ? `${t} (era: ${era})` : t });
    router.push("/study");
  };
  const onSubmit = (e: FormEvent) => { e.preventDefault(); start(text); };

  return (
    <main className="min-h-screen bg-bg">
      <ThemeSync />
      <div className="mx-auto flex min-h-screen max-w-[720px] flex-col px-4 pb-16 pt-[14vh] md:px-6">
        <p className="mb-10 text-center font-serif text-[17px] font-semibold tracking-tight text-muted">Chronicle</p>
        <h1 className="text-center font-serif text-[32px] font-normal leading-[1.15] tracking-[-0.01em] md:text-[40px]">
          What do you want to understand?
        </h1>

        <form onSubmit={onSubmit} className="mt-8">
          <div className="rounded-md border border-rule-strong bg-surface focus-within:border-text">
            <label htmlFor="home-composer" className="sr-only">Topic or question</label>
            <textarea
              id="home-composer"
              autoFocus
              rows={3}
              maxLength={1000}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); start(text); }
              }}
              placeholder="A topic, a question, or paste a paragraph you're reading"
              className="block w-full resize-none bg-transparent px-4 pt-3.5 font-serif text-[19px] leading-snug outline-none placeholder:text-muted"
            />
            <div className="flex items-center justify-end px-3 pb-3">
              <button
                type="submit"
                disabled={!text.trim()}
                className="inline-flex h-9 items-center gap-1.5 rounded-md bg-accent px-3.5 text-[13.5px] font-medium text-surface disabled:bg-rule disabled:text-muted"
              >
                Start <Icon.chevronRight size={14} />
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Era">
              {ERAS.map((e) => (
                <button
                  key={e}
                  type="button"
                  aria-pressed={era === e}
                  onClick={() => setEra(era === e ? null : e)}
                  className={`h-8 rounded-md border px-2.5 text-[12.5px] ${era === e ? "border-text bg-text text-bg" : "border-rule text-muted hover:border-rule-strong hover:text-text"}`}
                >
                  {e}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Your level">
              {LEVELS.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  role="radio"
                  aria-checked={level === l.id}
                  onClick={() => setLevel(l.id)}
                  className={`h-8 rounded-md px-2.5 text-[12.5px] ${level === l.id ? "bg-accent-soft text-accent" : "text-muted hover:text-text"}`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>
        </form>

        <ul className="mt-10 space-y-1.5">
          {EXAMPLES.map((ex) => (
            <li key={ex}>
              <button
                type="button"
                onClick={() => start(ex)}
                className="font-serif text-[18px] italic text-muted underline-offset-4 hover:text-text hover:underline"
              >
                {ex}
              </button>
            </li>
          ))}
        </ul>

        {hydrated && (current || recent.length > 0) && (
          <section className="mt-14">
            <h2 className="mb-2 text-[12px] font-medium uppercase tracking-wide text-muted">Continue</h2>
            <ul className="border-t border-rule">
              {current && (
                <ContinueRow
                  topic={current.topic || "Current lesson"}
                  meta={`${current.n} blocks · open now`}
                  period={null}
                  onClick={() => router.push("/study")}
                />
              )}
              {recent.filter((r) => r.id !== current?.id).map((r) => (
                <ContinueRow
                  key={r.id}
                  topic={r.topic}
                  meta={`${r.blockCount} blocks · ${new Date(r.updatedAt).toLocaleDateString()}`}
                  period={r.period}
                  onClick={() => {
                    const snap = getLesson(r.id);
                    if (snap) useWorkspace.getState().loadSnapshot(snap);
                    router.push("/study");
                  }}
                />
              ))}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}

function ContinueRow({ topic, meta, period, onClick }: { topic: string; meta: string; period: [number, number] | null; onClick: () => void }) {
  return (
    <li className="border-b border-rule">
      <button type="button" onClick={onClick} className="flex min-h-12 w-full items-center gap-4 px-1 py-2.5 text-left hover:bg-hover">
        <MiniSpine period={period} />
        <span className="flex-1 font-serif text-[16px]">{topic}</span>
        <span className="text-[12px] text-muted">{meta}</span>
      </button>
    </li>
  );
}

/** A tiny time-spine marker: where in history (-3000 .. 2000) the lesson sits. */
function MiniSpine({ period }: { period: [number, number] | null }) {
  const lo = -3000, hi = 2025;
  const pos = (y: number) => Math.max(0, Math.min(100, ((y - lo) / (hi - lo)) * 100));
  return (
    <span className="relative block h-1 w-14 shrink-0 rounded-full bg-rule" title={period ? `${formatYear(period[0])} to ${formatYear(period[1])}` : undefined}>
      {period && (
        <span className="absolute -top-px h-1.5 min-w-1.5 rounded-full bg-accent" style={{ left: `${pos(period[0])}%`, width: `${Math.max(3, pos(period[1]) - pos(period[0]))}%` }} />
      )}
    </span>
  );
}
