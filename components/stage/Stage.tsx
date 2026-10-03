"use client";

import { useEffect, useState } from "react";
import type { Block } from "@/lib/contracts";
import { useWorkspace } from "@/lib/store/workspace";
import { BlockFrame } from "./BlockFrame";
import { TimeSpine } from "./TimeSpine";
import { LandingChips } from "./LandingChips";

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

export function orderedBlocks(blocks: Block[], pinned: string[]): Block[] {
  const pins = pinned.map((id) => blocks.find((b) => b.id === id)).filter((b): b is Block => !!b);
  return [...pins, ...blocks.filter((b) => !pinned.includes(b.id))];
}

/** Track which block is at the top of the reading area. */
export function useCurrentBlock(ids: string[]) {
  const [current, setCurrent] = useState<string | null>(null);
  const key = ids.join(",");
  useEffect(() => {
    const els = key ? key.split(",").map((id) => document.getElementById(`block-${id}`)).filter(Boolean) as HTMLElement[] : [];
    if (!els.length) return;
    const visible = new Map<string, number>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const id = (e.target as HTMLElement).dataset.block!;
          if (e.isIntersecting) visible.set(id, e.boundingClientRect.top);
          else visible.delete(id);
        }
        const order = key.split(",");
        const first = order.find((id) => visible.has(id));
        if (first) setCurrent(first);
      },
      { rootMargin: "-80px 0px -45% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
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

  return (
    <div className="mx-auto flex w-full max-w-[1040px] gap-6 px-4 pb-40 pt-8 md:px-8">
      <div className="sticky top-20 hidden h-[calc(100vh-7rem)] w-6 shrink-0 md:block">
        <TimeSpine blocks={list} currentId={current} />
      </div>
      <div className="min-w-0 max-w-[680px] flex-1">
        {list.length === 0 && (
          streaming ? <StageSkeleton /> : (
            <p className="py-16 text-center font-serif text-[18px] italic text-muted">Nothing on the Stage yet. Ask about a period, an event or a person.</p>
          )
        )}
        <div className="space-y-14">
          {list.map((b) => (
            <BlockFrame key={b.id} block={b} blurred={blurred.has(b.id)} />
          ))}
        </div>
        {streaming && list.length > 0 && <div className="progress-rule mt-12 w-24" aria-hidden />}
        <LandingChips />
      </div>
      {margin && <div className="relative hidden w-[280px] shrink-0 xl:block">{margin}</div>}
    </div>
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
