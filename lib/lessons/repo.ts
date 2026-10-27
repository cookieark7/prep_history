import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { Block } from "@/lib/contracts";
import { schema, type Db } from "@/lib/db/client";
import { blockPeriod } from "@/lib/period";

// Lessons on the server (docs/PROTOTYPE_PLAN.md, section 9). The snapshot is the client's
// PersistedWorkspace, stored whole. Saves carry the version they were based on; a stale save
// gets the newer server copy back instead of overwriting it (last write wins per lesson,
// with a visible "updated from your other device").

/** Enough shape to index and summarise a lesson; the client validates the rest on load. */
export const LessonSnapshot = z.object({
  lessonId: z.string().min(1).max(64),
  topic: z.string().max(400).default(""),
  blocks: z.array(z.unknown()).max(200),
}).loose();
export type LessonSnapshot = z.infer<typeof LessonSnapshot>;

export interface LessonSummary {
  id: string;
  topic: string;
  period: [number, number] | null;
  blockCount: number;
  version: number;
  updatedAt: number;
}

export type SaveResult =
  | { ok: true; version: number }
  | { ok: false; reason: "conflict"; version: number; snapshot: unknown; updatedAt: number }
  | { ok: false; reason: "not_yours" };

export function summarise(snap: LessonSnapshot): { topic: string; periodFrom: number | null; periodTo: number | null; blockCount: number } {
  const ranges: [number, number][] = [];
  for (const raw of snap.blocks) {
    const b = Block.safeParse(raw);
    const p = b.success ? blockPeriod(b.data) : null;
    if (p) ranges.push(p);
  }
  const first = snap.blocks[0] as { title?: unknown } | undefined;
  return {
    topic: snap.topic || (typeof first?.title === "string" ? first.title : "") || "Untitled lesson",
    periodFrom: ranges.length ? Math.min(...ranges.map((r) => r[0])) : null,
    periodTo: ranges.length ? Math.max(...ranges.map((r) => r[1])) : null,
    blockCount: snap.blocks.length,
  };
}

export async function listLessons(db: Db, userId: string, limit = 50): Promise<LessonSummary[]> {
  const rows = await db
    .select({
      id: schema.lessons.id, topic: schema.lessons.topic, periodFrom: schema.lessons.periodFrom,
      periodTo: schema.lessons.periodTo, blockCount: schema.lessons.blockCount,
      version: schema.lessons.version, updatedAt: schema.lessons.updatedAt,
    })
    .from(schema.lessons)
    .where(eq(schema.lessons.userId, userId))
    .orderBy(desc(schema.lessons.updatedAt))
    .limit(limit);
  return rows.map((r) => ({
    id: r.id, topic: r.topic, blockCount: r.blockCount, version: r.version,
    period: r.periodFrom !== null && r.periodTo !== null ? [r.periodFrom, r.periodTo] : null,
    updatedAt: r.updatedAt.getTime(),
  }));
}

export async function getLesson(db: Db, userId: string, id: string) {
  const [row] = await db.select().from(schema.lessons)
    .where(and(eq(schema.lessons.id, id), eq(schema.lessons.userId, userId))).limit(1);
  return row ? { snapshot: row.snapshot, version: row.version, updatedAt: row.updatedAt.getTime() } : null;
}

/** Insert a new lesson, or update it if `baseVersion` is still the server's version. */
export async function saveLesson(db: Db, userId: string, snap: LessonSnapshot, baseVersion: number | null): Promise<SaveResult> {
  const id = snap.lessonId;
  const meta = summarise(snap);
  const now = new Date();

  if (baseVersion === null) {
    const inserted = await db.insert(schema.lessons)
      .values({ id, userId, snapshot: snap, version: 1, ...meta, createdAt: now, updatedAt: now })
      .onConflictDoNothing()
      .returning({ version: schema.lessons.version });
    if (inserted.length) return { ok: true, version: 1 };
  } else {
    const updated = await db.update(schema.lessons)
      .set({ snapshot: snap, version: sql`${schema.lessons.version} + 1`, ...meta, updatedAt: now })
      .where(and(eq(schema.lessons.id, id), eq(schema.lessons.userId, userId), eq(schema.lessons.version, baseVersion)))
      .returning({ version: schema.lessons.version });
    if (updated.length) return { ok: true, version: updated[0].version };
  }

  // nothing written: someone else's id, a missing row, or a newer version on the server
  const [row] = await db.select().from(schema.lessons).where(eq(schema.lessons.id, id)).limit(1);
  if (!row) return saveLesson(db, userId, snap, null); // based on a version that was deleted: start over
  if (row.userId !== userId) return { ok: false, reason: "not_yours" };
  return { ok: false, reason: "conflict", version: row.version, snapshot: row.snapshot, updatedAt: row.updatedAt.getTime() };
}

export async function deleteLesson(db: Db, userId: string, id: string): Promise<boolean> {
  const gone = await db.delete(schema.lessons)
    .where(and(eq(schema.lessons.id, id), eq(schema.lessons.userId, userId)))
    .returning({ id: schema.lessons.id });
  return gone.length > 0;
}

/** One-time upload of lessons kept in the browser before accounts existed. Existing ids are kept. */
export async function importLessons(db: Db, userId: string, snaps: LessonSnapshot[]): Promise<number> {
  let n = 0;
  for (const snap of snaps) {
    if (!snap.blocks.length) continue;
    const r = await db.insert(schema.lessons)
      .values({ id: snap.lessonId, userId, snapshot: snap, version: 1, ...summarise(snap) })
      .onConflictDoNothing()
      .returning({ id: schema.lessons.id });
    n += r.length;
  }
  return n;
}
