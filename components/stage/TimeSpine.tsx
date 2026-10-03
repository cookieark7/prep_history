"use client";

import type { Block } from "@/lib/contracts";
import { blockPeriod } from "@/lib/period";
import { formatYear, toAstro } from "@/lib/layout/years";

/** Each block's period; blocks without one borrow from the nearest neighbour that has one. */
export function periodsFor(blocks: Block[]): ([number, number] | null)[] {
  const own = blocks.map(blockPeriod);
  return own.map((p, i) => {
    if (p) return p;
    for (let d = 1; d < blocks.length; d++) {
      if (own[i + d]) return own[i + d];
      if (own[i - d]) return own[i - d];
    }
    return null;
  });
}

/**
 * A thin vertical spine: the lesson's whole span top to bottom, with the period of the
 * block currently in view marked in oxblood. Time is always visible.
 */
export function TimeSpine({ blocks, currentId }: { blocks: Block[]; currentId: string | null }) {
  const periods = periodsFor(blocks);
  const known = periods.filter((p): p is [number, number] => !!p);
  if (!known.length) return null;
  const lo = Math.min(...known.map((p) => p[0]));
  const hi = Math.max(...known.map((p) => p[1]));
  const span = Math.max(1, toAstro(hi) - toAstro(lo));
  const pos = (y: number) => ((toAstro(y) - toAstro(lo)) / span) * 100;
  const idx = blocks.findIndex((b) => b.id === currentId);
  const cur = idx >= 0 ? periods[idx] : null;
  const era = lo < 0;

  return (
    <div className="pointer-events-none flex h-full flex-col items-center py-2" aria-label={`Lesson spans ${formatYear(lo)} to ${formatYear(hi)}`}>
      <span className="mono-tab text-[10.5px] text-muted [writing-mode:vertical-rl] rotate-180">{formatYear(lo, { era })}</span>
      <div className="relative my-2 w-[2px] flex-1 bg-rule">
        {known.map((p, i) => (
          <span
            key={i}
            className="absolute left-0 w-[2px] bg-rule-strong"
            style={{ top: `${pos(p[0])}%`, height: `max(2px, ${pos(p[1]) - pos(p[0])}%)` }}
          />
        ))}
        {cur && (
          <span
            className="absolute -left-[1px] w-[4px] rounded-full bg-accent transition-all duration-200"
            style={{ top: `${pos(cur[0])}%`, height: `max(6px, ${pos(cur[1]) - pos(cur[0])}%)` }}
          >
            <span className="mono-tab absolute right-2 top-0 whitespace-nowrap bg-bg py-1 text-[10.5px] text-accent [writing-mode:vertical-rl] rotate-180">
              {formatYear(cur[0], { era })}
            </span>
          </span>
        )}
      </div>
      <span className="mono-tab text-[10.5px] text-muted [writing-mode:vertical-rl] rotate-180">{formatYear(hi, { era })}</span>
    </div>
  );
}
