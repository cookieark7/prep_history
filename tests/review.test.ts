import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { StreamLine } from "@/lib/contracts";
import type { Db } from "@/lib/db/client";
import { cardsFromTurn, frontHash } from "@/lib/review/cards";
import { recordReview, reviewQueue, reviewStats, saveCards, startOfLocalDay } from "@/lib/review/repo";
import { intervalLabel } from "@/lib/review/scheduler";
import { saveLesson } from "@/lib/lessons/repo";
import { addUser, testDb } from "./helpers/db";

const DAY = 24 * 3600_000;
const T0 = new Date("2026-10-20T09:00:00Z");
const at = (ms: number) => new Date(T0.getTime() + ms);

const graph = {
  id: "b2", type: "cause_graph" as const, title: "Causes", because: "x",
  nodes: [
    { id: "n1", label: "Second Punic War", layer: "event" as const, when: -218, t_offset: null, confidence: "E" as const },
    { id: "n2", label: "Italian alliance system", layer: "structural" as const, when: -338, t_offset: null, confidence: "E" as const },
    { id: "n3", label: "Rome dominates the west", layer: "consequence" as const, when: null, t_offset: 17, confidence: "L" as const },
  ],
  edges: [
    { from: "n2", to: "n1", confidence: "E" as const, why: "The allies gave Rome men to replace every lost army." },
    { from: "n1", to: "n3", confidence: "L" as const, why: "Victory left no rival power in the western Mediterranean." },
  ],
};
const timeline = {
  id: "b3", type: "timeline" as const, title: "The war, 218 to 201 BCE", because: "x", range: { from: -220, to: -200 },
  tracks: [{ id: "t1", label: "War" }],
  events: [
    { id: "e1", track: "t1", start: -218, end: null, label: "Alps", importance: 3, confidence: "E" as const },
    { id: "e2", track: "t1", start: -216, end: null, label: "Cannae", importance: 3, confidence: "E" as const },
    { id: "e3", track: "t1", start: -202, end: null, label: "Zama", importance: 2, confidence: "E" as const },
  ],
};
const add = (block: unknown): StreamLine => ({ t: "op", op: { op: "add", after: null, block } } as StreamLine);
const card = (id: string, front: string): StreamLine => ({ t: "card", card: { id, kind: "why", front, back: "Because the allies stayed loyal.", source_ref: { block: "b1", node: null } } });

describe("cards from a turn", () => {
  it("keeps the Director's cards, adds an ordering card for a timeline, and skips graph cards when there are model cards", () => {
    const cards = cardsFromTurn([add(graph), add(timeline), card("c1", "Why did Rome keep fighting after Cannae?"), { t: "done" }]);
    expect(cards.map((c) => c.origin)).toEqual(["model", "timeline"]);
    expect(cards[1]).toMatchObject({ kind: "chronology", back: "Alps → Cannae → Zama" });
  });

  it("falls back to the cause map's strongest links when the Director sent no cards", () => {
    const cards = cardsFromTurn([add(graph), { t: "done" }]);
    expect(cards.map((c) => c.front)).toEqual([
      "How did “Italian alliance system” lead to “Second Punic War”?",
      "How did “Second Punic War” lead to “Rome dominates the west”?",
    ]);
    expect(cards[1].kind).toBe("consequence");
  });

  it("treats the same question twice as one card", () => {
    expect(cardsFromTurn([card("c1", "Why did Rome win?"), card("c2", "why did Rome WIN")])).toHaveLength(1);
    expect(frontHash("Why did Rome win?")).toBe(frontHash("why did rome win"));
  });
});

describe("spaced review", () => {
  let db: Db;
  let close: () => Promise<void>;
  beforeAll(async () => {
    ({ db, close } = await testDb());
    await addUser(db, "u1");
    await addUser(db, "u2");
    await saveLesson(db, "u1", { lessonId: "l1", topic: "Why did Rome beat Carthage?", blocks: [] }, null);
  }, 30_000);
  afterAll(() => close());

  it("saves each question once per learner", async () => {
    const cards = cardsFromTurn([add(graph), add(timeline), card("c1", "Why did Rome keep fighting after Cannae?")]);
    expect(await saveCards(db, "u1", "l1", cards, T0)).toBe(2);
    expect(await saveCards(db, "u1", "l1", cards, T0)).toBe(0);
    expect(await saveCards(db, "u2", null, cards.slice(0, 1), T0)).toBe(1);
  });

  it("offers new cards up to the daily limit, with the lesson's topic and next intervals", async () => {
    const q = await reviewQueue(db, "u1", { now: T0, newPerDay: 1 });
    expect(q).toHaveLength(1);
    expect(q[0]).toMatchObject({ isNew: true, lessonTopic: "Why did Rome beat Carthage?" });
    expect(Object.keys(q[0].preview)).toEqual(["1", "2", "3", "4"]);
  });

  it("moves a remembered card out by days, and brings it back when due", async () => {
    const [first] = await reviewQueue(db, "u1", { now: T0 });
    await recordReview(db, "u1", first.id, { rating: 3, durationMs: 4000 }, T0); // learning step
    let q = await reviewQueue(db, "u1", { now: at(15 * 60_000), newPerDay: 1 });
    const again = q.find((x) => x.id === first.id);
    expect(again?.isNew).toBe(false);
    const res = await recordReview(db, "u1", first.id, { rating: 3 }, at(15 * 60_000));
    expect(res!.scheduledDays).toBeGreaterThanOrEqual(1);
    q = await reviewQueue(db, "u1", { now: at(20 * 60_000), newPerDay: 0 });
    expect(q.find((x) => x.id === first.id)).toBeUndefined();
    q = await reviewQueue(db, "u1", { now: at((res!.scheduledDays + 1) * DAY), newPerDay: 0 });
    expect(q.find((x) => x.id === first.id)).toBeDefined();
  });

  it("won't review someone else's card", async () => {
    const [mine] = await reviewQueue(db, "u1", { now: at(30 * DAY) });
    expect(await recordReview(db, "u2", mine.id, { rating: 3 }, at(30 * DAY))).toBeNull();
    await expect(recordReview(db, "u1", mine.id, { rating: 7 }, at(30 * DAY))).rejects.toThrow();
  });

  it("counts the streak, reviews today and recall on mature cards", async () => {
    const [mine] = await reviewQueue(db, "u1", { now: at(30 * DAY) });
    await recordReview(db, "u1", mine.id, { rating: 1 }, at(30 * DAY)); // forgot it after a month
    const s = await reviewStats(db, "u1", at(30 * DAY + 3600_000));
    expect(s.reviewedToday).toBe(1);
    expect(s.streakDays).toBe(1);
    expect(s.totalCards).toBe(2);
    const month = s.retention.find((b) => b.bucket === "over 30 days" || b.bucket === "8–30 days");
    expect(s.retention.reduce((n, b) => n + b.reviews, 0)).toBeGreaterThanOrEqual(1);
    expect(month).toBeDefined();
    expect(s.lessons).toEqual([{ lessonId: "l1", topic: "Why did Rome beat Carthage?", cards: 2, learned: expect.any(Number) }]);
  });

  it("works out the learner's local midnight", () => {
    expect(startOfLocalDay(new Date("2026-10-20T02:00:00Z"), 330).toISOString()).toBe("2026-10-19T18:30:00.000Z");
    expect(intervalLabel(T0, at(10 * 60_000))).toBe("10 min");
    expect(intervalLabel(T0, at(4 * DAY))).toBe("4 days");
  });
});
