import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { StreamLine, TurnRequest } from "@/lib/contracts";
import type { Db } from "@/lib/db/client";
import { STATIONS } from "@/content/syllabus";
import { partAsk, partsRead, seriesOf } from "@/content/series";
import { buildContext } from "@/lib/director/context";
import { mockLines } from "@/lib/director/mock";
import { isKeyFacts, markUnsourced } from "@/lib/exam";
import { yearsInText } from "@/lib/period";
import { wordMatch } from "@/lib/review/check";
import { cardsFromTurn } from "@/lib/review/cards";
import { recordReview, reviewQueue, saveCards } from "@/lib/review/repo";
import { levelFor } from "@/lib/syllabus/route";
import { addUser, testDb } from "./helpers/db";

// Exam prep and explore (docs/MODES_PLAN.md), with the owner's decisions of 31 Oct 2026.

const req = (goal: "exam" | "explore" | undefined, message = "The Marathas, part 1 of 4: Shivaji and the Maratha state (1630 – 1680)"): TurnRequest => ({
  message, event: null, workspace: { blocks: [], level: "new", ...(goal ? { goal } : {}), mastery: [] },
});

describe("the goal reaches the Director", () => {
  it("sends learner_goal, explore when an older client sends none", () => {
    expect(buildContext(req("exam"))).toContain("learner_goal: exam");
    expect(buildContext(req(undefined))).toContain("learner_goal: explore");
  });

  it("gives the mock's exam lesson the five parts", () => {
    const lines = mockLines(req("exam")).map((l) => JSON.parse(l) as StreamLine);
    const types = lines.flatMap((l) => (l.t === "op" && l.op.op === "add" ? [l.op.block.type] : []));
    expect(types).toEqual(["article", "timeline", "callout", "quiz"]);
    const kinds = lines.flatMap((l) => (l.t === "card" ? [l.card.kind] : []));
    expect(kinds).toContain("fact");
    expect(kinds).toContain("term");
  });
});

describe("the level is worked out, not asked", () => {
  it("is new on a first lesson from a station, revision after, and in between for a free question", () => {
    expect(levelFor("marathas", {})).toBe("new");
    expect(levelFor("marathas", { marathas: 1 })).toBe("advanced");
    expect(levelFor(undefined, { marathas: 1 })).toBe("some");
  });
});

describe("check this", () => {
  it("marks key facts without a citation, and only list lines", () => {
    const md = "Intro line\n- Shivaji was crowned in 1674 [E][S:12].\n- Baji Rao I went north [E].\n1. Salbai, 1782 [E]";
    const out = markUnsourced(md).split("\n");
    expect(out[0]).toBe("Intro line");
    expect(out[1]).not.toContain("check:");
    expect(out[2]).toMatch(/\[Check this\]\(check:\)$/);
    expect(out[3]).toMatch(/\[Check this\]\(check:\)$/);
  });

  it("reads no years from citation ids", () => {
    expect(yearsInText("Shivaji was crowned in 1674 [E][S:4446]. Bassein followed in 1802 [E][S2].")).toEqual([1674, 1802]);
  });

  it("knows a key facts section by its heading", () => {
    expect(isKeyFacts("Key facts")).toBe(true);
    expect(isKeyFacts("  key facts (Prelims)")).toBe(true);
    expect(isKeyFacts("Why the Marathas rose")).toBe(false);
  });

  it("never turns an unsourced fact or term into a card", () => {
    const card = (kind: "fact" | "term" | "why", front: string, cites?: string[]): StreamLine =>
      ({ t: "card", card: { id: front.slice(0, 8), kind, front, back: "An answer.", source_ref: { block: "b1", node: null }, ...(cites ? { cites } : {}) } });
    const cards = cardsFromTurn([
      card("fact", "When was Shivaji crowned?", ["41"]),
      card("fact", "When was the Treaty of Salbai signed?"),
      card("term", "What was sardeshmukhi?", []),
      card("why", "Why did the Marathas lose at Panipat?"),
    ]);
    expect(cards.map((c) => c.front)).toEqual(["When was Shivaji crowned?", "Why did the Marathas lose at Panipat?"]);
  });
});

describe("station series", () => {
  it("splits every station into two to four parts with unique ids", () => {
    for (const s of STATIONS) {
      const parts = seriesOf(s.id);
      expect(parts.length, s.id).toBeGreaterThanOrEqual(2);
      expect(parts.length, s.id).toBeLessThanOrEqual(4);
      expect(new Set(parts.map((p) => p.id)).size, s.id).toBe(parts.length);
    }
  });

  it("asks for a part by number, and counts parts read", () => {
    const marathas = STATIONS.find((s) => s.id === "marathas")!;
    const [first] = seriesOf("marathas");
    expect(partAsk(marathas, first)).toEqual({
      message: "The Marathas, part 1 of 4: Shivaji and the Maratha state (1630 – 1680)",
      topic: "The Marathas, part 1: Shivaji and the Maratha state",
    });
    expect(partsRead("marathas", { "marathas/shivaji": true, "mughal/akbar": true })).toBe(1);
  });
});

describe("check my answer, without a model", () => {
  const back = "Panipat weakened the Peshwa's hold, so the great chiefs acted alone and were defeated separately.";
  it("judges by the answer's key words", () => {
    expect(wordMatch({ front: "", back, answer: "The Peshwa's hold weakened after Panipat, chiefs acted alone, defeated separately" }).verdict).toBe("right");
    expect(wordMatch({ front: "", back, answer: "Panipat weakened them" }).verdict).toBe("partly");
    expect(wordMatch({ front: "", back, answer: "no idea" }).verdict).toBe("missed");
  });
});

describe("exam cards in review", () => {
  let db: Db;
  let close: () => Promise<void>;
  const T0 = new Date("2026-10-31T09:00:00Z");
  const card = (front: string) => ({ kind: "why", front, back: "Because.", sourceRef: null, cites: [], origin: "model" as const });
  beforeAll(async () => {
    ({ db, close } = await testDb());
    await addUser(db, "u1");
    await saveCards(db, "u1", "explore-lesson", [card("Why did Rome win at Zama?")], T0, "explore");
    await saveCards(db, "u1", "exam-lesson", [card("Why did the Marathas lose at Panipat?"), card("Why did Shivaji build forts?")], T0, "exam");
  }, 30_000);
  afterAll(() => close());

  it("filters to cards made in exam prep", async () => {
    const all = await reviewQueue(db, "u1", { now: T0 });
    const exam = await reviewQueue(db, "u1", { now: T0, goal: "exam" });
    expect(all).toHaveLength(3);
    expect(exam.map((c) => c.goal)).toEqual(["exam", "exam"]);
  });

  it("offers a lesson's due cards, and no new ones, for the warm-up", async () => {
    expect(await reviewQueue(db, "u1", { now: T0, lessonId: "exam-lesson" })).toHaveLength(0);
    const [first] = await reviewQueue(db, "u1", { now: T0, goal: "exam" });
    await recordReview(db, "u1", first.id, { rating: 1 }, T0); // forgotten: back within minutes
    const later = new Date(T0.getTime() + 3600_000);
    const warm = await reviewQueue(db, "u1", { now: later, lessonId: "exam-lesson" });
    expect(warm.map((c) => c.id)).toEqual([first.id]);
  });
});
