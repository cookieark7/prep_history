import { eq } from "drizzle-orm";
import type { TurnRequest } from "@/lib/contracts";
import { schema, type Db } from "@/lib/db/client";
import { Citations, formatSources } from "@/lib/rag/citations";
import type { Embedder } from "@/lib/rag/embed";
import { retrieve, type Retrieved } from "@/lib/rag/retrieve";
import { recentExchanges } from "@/lib/turns/log";
import { buildContext } from "./context";

// Everything a turn needs besides the model, shared by /api/turn and scripts/eval.ts so the
// evals test exactly what learners get: the lesson's recent exchanges, retrieved passages, the
// context, and the citation rewrite for the reply.

export interface PreparedTurn {
  context: string;
  sources: Retrieved[];
  citations: Citations | null;
  /** why retrieval didn't run, or failed, if it didn't */
  retrievalNote?: string;
}

export async function prepareTurn(turn: TurnRequest, deps: { db: Db | null; embedder: Embedder | null; userId?: string | null; signal?: AbortSignal }): Promise<PreparedTurn> {
  const { db, embedder, userId } = deps;
  const lessonId = turn.lesson_id ?? null;

  const recent = db && userId && lessonId ? await recentExchanges(db, userId, lessonId).catch(() => []) : [];

  let sources: Retrieved[] = [];
  let retrievalNote: string | undefined;
  const query = retrievalQuery(turn);
  if (!db || !embedder) retrievalNote = "retrieval off";
  else if (!query) retrievalNote = "no retrieval for this kind of turn";
  else {
    try {
      const period = lessonId ? await lessonPeriod(db, lessonId) : null;
      sources = await retrieve(db, embedder, {
        query, period, k: Number(process.env.RAG_K ?? 6), tokenBudget: Number(process.env.RAG_SOURCE_TOKENS ?? 2200), signal: deps.signal,
      });
    } catch (e) {
      retrievalNote = `retrieval failed: ${(e as Error).message}`; // the lesson goes on without sources
    }
  }

  return {
    context: buildContext(turn, { recent, sources: formatSources(sources) }),
    sources,
    citations: sources.length ? new Citations(sources) : null,
    retrievalNote,
  };
}

/** What to search for, or null for turns that don't need sources (grading a quiz or a guess). */
export function retrievalQuery(turn: TurnRequest): string | null {
  const topic = turn.topic?.trim() ?? "";
  const ev = turn.event;
  if (ev?.event === "predict_answer" || ev?.event === "quiz_result") return null;
  if (turn.message && /\b(quiz|test) me\b/i.test(turn.message)) return null;
  const ask =
    turn.message?.trim() ||
    (ev?.event === "ask_why" ? ev.selection : ev?.event === "expand_node" ? ev.label : ev?.event === "note_created" ? `${ev.quote} ${ev.text}` : "");
  const q = [ask, topic && !ask.toLowerCase().includes(topic.toLowerCase()) ? topic : ""].filter(Boolean).join(" — ");
  return q.trim() ? q.slice(0, 500) : null;
}

async function lessonPeriod(db: Db, lessonId: string): Promise<[number, number] | null> {
  const [row] = await db.select({ from: schema.lessons.periodFrom, to: schema.lessons.periodTo }).from(schema.lessons).where(eq(schema.lessons.id, lessonId)).limit(1);
  return row && row.from !== null && row.to !== null ? [row.from, row.to] : null;
}
