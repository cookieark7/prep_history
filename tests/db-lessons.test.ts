import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import type { Db } from "@/lib/db/client";
import * as schema from "@/lib/db/schema";
import { deleteLesson, getLesson, importLessons, listLessons, saveLesson, type LessonSnapshot } from "@/lib/lessons/repo";
import { finishTurn, limitsFor, overLimit, recentExchanges, startTurn } from "@/lib/turns/log";
import { moveGuestData } from "@/lib/auth/link";
import { addUser, testDb } from "./helpers/db";

let db: Db;
let close: () => Promise<void>;
beforeAll(async () => {
  ({ db, close } = await testDb());
  await addUser(db, "u1");
  await addUser(db, "u2");
}, 30_000);
afterAll(() => close());

const graph = { id: "b2", type: "cause_graph", title: "Why", because: "x", edges: [], nodes: [
  { id: "n1", label: "War", layer: "event", when: -218, t_offset: null, confidence: "E" },
  { id: "n2", label: "Allies", layer: "structural", when: -338, t_offset: null, confidence: "E" },
  { id: "n3", label: "Empire", layer: "consequence", when: null, t_offset: 72, confidence: "L" },
] };
const snap = (id: string, topic = "Why did Rome beat Carthage?", blocks: unknown[] = [graph]): LessonSnapshot =>
  ({ lessonId: id, topic, blocks, chat: [], notes: [] });

describe("lessons on the server", () => {
  it("inserts, updates on the right version, and refuses a stale save with the server copy", async () => {
    expect(await saveLesson(db, "u1", snap("l1"), null)).toEqual({ ok: true, version: 1 });
    expect(await saveLesson(db, "u1", snap("l1", "Rome and Carthage"), 1)).toEqual({ ok: true, version: 2 });
    const stale = await saveLesson(db, "u1", snap("l1", "an old tab"), 1);
    expect(stale).toMatchObject({ ok: false, reason: "conflict", version: 2, snapshot: { topic: "Rome and Carthage" } });
    expect((await getLesson(db, "u1", "l1"))?.version).toBe(2);
  });

  it("treats a second insert of the same id as a conflict, not a duplicate", async () => {
    expect(await saveLesson(db, "u1", snap("l1", "again"), null)).toMatchObject({ ok: false, reason: "conflict", version: 2 });
  });

  it("keeps lessons apart between users", async () => {
    expect(await saveLesson(db, "u2", snap("l1"), 2)).toEqual({ ok: false, reason: "not_yours" });
    expect(await getLesson(db, "u2", "l1")).toBeNull();
    expect(await deleteLesson(db, "u2", "l1")).toBe(false);
  });

  it("lists summaries with the period worked out from the blocks", async () => {
    const [l] = await listLessons(db, "u1");
    expect(l).toMatchObject({ id: "l1", topic: "Rome and Carthage", period: [-338, -146], blockCount: 1, version: 2 });
  });

  it("imports browser lessons once, skipping empty ones and ids that exist", async () => {
    expect(await importLessons(db, "u1", [snap("l1"), snap("l2"), snap("l3", "", [])])).toBe(1);
    expect((await listLessons(db, "u1")).map((l) => l.id).sort()).toEqual(["l1", "l2"]);
    expect(await deleteLesson(db, "u1", "l2")).toBe(true);
  });
});

describe("turn log", () => {
  const req = (message: string) => ({ message, event: null, workspace: { blocks: [], level: "some" as const, mastery: [] } });

  it("refuses a turn id twice and completes the row", async () => {
    expect(await startTurn(db, { id: "t1", userId: "u1", lessonId: "l1", request: req("Why?"), promptVersion: "v" })).toBe(true);
    expect(await startTurn(db, { id: "t1", userId: "u1", lessonId: "l1", request: req("Why?"), promptVersion: "v" })).toBe(false);
    await finishTurn(db, "t1", {
      lines: [{ t: "say", text: "Scoped to the war." }, { t: "done" }],
      attempts: [{ provider: "cf", model: "m", outcome: "ok", ms: 10, firstLineMs: 5, lines: 2, dropped: 1, repaired: 2 }],
      status: "ok", totalMs: 12,
    });
    const [row] = await db.select().from(schema.turns).where(eq(schema.turns.id, "t1"));
    expect(row).toMatchObject({ status: "ok", provider: "cf (m)", droppedLines: 1, repairedLines: 2, firstLineMs: 5, totalMs: 12 });
  });

  it("gives the lesson's recent exchanges oldest first", async () => {
    await startTurn(db, { id: "t2", userId: "u1", lessonId: "l1", request: req("Go deeper"), promptVersion: "v" });
    await finishTurn(db, "t2", { lines: [{ t: "say", text: "Added the deep section." }, { t: "done" }], attempts: [], status: "ok", totalMs: 1 });
    expect(await recentExchanges(db, "u1", "l1")).toEqual([
      { input: "learner: Why?", say: "Scoped to the war." },
      { input: "learner: Go deeper", say: "Added the deep section." },
    ]);
  });

  it("counts turns against the daily and per-minute limits", async () => {
    expect(await overLimit(db, "u1", { perDay: 5, perMinute: 5 })).toBeNull();
    expect(await overLimit(db, "u1", { perDay: 2, perMinute: 5 })).toBe("day");
    expect(await overLimit(db, "u1", { perDay: 50, perMinute: 2 })).toBe("minute");
    expect(limitsFor(true, {})).toEqual({ perDay: 20, perMinute: 6 });
    expect(limitsFor(false, { TURNS_PER_DAY: "100" })).toEqual({ perDay: 100, perMinute: 6 });
  });

  it("moves a guest's lessons and turns to the account they sign in to", async () => {
    await addUser(db, "guest", true);
    await saveLesson(db, "guest", snap("lg"), null);
    await startTurn(db, { id: "tg", userId: "guest", lessonId: "lg", request: req("hi"), promptVersion: "v" });
    await moveGuestData(db, "guest", "u2");
    expect((await listLessons(db, "u2")).map((l) => l.id)).toEqual(["lg"]);
    const [t] = await db.select().from(schema.turns).where(eq(schema.turns.id, "tg"));
    expect(t.userId).toBe("u2");
  });
});
