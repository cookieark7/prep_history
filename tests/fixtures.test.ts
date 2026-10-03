import { describe, expect, it } from "vitest";
import { readdirSync } from "node:fs";
import path from "node:path";
import { validateLine, type Block, type CauseGraphBlock, type LineageBlock, type TimelineBlock } from "@/lib/contracts";
import { readFixture } from "@/lib/fixtures";
import { layoutCauseGraph, overlaps } from "@/lib/layout/cause-graph-layout";
import { layoutLineage } from "@/lib/layout/lineage-layout";
import { makeTimelineScale, yearTicks } from "@/lib/layout/timeline-scale";
import { toAstro, yearSpan, formatYear } from "@/lib/layout/years";

const files = readdirSync(path.join(process.cwd(), "lib/fixtures")).filter((f) => f.endsWith(".ndjson"));

function blocksOf(file: string): Block[] {
  return readFixture(file).flatMap((l) => {
    const r = validateLine(l);
    return r.ok && r.line.t === "op" && r.line.op.op === "add" ? [r.line.op.block] : [];
  });
}

describe.each(files)("fixture %s", (file) => {
  const lines = readFixture(file);

  it("every line is a valid StreamLine", () => {
    for (const l of lines) {
      const r = validateLine(l);
      expect(r.ok, r.ok ? "" : `${r.reason}\n${l.slice(0, 120)}`).toBe(true);
    }
  });

  it("follows the protocol order: say first, done last, <=3 followups", () => {
    const kinds = lines.map((l) => JSON.parse(l).t);
    expect(kinds[0]).toBe("say");
    expect(kinds.at(-1)).toBe("done");
    expect(kinds.filter((k) => k === "say")).toHaveLength(1);
    expect(kinds.filter((k) => k === "followup").length).toBeLessThanOrEqual(3);
  });

  it("cause graphs lay out with no overlapping nodes, causes left and consequences right", () => {
    for (const b of blocksOf(file).filter((b): b is CauseGraphBlock => b.type === "cause_graph")) {
      const lay = layoutCauseGraph(b.nodes);
      expect(lay.nodes).toHaveLength(b.nodes.length);
      for (let i = 0; i < lay.nodes.length; i++)
        for (let j = i + 1; j < lay.nodes.length; j++)
          expect(overlaps(lay.nodes[i], lay.nodes[j]), `${lay.nodes[i].id} vs ${lay.nodes[j].id}`).toBe(false);
      const ev = b.nodes.find((n) => n.layer === "event")!;
      for (const n of b.nodes) {
        const p = lay.byId[n.id];
        if (n.layer === "consequence") expect(p.x).toBeGreaterThan(lay.byId[ev.id].x);
        else if (n.layer !== "event") expect(p.x + p.w).toBeLessThan(lay.byId[ev.id].x);
      }
    }
  });

  it("lineages lay out in generation rows with no overlaps", () => {
    for (const b of blocksOf(file).filter((b): b is LineageBlock => b.type === "lineage")) {
      const lay = layoutLineage(b.people, b.links);
      expect(lay.people).toHaveLength(b.people.length);
      for (const p of b.people) for (const q of b.people)
        if (p.gen < q.gen) expect(lay.byId[p.id].y).toBeLessThan(lay.byId[q.id].y);
      for (let i = 0; i < lay.people.length; i++)
        for (let j = i + 1; j < lay.people.length; j++) {
          const [a, c] = [lay.people[i], lay.people[j]];
          expect(a.x < c.x + c.w && c.x < a.x + a.w && a.y === c.y, `${a.id} vs ${c.id}`).toBe(false);
        }
    }
  });

  it("timelines map every event inside the range", () => {
    for (const b of blocksOf(file).filter((b): b is TimelineBlock => b.type === "timeline")) {
      const s = makeTimelineScale(b.range.from, b.range.to, 1000);
      for (const e of b.events) {
        expect(s.x(e.start)).toBeGreaterThanOrEqual(0);
        expect(s.x(e.start)).toBeLessThanOrEqual(1000);
      }
    }
  });
});

describe("years", () => {
  it("has no year zero", () => {
    expect(yearSpan(-1, 1)).toBe(1);
    expect(yearSpan(-218, -201)).toBe(17);
    expect(toAstro(-1)).toBe(0);
    expect(formatYear(-216)).toBe("216 BCE");
    expect(yearTicks([toAstro(-300), toAstro(300)])).not.toContain(0);
    expect(yearTicks([toAstro(-300), toAstro(300)])).toEqual(expect.arrayContaining([-200, -100, 100, 200]));
  });
});
