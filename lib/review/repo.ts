import { randomUUID } from "node:crypto";
import { and, asc, count, desc, eq, gte, lte, ne, sql } from "drizzle-orm";
import { schema, type Db } from "@/lib/db/client";
import { frontHash, type NewCard } from "./cards";
import { isGrade, newCardColumns, preview, schedule, type FsrsColumns } from "./scheduler";

// Cards, the review queue, reviews and stats on the server (docs/PROTOTYPE_PLAN.md, section 7).

const c = schema.cards;
const r = schema.reviewLogs;

export async function saveCards(db: Db, userId: string, lessonId: string | null, cards: NewCard[], now = new Date()): Promise<number> {
  if (!cards.length) return 0;
  const rows = cards.map((card) => ({
    id: randomUUID(), userId, lessonId, kind: card.kind, front: card.front, back: card.back,
    payload: card.payload ?? null, sourceRef: card.sourceRef, cites: card.cites, origin: card.origin,
    frontHash: frontHash(card.front), ...newCardColumns(now),
  }));
  const inserted = await db.insert(c).values(rows).onConflictDoNothing().returning({ id: c.id });
  return inserted.length;
}

export interface QueueItem {
  id: string;
  kind: string;
  front: string;
  back: string;
  payload: unknown;
  sourceRef: unknown;
  lessonId: string | null;
  lessonTopic: string | null;
  isNew: boolean;
  /** when it returns for each answer, e.g. { 3: "4 days" } */
  preview: Record<number, string>;
}

export interface QueueOptions { now?: Date; limit?: number; newPerDay?: number; dayStart?: Date }

/** New cards first seen today (their first review was today). */
async function newSeenSince(db: Db, userId: string, since: Date): Promise<number> {
  const [row] = await db.select({ n: count() }).from(r).where(and(eq(r.userId, userId), eq(r.state, 0), gte(r.reviewedAt, since)));
  return row.n;
}

/** Due reviews, oldest first, with today's share of new cards mixed in (one after every two). */
export async function reviewQueue(db: Db, userId: string, o: QueueOptions = {}): Promise<QueueItem[]> {
  const now = o.now ?? new Date();
  const limit = o.limit ?? 20;
  const dayStart = o.dayStart ?? startOfUtcDay(now);
  const newLeft = Math.max(0, (o.newPerDay ?? 10) - (await newSeenSince(db, userId, dayStart)));

  const select = {
    id: c.id, kind: c.kind, front: c.front, back: c.back, payload: c.payload, sourceRef: c.sourceRef, lessonId: c.lessonId,
    lessonTopic: schema.lessons.topic,
    due: c.due, stability: c.stability, difficulty: c.difficulty, elapsedDays: c.elapsedDays, scheduledDays: c.scheduledDays,
    learningSteps: c.learningSteps, reps: c.reps, lapses: c.lapses, state: c.state, lastReview: c.lastReview,
  };
  const due = await db.select(select).from(c).leftJoin(schema.lessons, eq(schema.lessons.id, c.lessonId))
    .where(and(eq(c.userId, userId), ne(c.state, 0), lte(c.due, now), eq(c.suspended, false)))
    .orderBy(asc(c.due)).limit(limit);
  const fresh = newLeft
    ? await db.select(select).from(c).leftJoin(schema.lessons, eq(schema.lessons.id, c.lessonId))
      .where(and(eq(c.userId, userId), eq(c.state, 0), eq(c.suspended, false)))
      .orderBy(asc(c.createdAt), asc(c.id)).limit(Math.min(newLeft, limit))
    : [];

  const mixed: typeof due = [];
  let i = 0, j = 0;
  while (mixed.length < limit && (i < due.length || j < fresh.length)) {
    if (i < due.length && (j >= fresh.length || (mixed.length + 1) % 3 !== 0)) mixed.push(due[i++]);
    else mixed.push(fresh[j++]);
  }
  return mixed.map((row) => ({
    id: row.id, kind: row.kind, front: row.front, back: row.back, payload: row.payload, sourceRef: row.sourceRef,
    lessonId: row.lessonId, lessonTopic: row.lessonTopic, isNew: row.state === 0,
    preview: preview(columns(row), now),
  }));
}

export interface ReviewInput { rating: number; correct?: boolean | null; answerText?: string | null; durationMs?: number | null }

/** Apply one answer: reschedule the card and log the review. Null if the card isn't the user's. */
export async function recordReview(db: Db, userId: string, cardId: string, input: ReviewInput, now = new Date()) {
  if (!isGrade(input.rating)) throw new Error("rating must be 1 to 4");
  const [row] = await db.select().from(c).where(and(eq(c.id, cardId), eq(c.userId, userId))).limit(1);
  if (!row) return null;
  const { next, log } = schedule(columns(row), input.rating, now);
  await db.transaction(async (tx) => {
    await tx.update(c).set(next).where(eq(c.id, cardId));
    await tx.insert(r).values({
      cardId, userId, rating: input.rating, state: log.state, correct: input.correct ?? null,
      answerText: input.answerText?.slice(0, 2000) ?? null, durationMs: input.durationMs ?? null,
      elapsedDays: log.elapsedDays, scheduledDays: log.scheduledDays, reviewedAt: now,
    });
  });
  return { due: next.due, state: next.state, scheduledDays: next.scheduledDays };
}

export interface ReviewStats {
  due: number;
  newAvailable: number;
  totalCards: number;
  learned: number;
  reviewedToday: number;
  streakDays: number;
  /** recall on mature cards (in review), by days since the last review */
  retention: { bucket: string; reviews: number; recalled: number }[];
  /** per lesson: cards, cards settled (in review), and cards overdue (due before today began) */
  lessons: { lessonId: string; topic: string; cards: number; learned: number; overdue: number }[];
}

const BUCKETS: [string, number, number][] = [["1–2 days", 0, 2], ["3–7 days", 3, 7], ["8–30 days", 8, 30], ["over 30 days", 31, 100000]];

/** dayOffsetMinutes: the learner's UTC offset, so "today" and the streak follow their clock. */
export async function reviewStats(db: Db, userId: string, now = new Date(), dayOffsetMinutes = 0, newPerDay = 10): Promise<ReviewStats> {
  const dayStart = startOfLocalDay(now, dayOffsetMinutes);
  const [[dueRow], [newRow], [totalRow], [learnedRow], [todayRow]] = await Promise.all([
    db.select({ n: count() }).from(c).where(and(eq(c.userId, userId), ne(c.state, 0), lte(c.due, now), eq(c.suspended, false))),
    db.select({ n: count() }).from(c).where(and(eq(c.userId, userId), eq(c.state, 0), eq(c.suspended, false))),
    db.select({ n: count() }).from(c).where(eq(c.userId, userId)),
    db.select({ n: count() }).from(c).where(and(eq(c.userId, userId), eq(c.state, 2))),
    db.select({ n: count() }).from(r).where(and(eq(r.userId, userId), gte(r.reviewedAt, dayStart))),
  ]);
  const newLeft = Math.max(0, newPerDay - (await newSeenSince(db, userId, dayStart)));

  const mature = await db.select({ elapsed: r.elapsedDays, rating: r.rating }).from(r)
    .where(and(eq(r.userId, userId), eq(r.state, 2)));
  const retention = BUCKETS.map(([bucket, lo, hi]) => {
    const inB = mature.filter((m) => m.elapsed >= lo && m.elapsed <= hi);
    return { bucket, reviews: inB.length, recalled: inB.filter((m) => m.rating >= 2).length };
  });

  // streak: consecutive local days with at least one review, ending today (or yesterday)
  const days = await db.select({ day: sql<string>`to_char(${r.reviewedAt} + make_interval(mins => ${dayOffsetMinutes}), 'YYYY-MM-DD')` })
    .from(r).where(eq(r.userId, userId)).groupBy(sql`1`).orderBy(desc(sql`1`)).limit(400);
  const set = new Set(days.map((d) => d.day));
  let streakDays = 0;
  const cursor = new Date(dayStart.getTime() + dayOffsetMinutes * 60_000);
  if (!set.has(ymd(cursor))) cursor.setUTCDate(cursor.getUTCDate() - 1); // today not done yet: count up to yesterday
  while (set.has(ymd(cursor))) { streakDays++; cursor.setUTCDate(cursor.getUTCDate() - 1); }

  const lessons = await db.select({
    lessonId: c.lessonId, topic: schema.lessons.topic,
    cards: count(), learned: sql<number>`count(*) filter (where ${c.state} = 2)`,
    // a raw sql fragment gets no column type, and the Postgres driver won't bind a Date there: pass ISO text
    overdue: sql<number>`count(*) filter (where ${c.state} <> 0 and ${c.due} < ${dayStart.toISOString()}::timestamptz and ${c.suspended} = false)`,
  // a left join: a lesson's cards count even in the seconds before the lesson itself is saved
  }).from(c).leftJoin(schema.lessons, eq(schema.lessons.id, c.lessonId))
    .where(eq(c.userId, userId)).groupBy(c.lessonId, schema.lessons.topic).orderBy(desc(count())).limit(20);

  return {
    due: dueRow.n, newAvailable: Math.min(newRow.n, newLeft), totalCards: totalRow.n, learned: learnedRow.n,
    reviewedToday: todayRow.n, streakDays, retention,
    lessons: lessons.filter((l) => l.lessonId).map((l) => ({ lessonId: l.lessonId!, topic: l.topic ?? "", cards: l.cards, learned: Number(l.learned), overdue: Number(l.overdue) })),
  };
}

function columns(row: FsrsColumns): FsrsColumns {
  return {
    due: row.due, stability: row.stability, difficulty: row.difficulty, elapsedDays: row.elapsedDays, scheduledDays: row.scheduledDays,
    learningSteps: row.learningSteps, reps: row.reps, lapses: row.lapses, state: row.state, lastReview: row.lastReview,
  };
}

export function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}
/** Midnight of the learner's day, as a UTC instant. */
export function startOfLocalDay(d: Date, offsetMinutes: number): Date {
  const local = new Date(d.getTime() + offsetMinutes * 60_000);
  return new Date(startOfUtcDay(local).getTime() - offsetMinutes * 60_000);
}
const ymd = (d: Date) => d.toISOString().slice(0, 10);
