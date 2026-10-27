import { describe, expect, it } from "vitest";
import { EVENTS, LINKS } from "@/content/landing/timeline";
import { BREAK_YEARS, layoutTree, TREE } from "@/lib/landing/tree-layout";

describe("starting points tree layout", () => {
  const wide = layoutTree(EVENTS, LINKS, "wide");
  const narrow = layoutTree(EVENTS, LINKS, "narrow");

  it("runs down in time order, one row per event", () => {
    expect(wide.rows.map((r) => r.id)).toEqual(EVENTS.map((e) => e.id));
    for (let i = 1; i < wide.rows.length; i++) expect(wide.rows[i].y).toBeGreaterThan(wide.rows[i - 1].y);
    expect(wide.height).toBeGreaterThan(wide.rows.at(-1)!.y);
  });

  it("alternates sides on wide screens and keeps every event on the right on narrow ones", () => {
    expect(wide.rows.map((r) => r.side)).toEqual(EVENTS.map((_, i) => (i % 2 ? "right" : "left")));
    expect(narrow.rows.every((r) => r.side === "right")).toBe(true);
  });

  it("marks each long gap in time with a break, and leaves room for it", () => {
    const gaps = EVENTS.slice(1).filter((e, i) => e.year - EVENTS[i].year > BREAK_YEARS).length;
    expect(wide.breaks).toHaveLength(gaps);
    expect(wide.height).toBe(TREE.wide.top + (EVENTS.length - 1) * TREE.wide.step + gaps * TREE.wide.breakGap + TREE.wide.bottom);
  });

  it("draws every cause link, bowing no further than the gap before the cards", () => {
    for (const t of [wide, narrow]) {
      expect(t.links).toHaveLength(LINKS.length);
      for (const l of t.links) {
        const bow = Math.abs(l.tip[0] - t.geo.trunkX);
        expect(bow).toBeLessThanOrEqual(t.geo.maxBow);
        expect(bow).toBeLessThan(t.geo.reach);
        expect(t.geo.bowSides).toContain(l.side);
      }
    }
  });

  it("never lets two links on the same side cross at the same bow", () => {
    for (const t of [wide, narrow]) {
      const yOf = new Map(t.rows.map((r) => [r.id, r.y]));
      for (const a of t.links) for (const b of t.links) {
        if (a === b || a.side !== b.side || a.tip[0] !== b.tip[0]) continue;
        const [a0, a1, b0, b1] = [yOf.get(a.from)!, yOf.get(a.to)!, yOf.get(b.from)!, yOf.get(b.to)!];
        expect(a1 <= b0 || b1 <= a0).toBe(true);
      }
    }
  });
});
