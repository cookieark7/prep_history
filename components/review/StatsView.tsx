"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ACCOUNTS } from "@/lib/auth";
import { startSync } from "@/lib/store/sync";
import { useHydrated } from "@/components/ui/hydration";
import { AppShell } from "@/components/shell/AppShell";
import type { ReviewStats } from "@/lib/review/repo";

// Progress (docs/PROTOTYPE_PLAN.md, section 7.5): what's due, the streak, and the number that
// matters — how much is still remembered after a day, a week, a month.

export function StatsView() {
  const hydrated = useHydrated();
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!hydrated || !ACCOUNTS) return;
    let live = true;
    void startSync()
      .then(() => fetch(`/api/review/stats?tz=${-new Date().getTimezoneOffset()}`))
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: ReviewStats) => { if (live) setStats(d); })
      .catch(() => { if (live) setFailed(true); });
    return () => { live = false; };
  }, [hydrated]);

  const toReview = stats ? stats.due + stats.newAvailable : 0;
  return (
    <AppShell place="progress">
      <main className="mx-auto max-w-[720px] px-4 pb-16 pt-6 md:px-6 md:pt-10">
        <h1 className="font-heading text-[30px] leading-tight md:text-[36px]">Your progress</h1>

        {!ACCOUNTS ? (
          <p className="mt-4 text-[15px] text-muted">Progress needs the database (DATABASE_URL and NEXT_PUBLIC_CHRONICLE_ACCOUNTS=1).</p>
        ) : failed ? (
          <p className="mt-4 text-[15px] text-muted">Couldn&rsquo;t load your progress. Try again in a moment.</p>
        ) : !stats ? (
          <div className="mt-10"><div className="progress-rule w-40" /></div>
        ) : (
          <>
            <section className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Tile label="To review now" value={toReview} />
              <Tile label="Day streak" value={stats.streakDays} />
              <Tile label="Reviewed today" value={stats.reviewedToday} />
              <Tile label="Ideas learned" value={`${stats.learned} / ${stats.totalCards}`} />
            </section>
            {toReview > 0 && (
              <Link href="/review" className="mt-4 inline-flex h-11 items-center rounded-[7px] bg-accent px-5 text-[14px] font-semibold text-surface hover:bg-accent-ink">
                Review {toReview} card{toReview === 1 ? "" : "s"}
              </Link>
            )}

            <section className="mt-10">
              <h2 className="font-heading text-[20px] font-semibold">How much you remember</h2>
              <p className="mt-1 text-[13.5px] text-muted">Of the ideas you had already learned, the share you still recalled, by time since you last saw them.</p>
              <div className="mt-4 space-y-3">
                {stats.retention.map((b) => {
                  const pct = b.reviews ? Math.round((b.recalled / b.reviews) * 100) : null;
                  return (
                    <div key={b.bucket} className="grid grid-cols-[110px_1fr_auto] items-center gap-3 text-[14px]">
                      <span className="text-muted">{b.bucket}</span>
                      <span className="h-2.5 overflow-hidden rounded-full bg-rule" aria-hidden>
                        <span className="block h-full rounded-full bg-accent" style={{ width: `${pct ?? 0}%` }} />
                      </span>
                      <span className="tnum min-w-[96px] text-right text-[12px]">{pct === null ? "no data yet" : `${pct}% of ${b.reviews}`}</span>
                    </div>
                  );
                })}
              </div>
            </section>

            {stats.lessons.length > 0 && (
              <section className="mt-10">
                <h2 className="font-heading text-[20px] font-semibold">By lesson</h2>
                <ul className="mt-3 border-t border-rule">
                  {stats.lessons.map((l) => (
                    <li key={l.lessonId} className="flex min-h-12 items-center gap-3 border-b border-rule py-2 text-[14.5px]">
                      <span className="flex-1 font-heading text-[16px]">{l.topic || "Untitled lesson"}</span>
                      <span className="tnum text-[12px] text-muted">{l.learned} of {l.cards} learned</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </main>
    </AppShell>
  );
}

function Tile({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-md border border-rule bg-surface px-3.5 py-3">
      <p className="tnum text-[22px] text-text">{value}</p>
      <p className="mt-0.5 text-[12.5px] text-muted">{label}</p>
    </div>
  );
}
