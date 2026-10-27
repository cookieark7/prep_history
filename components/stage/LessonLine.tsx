"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import type { Block } from "@/lib/contracts";
import type { RailItem } from "@/lib/rail";
import { blockPeriod } from "@/lib/period";
import { formatYear } from "@/lib/layout/years";
import { TYPE_LABEL } from "@/lib/store/reducer";
import { useWorkspace } from "@/lib/store/workspace";
import { scrollToBlock } from "@/components/blocks/Markdown";
import { StationDot } from "@/components/route/RouteLine";

/**
 * The lesson as a short line (laptops): one station per block in reading order, its date beside
 * it, the block in view on the yellow board, read blocks filled in. The same drawing as the
 * syllabus route on the home page. Roving tabindex: arrows move, Enter jumps, Tab leaves.
 */
export function LessonLine({ items, blocks, current }: { items: RailItem[]; blocks: Block[]; current: string | null }) {
  const flashBlock = useWorkspace((s) => s.flashBlock);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const activeIdx = Math.max(0, items.findIndex((i) => i.id === current));
  const [focusIdx, setFocusIdx] = useState<number | null>(null);
  const tabIdx = focusIdx ?? activeIdx;
  if (!items.length) return null;

  const periods = new Map(blocks.map((b) => [b.id, blockPeriod(b)]));
  const era = [...periods.values()].some((p) => p && p[0] < 0);
  const done = items.filter((i) => i.complete).length;

  const onKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const next = e.key === "ArrowDown" ? i + 1 : e.key === "ArrowUp" ? i - 1 : e.key === "Home" ? 0 : e.key === "End" ? items.length - 1 : null;
    if (next == null) return;
    e.preventDefault();
    const n = Math.max(0, Math.min(items.length - 1, next));
    setFocusIdx(n);
    refs.current[n]?.focus();
  };

  return (
    <nav aria-label={`Lesson outline, ${done} of ${items.length} read`} className="sticky top-24 hidden w-[112px] shrink-0 self-start md:block">
      <ol className="relative">
        <span aria-hidden className="absolute bottom-[22px] right-[12.5px] top-[22px] w-[3px] bg-line" />
        {items.map((it, i) => {
          const here = it.id === current;
          const p = periods.get(it.id);
          const label = p ? formatYear(p[0], { era }) : TYPE_LABEL[it.type];
          return (
            <li key={it.id}>
              <button
                ref={(el) => { refs.current[i] = el; }}
                type="button"
                tabIndex={i === tabIdx ? 0 : -1}
                onKeyDown={(e) => onKey(e, i)}
                onFocus={() => setFocusIdx(i)}
                onBlur={() => setFocusIdx(null)}
                onClick={() => scrollToBlock(it.id, null, flashBlock)}
                aria-current={here ? "true" : undefined}
                aria-label={`${TYPE_LABEL[it.type]}: ${it.title}${it.complete ? ", read" : ""}`}
                className="group relative flex h-11 w-full items-center justify-end gap-2 rounded-md"
              >
                <span
                  className={`whitespace-nowrap text-[12.5px] tnum ${
                    here ? "rounded-[2px] border-2 border-line bg-board px-1.5 py-px font-bold text-board-ink" : p ? "text-muted" : "text-[12px] text-muted"
                  }`}
                >
                  {label}
                </span>
                <span className="relative grid w-7 shrink-0 place-items-center">
                  <StationDot here={here} started={it.complete} size="sm" />
                  <Arrival id={it.id} />
                </span>
                <span className="pointer-events-none absolute left-full top-1/2 z-10 ml-3 max-w-72 -translate-y-1/2 truncate whitespace-nowrap rounded-md border border-rule bg-surface px-2.5 py-1.5 text-[13px] text-text opacity-0 shadow-[var(--shadow-float)] transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100">
                  <span className="text-muted">{TYPE_LABEL[it.type]}:</span> {it.title}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** A brief ring when a block lands or changes, keyed so each arrival re-runs it. */
function Arrival({ id }: { id: string }) {
  const arrived = useWorkspace((s) => s.arrivals[id]);
  if (!arrived) return null;
  return <span key={arrived} aria-hidden className="arrive pointer-events-none absolute -inset-1 rounded-full" />;
}
