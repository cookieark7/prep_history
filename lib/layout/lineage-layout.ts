import type { LineageBlock } from "@/lib/contracts";

export const CHIP_W = 136;
export const CHIP_H = 52;
const GAP_X = 16;
const ROW_H = 104;

export interface PositionedPerson {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  gen: number;
}

export interface LineageLayout {
  people: PositionedPerson[];
  byId: Record<string, PositionedPerson>;
  width: number;
  height: number;
  gens: number[];
}

type Person = LineageBlock["people"][number];
type Link = LineageBlock["links"][number];

/**
 * Generation rows (gen 1 on top). Within a row, people are ordered by the mean x of
 * their already-placed parents/predecessors (barycentre), then by start year, so
 * families stay roughly under each other and crossings stay low. Rows are centred.
 */
export function layoutLineage(people: Person[], links: Link[]): LineageLayout {
  const gens = [...new Set(people.map((p) => p.gen))].sort((a, b) => a - b);
  const placed: Record<string, PositionedPerson> = {};
  const rows: PositionedPerson[][] = [];

  for (const [rowIdx, gen] of gens.entries()) {
    const inRow = people.filter((p) => p.gen === gen);
    const anchorX = (p: Person): number | null => {
      const xs = links
        .filter((l) => l.to === p.id && placed[l.from] && l.rel !== "spouse")
        .map((l) => placed[l.from].x);
      // spouses sit next to their partner
      const spouse = links.find(
        (l) => l.rel === "spouse" && (l.to === p.id || l.from === p.id),
      );
      if (!xs.length && spouse) {
        const other = spouse.to === p.id ? spouse.from : spouse.to;
        if (placed[other]) return placed[other].x + 0.5;
      }
      return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
    };
    const order = inRow
      .map((p, i) => ({ p, i, a: anchorX(p) }))
      .sort(
        (u, v) =>
          (u.a ?? Infinity) - (v.a ?? Infinity) ||
          (u.p.start ?? Infinity) - (v.p.start ?? Infinity) ||
          u.i - v.i,
      );
    const row = order.map(({ p }, i) => {
      const pos = { id: p.id, x: i * (CHIP_W + GAP_X), y: rowIdx * ROW_H, w: CHIP_W, h: CHIP_H, gen };
      placed[p.id] = pos;
      return pos;
    });
    rows.push(row);
  }

  const rowWidth = (r: PositionedPerson[]) => (r.length ? r.length * (CHIP_W + GAP_X) - GAP_X : 0);
  const width = Math.max(...rows.map(rowWidth), CHIP_W);
  for (const r of rows) {
    const shift = (width - rowWidth(r)) / 2;
    for (const p of r) p.x += shift;
  }

  const all = rows.flat();
  return {
    people: all,
    byId: Object.fromEntries(all.map((p) => [p.id, p])),
    width,
    height: rows.length * ROW_H - (ROW_H - CHIP_H),
    gens,
  };
}
