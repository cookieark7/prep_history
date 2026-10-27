import { describe, expect, it } from "vitest";
import { BEATS } from "@/content/landing/beats";
import { EVENTS, LINKS } from "@/content/landing/timeline";
import { PROMPT_KINDS, SUPPORTED_KINDS } from "@/content/landing/prompt-kinds";
import { Beat, CauseLink, PromptKind, PromptKindInfo, TimelineEvent, type Glyph } from "@/lib/landing/types";

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

describe("starting points (L1)", () => {
  it("all 20 events pass the schema and have unique ids", () => {
    expect(EVENTS).toHaveLength(20);
    for (const e of EVENTS) expect(TimelineEvent.safeParse(e).success, e.id).toBe(true);
    expect(new Set(EVENTS.map((e) => e.id)).size).toBe(20);
  });

  it("gives every event 3 prompts of 3 different kinds, each at most 120 characters", () => {
    for (const e of EVENTS) {
      expect(new Set(e.prompts.map((p) => p.kind)).size, e.id).toBe(3);
      for (const p of e.prompts) expect(p.text.length, p.text).toBeLessThanOrEqual(120);
    }
  });

  it("lists events in time order", () => {
    for (let i = 1; i < EVENTS.length; i++) expect(EVENTS[i].year).toBeGreaterThanOrEqual(EVENTS[i - 1].year);
  });

  it("only links events that exist, forward in time", () => {
    const byId = new Map(EVENTS.map((e) => [e.id, e]));
    for (const l of LINKS) {
      expect(CauseLink.safeParse(l).success).toBe(true);
      expect(byId.has(l.from), l.from).toBe(true);
      expect(byId.has(l.to), l.to).toBe(true);
      expect(byId.get(l.to)!.year).toBeGreaterThan(byId.get(l.from)!.year);
    }
    expect(new Set(LINKS.map((l) => l.confidence))).toEqual(new Set(["established", "likely", "contested"]));
  });
});

describe("prompt kinds (L1)", () => {
  it("describes every kind, and supports only kinds that exist", () => {
    for (const k of PromptKind.options) expect(PromptKindInfo.safeParse(PROMPT_KINDS[k]).success, k).toBe(true);
    for (const k of SUPPORTED_KINDS) expect(PromptKind.options).toContain(k);
  });

  it("uses only defined kinds in event prompts", () => {
    for (const e of EVENTS) for (const p of e.prompts) expect(Object.keys(PROMPT_KINDS)).toContain(p.kind);
  });
});
