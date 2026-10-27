import { describe, expect, it } from "vitest";
import { PARTS, STATIONS } from "@/content/syllabus";

describe("syllabus line", () => {
  it("has unique station ids, each in a known part", () => {
    expect(new Set(STATIONS.map((s) => s.id)).size).toBe(STATIONS.length);
    const parts = new Set(PARTS.map((p) => p.id));
    for (const s of STATIONS) expect(parts.has(s.part), s.id).toBe(true);
  });

  it("gives every station at least three different starter questions", () => {
    for (const s of STATIONS) {
      expect(s.questions.length, s.id).toBeGreaterThanOrEqual(3);
      expect(new Set(s.questions).size, s.id).toBe(s.questions.length);
      for (const q of s.questions) expect(q.trim().length, `${s.id}: ${q}`).toBeGreaterThan(10);
    }
  });

  it("keeps each part's stations in time order", () => {
    for (const p of PARTS) {
      const line = STATIONS.filter((s) => s.part === p.id);
      for (let i = 1; i < line.length; i++) expect(line[i].from, line[i].id).toBeGreaterThanOrEqual(line[i - 1].from);
      for (const s of line) expect(s.to, s.id).toBeGreaterThanOrEqual(s.from);
    }
  });
});
