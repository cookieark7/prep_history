import { describe, expect, it } from "vitest";
import { BEATS } from "@/content/landing/beats";
import { Beat, type Glyph } from "@/lib/landing/types";

describe("film beats (L1)", () => {
  it("all 35 pass the schema and have unique ids", () => {
    expect(BEATS).toHaveLength(35);
    for (const b of BEATS) expect(Beat.safeParse(b).success, b.id).toBe(true);
    expect(new Set(BEATS.map((b) => b.id)).size).toBe(35);
  });

  it("plays B35 between B24 and B25, and ends on B34", () => {
    const ids = BEATS.map((b) => b.id);
    expect(ids.indexOf("B35")).toBe(ids.indexOf("B24") + 1);
    expect(ids.indexOf("B25")).toBe(ids.indexOf("B35") + 1);
    expect(ids.at(-1)).toBe("B34");
  });

  it("has seven dwell beats and acts in order", () => {
    expect(BEATS.filter((b) => b.dwell).map((b) => b.id)).toEqual(["B01", "B11", "B17", "B24", "B29", "B31", "B33"]);
    const acts = BEATS.map((b) => b.act);
    expect([...acts].sort()).toEqual(acts);
    expect(BEATS.filter((b) => b.act === 3).map((b) => b.id)).toEqual(["B34"]);
  });

  it("keeps time moving forward within each act", () => {
    const act1 = BEATS.filter((b) => b.act === 1).map((b) => b.t); // years ago: falling
    const later = BEATS.filter((b) => b.act !== 1).map((b) => b.t); // calendar years: rising
    for (let i = 1; i < act1.length; i++) expect(act1[i]).toBeLessThan(act1[i - 1]);
    for (let i = 1; i < later.length; i++) expect(later[i]).toBeGreaterThan(later[i - 1]);
  });

  it("matches the glyph table in prompt 4.3", () => {
    const table: Record<Glyph, string[]> = {
      point: ["B01"],
      star: ["B02", "B11"],
      disc: ["B03", "B04", "B10", "B12", "B17", "B18", "B19", "B21", "B32"],
      ring: ["B13", "B14", "B20", "B24", "B34"], // B20 (coin) is a ring with an inner disc
      concentric: ["B09", "B16", "B28", "B35"],
      spiral: ["B07", "B08", "B25"],
      cell: ["B05", "B06"],
      rose: ["B22", "B26"],
      orbits: ["B27"],
      wheel: ["B15", "B23", "B29", "B31"],
      dial: ["B30"],
      globe: ["B33"],
    };
    for (const b of BEATS) expect(table[b.glyph], b.id).toContain(b.id);
  });
});
