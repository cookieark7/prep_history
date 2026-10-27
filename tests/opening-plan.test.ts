import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { BEATS } from "@/content/landing/beats";
import plates from "@/content/landing/opening-plates.json";
import { buildOpeningPlan, OPENING_CONFIG, rulerIndexAt, slotIndexAt } from "@/lib/landing/opening-plan";

const plan = buildOpeningPlan(BEATS, plates.plates);

describe("opening plan (storyboard v1)", () => {
  it("runs 13 screens, slot after slot", () => {
    expect(plan.total).toBe(13);
    expect(plan.slots[0].start).toBe(0);
    expect(plan.slots.at(-1)!.end).toBe(13);
    for (let i = 1; i < plan.slots.length; i++) expect(plan.slots[i].start).toBeCloseTo(plan.slots[i - 1].end, 9);
  });

  it("zooms through B01 to B04, then cuts through history, then lands on Now", () => {
    expect(plan.slots.filter((s) => s.act === "deep").map((s) => s.id)).toEqual(["B01", "B02", "B03", "B04"]);
    expect(plan.slots.find((s) => s.id === "B05")!.start).toBe(OPENING_CONFIG.deepEnd);
    expect(plan.slots.at(-1)!.id).toBe("B34");
    expect(plan.slots.at(-1)!.act).toBe("landing");
  });

  it("has every file the page asks for: AVIF, the tall crop and the WebP fallback", () => {
    const dir = join(__dirname, "..", "public", "opening");
    const files = (base: string, id: string) => [`${base}/${id}.avif`, `${base}/tall/${id}.avif`, `${base}/${id}.webp`];
    const want = [
      ...plates.plates.flatMap((id) => files(dir, id)),
      ...plates.zoom.levels.flatMap((id) => files(join(dir, "zoom"), id)),
    ];
    expect(want.filter((f) => !existsSync(f))).toEqual([]);
  });

  it("skips beats without a plate", () => {
    const ids = plan.slots.map((s) => s.id);
    expect(plates.plates.includes("B35") ? ids.includes("B35") : !ids.includes("B35")).toBe(true);
  });

  it("slows down at exactly the seven key moments", () => {
    const keys = plan.slots.filter((s) => s.key);
    expect(keys.map((s) => s.id)).toEqual(OPENING_CONFIG.keys);
    const history = plan.slots.filter((s) => s.act === "history");
    const normal = history.find((s) => !s.key)!;
    const key = history.find((s) => s.key)!;
    expect((key.end - key.start) / (normal.end - normal.start)).toBeCloseTo(OPENING_CONFIG.keyWeight, 6);
    // Act II stays fast: a normal plate is about a fifth of a screen.
    expect(normal.end - normal.start).toBeLessThan(0.25);
  });

  it("moves the ruler forward only, and ends on Now", () => {
    let prev = -1;
    for (let p = 0; p <= 13; p += 0.01) {
      const u = rulerIndexAt(plan, p);
      expect(u).toBeGreaterThanOrEqual(prev);
      prev = u;
    }
    expect(rulerIndexAt(plan, 13)).toBe(plan.slots.length - 1);
  });

  it("finds the slot on screen", () => {
    expect(slotIndexAt(plan, 0)).toBe(0);
    expect(plan.slots[slotIndexAt(plan, 5)].act).toBe("history");
    expect(slotIndexAt(plan, 99)).toBe(plan.slots.length - 1);
  });
});
