"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ACCOUNTS } from "@/lib/auth";
import { startSync } from "@/lib/store/sync";
import { useHydrated } from "@/components/ui/hydration";
import { AppShell } from "@/components/shell/AppShell";
import { Icon } from "@/components/ui/icons";
import { PARTS, stationsOf } from "@/content/syllabus";
import { useRoute, useRouteHydrated } from "@/lib/syllabus/route";
import type { ReviewStats } from "@/lib/review/repo";
import { stationState, type StationState } from "@/lib/review/station-state";

// Progress (docs/PROTOTYPE_PLAN.md, section 7.5): what's waiting today, the syllabus line with
// how far each station has come, and the number that matters, how much is still remembered after
// a day, a week, a month. A lesson counts for a station when it was started from that station.

type Load = { state: "loading" } | { state: "error" } | { state: "ready"; stats: ReviewStats };

export function StatsView() {
  const hydrated = useHydrated();
  const [load, setLoad] = useState<Load>({ state: "loading" });
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => { setLoad({ state: "loading" }); setAttempt((n) => n + 1); }, []);

  useEffect(() => {
    if (!hydrated || !ACCOUNTS) return;
    let live = true;
    void startSync()
      .then(() => fetch(`/api/review/stats?tz=${-new Date().getTimezoneOffset()}`))
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: ReviewStats) => { if (live) setLoad({ state: "ready", stats: d }); })
      .catch(() => { if (live) setLoad({ state: "error" }); });
    return () => { live = false; };
  }, [hydrated, attempt]);

  return (
    <AppShell place="progress">
      <main className="mx-auto max-w-[880px] px-4 pb-16 pt-6 md:px-10 md:pt-10">
        <h1 className="font-heading text-[28px] font-bold leading-tight tracking-[-0.015em] md:text-[34px]">Progress</h1>

        {/* without accounts (a local copy with no database) there is nothing stored to show */}
        {!ACCOUNTS ? (
          <p className="mt-3 text-[15.5px] text-muted">Progress isn&rsquo;t available on this copy of Chronicle.</p>
        ) : load.state === "error" ? (
          <div className="mt-6 rounded-lg bg-frame p-5">
            <p className="text-[15.5px]">Your progress couldn&rsquo;t be loaded.</p>
            <p className="mt-1 text-[14.5px] text-muted">Check your connection, then try again.</p>
            <button type="button" onClick={retry} className="mt-4 inline-flex h-10 items-center rounded-md bg-accent px-4 text-[14.5px] font-semibold text-bg hover:bg-accent-ink active:scale-[0.97]">Try again</button>
          </div>
        ) : load.state === "loading" ? (
          <div className="mt-8 space-y-3" aria-label="Loading">
            <p className="h-5 w-72 animate-pulse rounded bg-sunk" />
            <p className="h-5 w-56 animate-pulse rounded bg-sunk" />
          </div>
        ) : load.stats.totalCards === 0 ? (
          <FirstVisit />
        ) : (
          <Ready stats={load.stats} />
        )}
      </main>
    </AppShell>
  );
}

/** Nothing studied yet: say what will appear here, and give the one way to start. */
function FirstVisit() {
  return (
    <section className="mt-6">
      <p className="max-w-[56ch] text-[16.5px] leading-relaxed text-muted">
        Progress fills in as you study. Each lesson you start from the syllabus marks its station on the line, and the ideas it asks you to remember come back in your daily review. After a few days you&rsquo;ll see how much you still recall a day, a week and a month later.
      </p>
      <Link href="/start" className="mt-5 inline-flex h-11 items-center gap-2 rounded-md bg-accent px-5 text-[15px] font-semibold text-bg hover:bg-accent-ink active:scale-[0.97]">
        Start with the syllabus <Icon.arrowRight size={15} />
      </Link>
      <SyllabusProgress byLesson={[]} />
    </section>
  );
}

function Ready({ stats }: { stats: ReviewStats }) {
  const toReview = stats.due + stats.newAvailable;
  const parts = [
    toReview ? `${toReview} ${toReview === 1 ? "card" : "cards"} to review now` : "Nothing to review right now",
    stats.reviewedToday ? `${stats.reviewedToday} reviewed today` : null,
    stats.streakDays ? `${stats.streakDays}-day streak` : null,
    `${stats.learned} of ${stats.totalCards} ideas settled`,
  ].filter(Boolean);
  const tested = stats.retention.some((b) => b.reviews > 0);

  return (
    <>
      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3">
        <p className="text-[17px] tnum">{parts.join(" · ")}</p>
        {toReview > 0 && (
          <Link href="/review" className="inline-flex h-10 items-center gap-2 rounded-md bg-accent px-4 text-[14.5px] font-semibold text-bg hover:bg-accent-ink active:scale-[0.97]">
            Start review <Icon.arrowRight size={15} />
          </Link>
        )}
      </div>

      <SyllabusProgress byLesson={stats.lessons} />

      <section aria-labelledby="remember-h" className="mt-14">
        <h2 id="remember-h" className="text-[19px] font-semibold">How much you remember</h2>
        <p className="mt-1 max-w-[60ch] text-[14.5px] text-muted">Of the ideas you had already learned, the share you still recalled, by how long it had been since you last saw them.</p>
        {tested ? (
          <table className="mt-4 w-full max-w-[640px] border-collapse text-[15px]">
            <tbody>
              {stats.retention.map((b) => {
                const pct = b.reviews ? Math.round((b.recalled / b.reviews) * 100) : null;
                return (
                  <tr key={b.bucket} className="border-b border-rule">
                    <th scope="row" className="w-[120px] py-3 pr-4 text-left font-normal text-muted">{b.bucket}</th>
                    <td className="py-3 pr-4">
                      <span className="block h-[3px] bg-rule" aria-hidden>
                        <span className="block h-full bg-line" style={{ width: `${pct ?? 0}%` }} />
                      </span>
                    </td>
                    <td className="w-[150px] py-3 text-right text-muted tnum">{pct === null ? "not yet" : `${pct}% of ${b.reviews}`}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p className="mt-3 rounded-lg bg-frame px-4 py-3 text-[14.5px] text-muted">This fills in once you review cards a day or more after learning them.</p>
        )}
      </section>
    </>
  );
}

const DOT: Record<StationState, string> = {
  here: "h-5 w-5 border-line bg-board",
  overdue: "h-3.5 w-3.5 border-brick bg-brick",
  settled: "h-3.5 w-3.5 border-ok bg-ok",
  started: "h-3.5 w-3.5 border-line bg-line",
  open: "h-3.5 w-3.5 border-line bg-bg",
};
const STATE_WORD: Record<StationState, string | null> = { here: "where you are", overdue: "cards overdue", settled: "every idea settled", started: "started", open: null };

/**
 * The syllabus as the same line used on Learn, one part at a time: a filled station has lessons
 * started from it, with how many of their ideas have settled. Other lessons are listed after.
 */
function SyllabusProgress({ byLesson }: { byLesson: ReviewStats["lessons"] }) {
  const ready = useRouteHydrated();
  const lessonsMap = useRoute((s) => s.lessons);
  const started = useRoute((s) => s.started);
  const here = useRoute((s) => s.station);
  if (!ready) return <div aria-hidden className="mt-12 h-[320px]" />;

  const perStation = new Map<string, { cards: number; learned: number; overdue: number }>();
  const unmatched: ReviewStats["lessons"] = [];
  for (const l of byLesson) {
    const sid = lessonsMap[l.lessonId];
    if (!sid) { unmatched.push(l); continue; }
    const cur = perStation.get(sid) ?? { cards: 0, learned: 0, overdue: 0 };
    perStation.set(sid, { cards: cur.cards + l.cards, learned: cur.learned + l.learned, overdue: cur.overdue + (l.overdue ?? 0) });
  }

  return (
    <section aria-labelledby="line-h" className="mt-12">
      <h2 id="line-h" className="text-[19px] font-semibold">The syllabus</h2>
      <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13.5px] text-muted">
        <span className="inline-flex items-center gap-1.5"><span aria-hidden className="h-3 w-3 rounded-full border-[3px] border-line bg-board" />Where you are</span>
        <span className="inline-flex items-center gap-1.5"><span aria-hidden className="h-3 w-3 rounded-full border-[3px] border-line bg-line" />Started</span>
        <span className="inline-flex items-center gap-1.5"><span aria-hidden className="h-3 w-3 rounded-full border-[3px] border-ok bg-ok" />Every idea settled</span>
        <span className="inline-flex items-center gap-1.5"><span aria-hidden className="h-3 w-3 rounded-full border-[3px] border-brick bg-brick" />Cards overdue</span>
      </p>
      <div className="mt-4 grid gap-x-12 gap-y-8 md:grid-cols-2">
        {PARTS.map((p) => (
          <div key={p.id}>
            <h3 className="text-[15px] font-semibold text-muted">{p.label}</h3>
            <ol className="relative mt-2">
              <span aria-hidden className="absolute bottom-[22px] left-[13px] top-[22px] w-[3px] bg-line" />
              {stationsOf(p.id).map((s) => {
                const n = started[s.id] ?? 0;
                const c = perStation.get(s.id);
                const isHere = s.id === here;
                const state = stationState(isHere, { lessons: n, cards: c?.cards ?? 0, learned: c?.learned ?? 0, overdue: c?.overdue ?? 0 });
                const dot = DOT[state];
                return (
                  <li key={s.id} className="relative flex min-h-11 items-center gap-3">
                    <span className="grid w-7 shrink-0 place-items-center"><span aria-hidden className={`block rounded-full border-[3px] ${dot}`} /></span>
                    {isHere ? (
                      <span className="flex-1"><span className="board-type inline-block border-2 border-line bg-board px-1.5 pb-0.5 pt-1 text-[15px] text-board-ink">{s.name}</span><span className="sr-only">, where you are</span></span>
                    ) : (
                      <span className={`flex-1 text-[15px] ${n ? "font-semibold" : "text-muted"}`}>{s.name}{STATE_WORD[state] ? <span className="sr-only">, {STATE_WORD[state]}</span> : null}</span>
                    )}
                    <span className="text-right text-[13.5px] text-muted tnum">
                      {n ? `${n} ${n === 1 ? "lesson" : "lessons"}${c ? ` · ${c.learned} of ${c.cards} settled` : ""}` : ""}
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>
        ))}
      </div>
      {unmatched.length > 0 && (
        <div className="mt-10">
          <h3 className="text-[15px] font-semibold text-muted">Other lessons</h3>
          <ul className="mt-2 border-t border-rule">
            {unmatched.map((l) => (
              <li key={l.lessonId} className="flex min-h-11 items-center gap-3 border-b border-rule py-2 text-[15px]">
                <span className="flex-1">{l.topic || "Untitled lesson"}</span>
                <span className="text-[13.5px] text-muted tnum">{l.learned} of {l.cards} settled</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
