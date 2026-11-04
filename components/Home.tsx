"use client";

import { useRef, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DEFAULT_SOURCE_PROMPT } from "@/lib/composer";
import { PasteCard, useComposer, type ComposerSubmit } from "@/components/chat/useComposer";
import type { Goal } from "@/lib/contracts";
import { useWorkspace } from "@/lib/store/workspace";
import { useHydrated } from "@/components/ui/hydration";
import { openLesson, useLessonList } from "@/lib/store/sync";
import { sendTurn } from "@/lib/stream-client";
import { formatRange } from "@/lib/layout/years";
import { Icon } from "@/components/ui/icons";
import { AppShell } from "@/components/shell/AppShell";
import { RouteLine, RouteList } from "@/components/route/RouteLine";
import { StationDetails } from "@/components/route/StationDetails";
import { PARTS, STATIONS, stationById, stationsOf, type Station } from "@/content/syllabus";
import { levelFor, useRoute, useRouteHydrated } from "@/lib/syllabus/route";
import { partAsk } from "@/content/series";
import { useReviewStats, waitingCount, type ReviewStatus } from "@/lib/review/useReviewStats";
import { quotaText, useQuota } from "@/lib/turns/useQuota";

// What the lesson is for (docs/MODES_PLAN.md). It replaces the level picker: the level is worked
// out from where the lesson starts (lib/syllabus/route.ts levelFor).
const GOALS: { id: Goal; label: string; says: string }[] = [
  { id: "exam", label: "Exam prep", says: "Key facts, the explanation, a timeline, terms and practice questions" },
  { id: "explore", label: "Explore", says: "Led by the story and your questions" },
];

export function Home() {
  const hydrated = useHydrated();
  const routeReady = useRouteHydrated();
  const router = useRouter();

  const part = useRoute((s) => s.part);
  const stationId = useRoute((s) => s.station);
  const started = useRoute((s) => s.started);
  const goal = useRoute((s) => s.goal);
  const read = useRoute((s) => s.read);
  const partsStarted = useRoute((s) => s.parts);
  const lessonStations = useRoute((s) => s.lessons);
  const review = useReviewStats(hydrated);
  const quota = useQuota(hydrated);

  const begin = (message: string, opts: { topic?: string; card?: ComposerSubmit["card"]; station?: string; part?: string } = {}) => {
    const route = useRoute.getState();
    useWorkspace.getState().startLesson(opts.topic ?? message, levelFor(opts.station, route.started), route.goal);
    void sendTurn({ message, sourceText: opts.card?.text, attachmentWords: opts.card?.words });
    if (opts.station) route.markStarted(opts.station, useWorkspace.getState().lessonId, opts.part);
    router.push("/study");
  };

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const composer = useComposer({
    ref: inputRef,
    streaming: false,
    onSubmit: ({ text, card }) => {
      const t = text.trim() || (card ? DEFAULT_SOURCE_PROMPT : "");
      if (t) begin(t, { topic: text.trim() || "Pasted reading", card });
    },
  });
  const onSubmit = (e: FormEvent) => { e.preventDefault(); void composer.submit(); };

  const stations = stationsOf(part);
  const here = stationById(stationId) ?? stations[0];
  const startedCount = STATIONS.filter((s) => started[s.id]).length;
  const partLabel = PARTS.find((p) => p.id === part)?.label ?? "";
  // parts of this station's series with a lesson started, to tell "started" from "not yet"
  const startedParts = (s: Station) => new Set(Object.entries(partsStarted).filter(([lid]) => lessonStations[lid] === s.id).map(([, p]) => p));
  const details = (s: Station) => (
    <StationDetails
      station={s}
      onAsk={(q, topic) => begin(q, { topic, station: s.id })}
      series={{
        read, started: startedParts(s),
        onStart: (p) => {
          // a part already begun opens its latest lesson; otherwise its lesson starts now
          const lid = Object.keys(partsStarted).filter((id) => partsStarted[id] === p.id && lessonStations[id] === s.id).pop();
          const fresh = () => { const a = partAsk(s, p); begin(a.message, { topic: a.topic, station: s.id, part: p.id }); };
          if (!lid) return fresh();
          if (lid === useWorkspace.getState().lessonId) return router.push("/study");
          void openLesson(lid).then((ok) => (ok ? router.push("/study") : fresh()));
        },
      }}
    />
  );

  return (
    <AppShell place="learn">
      <main className="mx-auto max-w-[1120px] px-4 pb-16 pt-6 md:px-10 md:pt-10">
        <h1 className="font-heading text-[28px] font-bold leading-tight tracking-[-0.015em] md:text-[34px]">History for GS Paper I</h1>
        <p className="mt-1.5 text-[15px] text-muted">
          {STATIONS.length} stations from the Stone Age to the Cold War{routeReady && startedCount > 0 ? ` · you have started ${startedCount}` : ""}
        </p>

        <form onSubmit={onSubmit} className="mt-6">
          <div className="rounded-lg border border-rule-strong bg-bg transition-colors focus-within:border-accent">
            {composer.card && <PasteCard card={composer.card} onRemove={() => composer.setCard(null)} />}
            <label htmlFor="home-composer" className="sr-only">Topic or question</label>
            <textarea
              id="home-composer"
              ref={inputRef}
              rows={2}
              maxLength={1000}
              value={composer.text}
              onChange={(e) => composer.setText(e.target.value)}
              onKeyDown={composer.onKeyDown}
              onPaste={composer.onPaste}
              placeholder={composer.card ? "What do you want from this? (optional)" : "Ask about any topic, person, place or year, or paste a paragraph you're reading"}
              className="block min-h-[64px] w-full resize-none bg-transparent px-4 pt-3.5 text-[17px] leading-[25px] outline-none! placeholder:text-muted"
            />
            <div className="flex flex-wrap items-center justify-between gap-2 px-2.5 pb-2.5 pt-1">
              <div className="flex gap-0.5" role="radiogroup" aria-label="What this lesson is for">
                {GOALS.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    role="radio"
                    aria-checked={routeReady && goal === g.id}
                    onClick={() => useRoute.getState().setGoal(g.id)}
                    className={`h-9 rounded-md px-2.5 text-[13.5px] ${routeReady && goal === g.id ? "bg-sunk font-semibold text-text" : "text-muted hover:bg-hover hover:text-text"}`}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
              <button
                type="submit"
                disabled={!composer.canSend}
                className="ml-auto inline-flex h-10 items-center gap-2 rounded-md bg-accent px-4 text-[14.5px] font-semibold text-bg transition-[background-color,transform] duration-150 hover:bg-accent-ink active:scale-[0.97] disabled:bg-sunk disabled:text-muted"
              >
                Start lesson <Icon.arrowRight size={15} />
              </button>
            </div>
          </div>
          <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 px-1 text-[13px] text-muted">
            {routeReady && <span>{GOALS.find((g) => g.id === goal)?.says}</span>}
            {quota && <span className={`tnum ${quota.left <= 3 ? "text-brick" : ""}`}>{quotaText(quota)}</span>}
          </p>
        </form>

        <div className="mt-5 lg:hidden">
          <ReviewPanel status={review} compact />
        </div>

        <section aria-labelledby="route-heading" className="mt-10">
          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2 border-b border-rule">
            <h2 id="route-heading" className="pb-2 text-[18px] font-semibold">The syllabus</h2>
            <div className="-mb-px flex overflow-x-auto scroll-thin" role="group" aria-label="Part of the syllabus">
              {PARTS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  aria-pressed={part === p.id}
                  onClick={() => useRoute.getState().setPart(p.id)}
                  className={`h-10 shrink-0 whitespace-nowrap border-b-2 px-3 text-[14.5px] ${part === p.id ? "border-line font-semibold text-text" : "border-transparent text-muted hover:text-text"}`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {routeReady ? (
            <>
              <div className="mt-7 hidden lg:block">
                <RouteLine stations={stations} current={here.id} started={started} onSelect={(id) => useRoute.getState().setStation(id)} label={`${partLabel} stations`} />
              </div>
              <div className="mt-4 lg:hidden">
                <RouteList stations={stations} current={here.id} started={started} onSelect={(id) => useRoute.getState().setStation(id)} label={`${partLabel} stations`} details={details} />
              </div>
              <div className="mt-4 hidden grid-cols-[minmax(0,1fr)_320px] gap-12 lg:grid">
                {details(here)}
                <ReviewPanel status={review} />
              </div>
            </>
          ) : (
            <div aria-hidden className="h-[420px]" />
          )}
        </section>

        <RecentLessons hydrated={hydrated} />
      </main>
    </AppShell>
  );
}

function ReviewPanel({ status, compact = false }: { status: ReviewStatus; compact?: boolean }) {
  if (status.state === "off") return null;
  const n = waitingCount(status);
  const minutes = Math.max(1, Math.round((n * 15) / 60));

  if (compact) {
    if (status.state !== "ready" || n === 0) return null;
    return (
      <Link href="/review" className="flex min-h-14 items-center gap-3 rounded-lg bg-frame px-4 py-3 hover:bg-hover">
        <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-[3px] bg-board px-1.5 text-[14px] font-bold text-board-ink tnum">{n}</span>
        <span className="flex-1 text-[15px]"><span className="font-semibold">To review today</span><span className="text-muted"> · about {minutes} min</span></span>
        <Icon.arrowRight size={16} className="text-accent" />
      </Link>
    );
  }

  return (
    <aside aria-labelledby="review-heading" className="self-start rounded-lg bg-frame p-5">
      <h3 id="review-heading" className="text-[16px] font-semibold">Daily review</h3>
      {status.state === "loading" && <p className="mt-3 h-5 w-40 animate-pulse rounded bg-sunk" aria-label="Loading" />}
      {status.state === "error" && <p className="mt-2 text-[14.5px] text-muted">Your review could not be loaded. It will try again next time you open this page.</p>}
      {status.state === "ready" && n > 0 && (
        <>
          <p className="mt-2 text-[24px] font-bold leading-tight tnum">{n} {n === 1 ? "card" : "cards"} to review</p>
          <p className="mt-1 text-[14.5px] text-muted">
            About {minutes} min{status.stats.due ? ` · ${status.stats.due} due` : ""}{status.stats.newAvailable ? ` · ${status.stats.newAvailable} new` : ""}
          </p>
          <Link href="/review" className="mt-4 inline-flex h-10 items-center gap-2 rounded-md bg-accent px-4 text-[14.5px] font-semibold text-bg transition-[background-color,transform] duration-150 hover:bg-accent-ink active:scale-[0.97]">
            Start review <Icon.arrowRight size={15} />
          </Link>
          {status.stats.streakDays > 0 && <p className="mt-3 text-[13.5px] text-muted tnum">{status.stats.streakDays}-day streak</p>}
        </>
      )}
      {status.state === "ready" && n === 0 && status.stats.totalCards > 0 && (
        <>
          <p className="mt-2 text-[15px]">Nothing to review right now.</p>
          <p className="mt-1 text-[14px] text-muted tnum">{status.stats.reviewedToday ? `${status.stats.reviewedToday} reviewed today. ` : ""}{status.stats.learned} of {status.stats.totalCards} cards settled.</p>
          <Link href="/stats" className="mt-3 inline-block text-[14px] font-semibold text-accent underline-offset-4 hover:underline">See your progress</Link>
        </>
      )}
      {status.state === "ready" && status.stats.totalCards === 0 && (
        <p className="mt-2 text-[14.5px] text-muted">Every lesson ends with what to remember. Those become cards here, and come back just before you would forget them.</p>
      )}
    </aside>
  );
}

function RecentLessons({ hydrated }: { hydrated: boolean }) {
  const router = useRouter();
  const curId = useWorkspace((s) => s.lessonId);
  const curTopic = useWorkspace((s) => s.topic);
  const curCount = useWorkspace((s) => s.blocks.length);
  const recent = useLessonList(hydrated);
  if (!hydrated) return null;

  const rows = [
    ...(curCount ? [{ id: curId, topic: curTopic || "Current lesson", period: null as [number, number] | null, blocks: curCount, when: "Open now", open: () => router.push("/study") }] : []),
    ...recent.filter((r) => r.id !== curId).slice(0, 8).map((r) => ({
      id: r.id, topic: r.topic, period: r.period, blocks: r.blockCount,
      when: new Date(r.updatedAt).toLocaleDateString(undefined, { day: "numeric", month: "short" }),
      open: () => { void openLesson(r.id).then((ok) => ok && router.push("/study")); },
    })),
  ];

  return (
    <section aria-labelledby="recent-heading" className="mt-14">
      <h2 id="recent-heading" className="text-[18px] font-semibold">Recent lessons</h2>
      {rows.length === 0 ? (
        <p className="mt-2 text-[15px] text-muted">Lessons you start appear here, on this device and any other you sign in on.</p>
      ) : (
        <table className="mt-3 w-full border-collapse text-left text-[15px]">
          <thead>
            <tr className="border-b border-rule-strong text-[13px] text-muted">
              <th scope="col" className="py-2 pr-4 font-medium">Lesson</th>
              <th scope="col" className="hidden py-2 pr-4 font-medium sm:table-cell">Period</th>
              <th scope="col" className="hidden py-2 pr-4 text-right font-medium md:table-cell">Parts</th>
              <th scope="col" className="py-2 text-right font-medium">Opened</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-rule hover:bg-hover">
                <td className="py-0 pr-4">
                  <button type="button" onClick={r.open} className="block min-h-12 w-full py-3 text-left font-medium hover:text-accent">{r.topic}</button>
                </td>
                <td className="hidden whitespace-nowrap pr-4 text-muted tnum sm:table-cell">{r.period ? formatRange(r.period[0], r.period[1]) : "–"}</td>
                <td className="hidden pr-4 text-right text-muted tnum md:table-cell">{r.blocks}</td>
                <td className="whitespace-nowrap text-right text-muted tnum">{r.when}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
