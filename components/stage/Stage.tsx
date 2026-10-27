"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useWorkspace } from "@/lib/store/workspace";
import { BlockFrame } from "./BlockFrame";
import { LandingChips } from "./LandingChips";
import { orderedBlocks } from "@/lib/rail";
import { lessonSpan } from "@/lib/period";
import { formatRange } from "@/lib/layout/years";
import { ACCOUNTS } from "@/lib/auth";
import { stationById } from "@/content/syllabus";
import { useRoute, useRouteHydrated } from "@/lib/syllabus/route";
import { Icon } from "@/components/ui/icons";
import { LessonLine } from "./LessonLine";
import { useDwellCompletion, useRailItems } from "./LessonRail";

/** Ids of blocks still hidden behind an unanswered prediction gate. */
export function useBlurred(): Set<string> {
  const blocks = useWorkspace((s) => s.blocks);
  const gates = useWorkspace((s) => s.gates);
  const out = new Set<string>();
  for (const b of blocks) {
    if (b.type !== "predict_gate") continue;
    const g = gates[b.id];
    if (!g || (g.answer == null && !g.skipped)) out.add(b.reveals);
  }
  return out;
}

export { orderedBlocks };

/**
 * The block being read: the last one whose top has passed the upper 40% of the screen (the first
 * block until then). A long block stays current until the next one's heading comes up.
 */
export function useCurrentBlock(ids: string[]) {
  const [current, setCurrent] = useState<string | null>(null);
  const key = ids.join(",");
  useEffect(() => {
    const order = key ? key.split(",") : [];
    if (!order.length) return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const line = window.innerHeight * 0.4;
      let pick = order[0];
      for (const id of order) {
        const el = document.getElementById(`block-${id}`);
        if (el && el.getBoundingClientRect().top <= line) pick = id;
      }
      setCurrent(pick);
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(measure); };
    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [key]);
  return current;
}

export function ReaderStage({ margin }: { margin?: React.ReactNode }) {
  const blocks = useWorkspace((s) => s.blocks);
  const pinned = useWorkspace((s) => s.pinned);
  const streaming = useWorkspace((s) => s.streaming);
  const blurred = useBlurred();
  const list = orderedBlocks(blocks, pinned);
  const current = useCurrentBlock(list.map((b) => b.id));
  const rail = useRailItems();
  useDwellCompletion(rail);

  return (
    <div className="mx-auto flex w-full max-w-[1080px] gap-6 px-4 pb-40 pt-8 md:px-8 md:pt-10">
      <LessonLine items={rail} blocks={list} current={current} />
      <div className="min-w-0 max-w-[680px] flex-1">
        <LessonHeader read={rail.filter((r) => r.complete).length} />
        {list.length === 0 && (
          streaming ? <StageSkeleton /> : (
            <p className="py-12 text-[16px] text-muted">Nothing here yet. Ask about a period, an event or a person, and the lesson builds here.</p>
          )
        )}
        <div className="space-y-14">
          {list.map((b) => (
            <BlockFrame key={b.id} block={b} blurred={blurred.has(b.id)} current={b.id === current} />
          ))}
        </div>
        {streaming && list.length > 0 && <div className="progress-rule mt-12 w-24" aria-hidden />}
        {!streaming && <ToRemember />}
        <LandingChips />
      </div>
      {margin && <div className="relative hidden w-[260px] shrink-0 xl:block">{margin}</div>}
    </div>
  );
}

/**
 * The lesson's title (editable), and where it sits in time: its span on a scrap of station
 * board, and the syllabus station it was started from, if any.
 */
function LessonHeader({ read }: { read: number }) {
  const topic = useWorkspace((s) => s.topic);
  const lessonId = useWorkspace((s) => s.lessonId);
  const blocks = useWorkspace((s) => s.blocks);
  const routeReady = useRouteHydrated();
  const stationId = useRoute((s) => s.lessons[lessonId]);
  const station = routeReady ? stationById(stationId) : null;
  const span = useMemo(() => lessonSpan(blocks), [blocks]);

  return (
    <header className="mb-12">
      <h1 className="sr-only">{topic || "Untitled lesson"}</h1>
      <label className="sr-only" htmlFor="lesson-title">Lesson title</label>
      {/* the title wraps like a heading: an invisible copy of the text sizes the field (same grid cell, same type) */}
      <div data-value={`${topic || "Untitled lesson"} `} className="grid font-heading text-[28px] font-bold leading-[1.2] tracking-[-0.015em] after:invisible after:whitespace-pre-wrap after:break-words after:content-[attr(data-value)] after:[grid-area:1/1] md:text-[34px]">
        <textarea
          id="lesson-title"
          rows={1}
          value={topic}
          onChange={(e) => useWorkspace.getState().setTopic(e.target.value.replace(/\n/g, " "))}
          placeholder="Untitled lesson"
          className="block w-full resize-none overflow-hidden bg-transparent text-text outline-none! [font:inherit] [grid-area:1/1] [letter-spacing:inherit] placeholder:text-muted"
        />
      </div>
      {(span || station || blocks.length > 0) && (
        <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-[14px] text-muted">
          {span && (
            <span className="rounded-[2px] border-2 border-line bg-board px-2 py-0.5 text-[13.5px] font-bold text-board-ink tnum">
              {formatRange(span[0], span[1])}
            </span>
          )}
          {station && (
            <Link href="/start" onClick={() => useRoute.getState().setStation(station.id)} className="inline-flex items-center gap-1.5 text-text underline-offset-4 hover:underline">
              <Icon.learn size={15} /> {station.name}
            </Link>
          )}
          {blocks.length > 0 && <span className="tnum">{blocks.length} {blocks.length === 1 ? "part" : "parts"} · {read} read</span>}
        </p>
      )}
    </header>
  );
}

/** Principle 1: every lesson ends with what to remember, which is what comes back in review. */
function ToRemember() {
  const chat = useWorkspace((s) => s.chat);
  const items = useMemo(() => [...new Set(chat.flatMap((c) => (c.role === "director" ? c.remember ?? [] : [])))], [chat]);
  if (!items.length) return null;
  return (
    <section aria-labelledby="remember-heading" className="mt-16 rounded-lg bg-frame px-5 py-6 md:px-7">
      <h2 id="remember-heading" className="font-heading text-[22px] font-semibold">To remember</h2>
      <p className="mt-1 text-[14.5px] text-muted">
        {ACCOUNTS ? `${items.length} ideas from this lesson are in your daily review. Each comes back just before you would forget it.` : `${items.length} ideas from this lesson.`}
      </p>
      <ol className="mt-5 space-y-3">
        {items.map((f) => (
          <li key={f} className="flex gap-3 text-[16px] leading-[1.5]">
            <span aria-hidden className="mt-[7px] h-2.5 w-2.5 shrink-0 rounded-full border-2 border-line bg-board" />
            <span>{f}</span>
          </li>
        ))}
      </ol>
      {ACCOUNTS && (
        <Link href="/review" className="mt-6 inline-flex h-10 items-center gap-2 rounded-md bg-accent px-4 text-[14.5px] font-semibold text-bg transition-[background-color,transform] duration-150 hover:bg-accent-ink active:scale-[0.97]">
          Review now <Icon.arrowRight size={15} />
        </Link>
      )}
    </section>
  );
}

function StageSkeleton() {
  return (
    <div aria-hidden className="space-y-3 py-6">
      <div className="h-6 w-2/3 rounded-[2px] bg-hover" />
      <div className="h-3 w-1/3 rounded-[2px] bg-hover" />
      <div className="mt-6 h-4 w-full rounded-[2px] bg-hover" />
      <div className="h-4 w-11/12 rounded-[2px] bg-hover" />
      <div className="h-4 w-4/5 rounded-[2px] bg-hover" />
    </div>
  );
}
