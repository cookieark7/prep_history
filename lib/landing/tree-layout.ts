import type { CauseLink, LinkConfidence, TimelineEvent } from "@/lib/landing/types";

// The Starting points tree (owner decision, 2026-10-18): a vertical trunk with time running down,
// each event on a branch to one side, and cause links drawn as branches between events. Pure
// geometry; the component draws it.
//
// Coordinates: y from the top of the tree, x inside the lines layer, whose trunk sits at `trunkX`.
// Wide screens put the trunk in the middle and alternate sides; narrow ones put it at the left
// and every event on the right.

export type TreeMode = "wide" | "narrow";
export type Side = "left" | "right";

export interface TreeGeometry {
  /** lines layer width; its trunk is at trunkX */
  width: number;
  trunkX: number;
  /** distance from the trunk to a card's near edge */
  reach: number;
  step: number;
  /** extra room where a long gap in time is marked with ≈ */
  breakGap: number;
  top: number;
  bottom: number;
  /** how far a cause branch may bow out from the trunk */
  maxBow: number;
  /** cause branches may bow to these sides */
  bowSides: Side[];
}

export const TREE: Record<TreeMode, TreeGeometry> = {
  wide: { width: 160, trunkX: 80, reach: 56, step: 76, breakGap: 36, top: 44, bottom: 44, maxBow: 50, bowSides: ["left", "right"] },
  narrow: { width: 72, trunkX: 28, reach: 44, step: 100, breakGap: 32, top: 48, bottom: 48, maxBow: 24, bowSides: ["left"] },
};

/** A gap in time longer than this gets a ≈ on the trunk (same rule as the old horizontal track). */
export const BREAK_YEARS = 500;

export interface TreeRow { id: string; y: number; side: Side }
export interface TreeBreak { y: number }
export interface TreeLink {
  from: string;
  to: string;
  label: string;
  confidence: LinkConfidence;
  d: string;
  side: Side;
  /** the farthest point of the branch, for its label */
  tip: [number, number];
}
export interface TreeLayout {
  mode: TreeMode;
  geo: TreeGeometry;
  height: number;
  rows: TreeRow[];
  breaks: TreeBreak[];
  twigs: { id: string; d: string }[];
  links: TreeLink[];
}

export function layoutTree(events: readonly TimelineEvent[], links: readonly CauseLink[], mode: TreeMode): TreeLayout {
  const geo = TREE[mode];
  const rows: TreeRow[] = [];
  const breaks: TreeBreak[] = [];
  let y = geo.top;
  events.forEach((e, i) => {
    if (i > 0) {
      y += geo.step;
      if (e.year - events[i - 1].year > BREAK_YEARS) {
        breaks.push({ y: y - geo.step / 2 + geo.breakGap / 2 });
        y += geo.breakGap;
      }
    }
    rows.push({ id: e.id, y, side: mode === "narrow" || i % 2 === 1 ? "right" : "left" });
  });
  const height = y + geo.bottom;
  const tx = geo.trunkX;
  const dir = (s: Side) => (s === "left" ? -1 : 1);

  // A twig from the trunk out to the card, rising a little as it goes.
  const twigs = rows.map((r) => {
    const x2 = tx + dir(r.side) * geo.reach;
    return { id: r.id, d: `M${tx} ${r.y} Q${(tx + x2) / 2} ${r.y - 9} ${x2} ${r.y}` };
  });

  // Cause branches bow out beside the trunk. Each side has lanes so that overlapping branches
  // nest instead of crossing; a branch takes the side and lane that let it bow the least.
  const yOf = new Map(rows.map((r) => [r.id, r.y]));
  const lanes: Record<Side, [number, number][][]> = { left: [], right: [] };
  const fits = (lane: [number, number][], a: number, b: number) => lane.every(([s, e]) => b <= s || a >= e);
  const out: TreeLink[] = [];
  const ordered = [...links].sort((p, q) => (yOf.get(p.to)! - yOf.get(p.from)!) - (yOf.get(q.to)! - yOf.get(q.from)!));
  for (const l of ordered) {
    const ya = yOf.get(l.from);
    const yb = yOf.get(l.to);
    if (ya === undefined || yb === undefined) continue;
    let best: { side: Side; lane: number } | null = null;
    for (const side of geo.bowSides) {
      let lane = lanes[side].findIndex((ln) => fits(ln, ya, yb));
      if (lane < 0) lane = lanes[side].length;
      if (!best || lane < best.lane) best = { side, lane };
    }
    const { side, lane } = best!;
    (lanes[side][lane] ??= []).push([ya, yb]);
    const span = (yb - ya) / geo.step;
    const bow = Math.min(geo.maxBow, (mode === "wide" ? 16 : 10) + lane * (mode === "wide" ? 11 : 6) + span * 1.5);
    const c = tx + dir(side) * (bow / 0.75); // a cubic with both handles at c reaches 0.75c at its middle
    const k = (yb - ya) * 0.12;
    out.push({
      from: l.from, to: l.to, label: l.label, confidence: l.confidence, side,
      d: `M${tx} ${ya} C${c.toFixed(1)} ${ya + k} ${c.toFixed(1)} ${yb - k} ${tx} ${yb}`,
      tip: [tx + dir(side) * bow, (ya + yb) / 2],
    });
  }
  return { mode, geo, height, rows, breaks, twigs, links: out };
}
