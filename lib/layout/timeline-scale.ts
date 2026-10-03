import { scaleLinear, type ScaleLinear } from "d3-scale";
import { toAstro } from "./years";

export interface TimelineScale {
  /** historical year -> px */
  x: (year: number) => number;
  /** the underlying linear scale in astronomical years (for d3-zoom rescaling) */
  astro: ScaleLinear<number, number>;
}

export function makeTimelineScale(from: number, to: number, width: number, pad = 24): TimelineScale {
  const astro = scaleLinear().domain([toAstro(from), toAstro(to)]).range([pad, width - pad]);
  return { x: (y) => astro(toAstro(y)), astro };
}

const STEPS = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 5000];

/**
 * Nice tick years over an astronomical domain, never including year 0.
 * Ticks are multiples of a step in historical numbering (e.g. 200 BCE, 100 BCE, 100 CE).
 */
export function yearTicks(astroDomain: [number, number], target = 8): number[] {
  const [a, b] = astroDomain[0] <= astroDomain[1] ? astroDomain : [astroDomain[1], astroDomain[0]];
  const span = Math.max(1, b - a);
  const step = STEPS.find((s) => span / s <= target) ?? STEPS[STEPS.length - 1];
  const ticks: number[] = [];
  // iterate historical years that are multiples of step and fall inside [a, b] in astro space
  const startYear = Math.floor((a <= 0 ? a - 1 : a) / step) * step;
  for (let y = startYear; toAstro(y) <= b && ticks.length < 200; y += step) {
    if (y === 0) continue;
    if (toAstro(y) >= a) ticks.push(y);
  }
  return ticks;
}

/** Hide lower-importance labels when they would collide at the current zoom. */
export function visibleLabels<T extends { id: string; start: number; importance: number; label: string }>(
  events: T[],
  x: (year: number) => number,
  charW = 6.6,
  pad = 12,
): Set<string> {
  const byPriority = [...events].sort((p, q) => q.importance - p.importance || p.start - q.start);
  const taken: { l: number; r: number; track?: string }[] = [];
  const shown = new Set<string>();
  for (const e of byPriority) {
    const cx = x(e.start);
    const w = e.label.length * charW;
    const box = { l: cx - 4, r: cx + w + pad, track: (e as { track?: string }).track };
    if (!taken.some((t) => t.track === box.track && box.l < t.r && t.l < box.r)) {
      taken.push(box);
      shown.add(e.id);
    }
  }
  return shown;
}
