import { and, count, desc, eq, gte, isNotNull } from "drizzle-orm";
import type { StreamLine, TurnRequest } from "@/lib/contracts";
import { schema, type Db } from "@/lib/db/client";
import type { Attempt } from "@/lib/llm/router";

// The turn log (docs/PROTOTYPE_PLAN.md, sections 8 and 10): one row per Director turn. The row
// is written when the turn starts ("running"), so a double submit is refused and in-flight turns
// count towards the limits, and completed when the stream ends.

export interface Limits { perDay: number; perMinute: number }

export function limitsFor(isGuest: boolean, env: Record<string, string | undefined> = process.env): Limits {
  const n = (v: string | undefined, d: number) => (v && Number.isFinite(Number(v)) ? Number(v) : d);
  return {
    perDay: isGuest ? n(env.GUEST_TURNS_PER_DAY, 20) : n(env.TURNS_PER_DAY, 60),
    perMinute: n(env.TURNS_PER_MINUTE, 6),
  };
}

/** "day" or "minute" when the user is over a limit, else null. */
export async function overLimit(db: Db, userId: string, limits: Limits, now = Date.now()): Promise<"day" | "minute" | null> {
  const since = (ms: number) => and(eq(schema.turns.userId, userId), gte(schema.turns.createdAt, new Date(now - ms)));
  const [day] = await db.select({ n: count() }).from(schema.turns).where(since(24 * 3600_000));
  if (day.n >= limits.perDay) return "day";
  const [minute] = await db.select({ n: count() }).from(schema.turns).where(since(60_000));
  if (minute.n >= limits.perMinute) return "minute";
  return null;
}

/** Reserve the turn id. False when that id was already used (a double submit). */
export async function startTurn(db: Db, row: { id: string; userId: string | null; lessonId: string | null; request: TurnRequest; promptVersion: string }): Promise<boolean> {
  const r = await db.insert(schema.turns)
    .values({ ...row, status: "running" })
    .onConflictDoNothing()
    .returning({ id: schema.turns.id });
  return r.length > 0;
}

export async function finishTurn(db: Db, id: string, done: {
  lines: StreamLine[]; attempts: Attempt[]; status: "ok" | "error" | "aborted"; totalMs: number;
  sources?: { sid: string; chunkId: number; heading: string }[]; citations?: { cited: number; removed: number } | null;
}) {
  const served = done.attempts.find((a) => a.outcome === "ok");
  await db.update(schema.turns).set({
    lines: done.lines,
    attempts: done.attempts,
    status: done.status,
    provider: served ? `${served.provider} (${served.model})` : null,
    droppedLines: done.attempts.reduce((s, a) => s + a.dropped, 0),
    repairedLines: done.attempts.reduce((s, a) => s + a.repaired, 0),
    firstLineMs: served?.firstLineMs ?? null,
    totalMs: done.totalMs,
    sources: done.sources ?? [],
    citations: done.citations ?? null,
  }).where(eq(schema.turns.id, id));
}

export async function logLimited(db: Db, row: { id: string; userId: string; lessonId: string | null; request: TurnRequest; promptVersion: string; lines: StreamLine[] }) {
  await db.insert(schema.turns).values({ ...row, status: "limited" }).onConflictDoNothing();
}

/**
 * The last few exchanges of a lesson, oldest first, for the Director's context: what the
 * learner asked (or did) and the one-sentence answer.
 */
export async function recentExchanges(db: Db, userId: string, lessonId: string, n = 4): Promise<{ input: string; say: string }[]> {
  const rows = await db.select({ request: schema.turns.request, lines: schema.turns.lines }).from(schema.turns)
    .where(and(eq(schema.turns.userId, userId), eq(schema.turns.lessonId, lessonId), eq(schema.turns.status, "ok"), isNotNull(schema.turns.lines)))
    .orderBy(desc(schema.turns.createdAt))
    .limit(n);
  return rows.reverse().map((r) => {
    const req = r.request as TurnRequest;
    const say = (r.lines as StreamLine[]).find((l) => l.t === "say");
    return {
      input: req.message ? `learner: ${req.message}` : req.event ? `ui_event: ${req.event.event}` : "",
      say: say?.t === "say" ? say.text : "",
    };
  });
}

/** For /admin/turns. */
export async function latestTurns(db: Db, limit = 50) {
  return db.select().from(schema.turns).orderBy(desc(schema.turns.createdAt)).limit(limit);
}
