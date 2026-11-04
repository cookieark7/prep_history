import { randomUUID } from "node:crypto";
import { TurnRequest, type StreamLine } from "@/lib/contracts";
import { DIRECTOR_SYSTEM_PROMPT, PROMPT_VERSION } from "@/lib/prompts/director";
import { prepareTurn } from "@/lib/director/turn";
import { withCitations } from "@/lib/rag/citations";
import { getEmbedder } from "@/lib/rag/embed";
import { buildChain, readLlmConfig } from "@/lib/llm/config";
import { describeAttempts, streamTurn, type Attempt } from "@/lib/llm/router";
import { currentUser } from "@/lib/auth/server";
import { getDb } from "@/lib/db/client";
import { finishTurn, limitsFor, logLimited, overLimit, startTurn } from "@/lib/turns/log";
import { cardsFromTurn } from "@/lib/review/cards";
import { saveCards } from "@/lib/review/repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEADERS = {
  "Content-Type": "application/x-ndjson; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Accel-Buffering": "no",
};

const LIMIT_SAY: Record<"day" | "minute", string> = {
  day: "You've reached today's limit of lessons on the free model. Your reviews still work; new questions open again tomorrow.",
  minute: "That's a lot of questions in a minute. Give it a moment and ask again.",
};

export async function POST(request: Request) {
  const config = readLlmConfig();
  if (!config.ok) {
    console.error(`[turn] ${config.error}`);
    return Response.json({ error: `Server is not configured. ${config.error}` }, { status: 500 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Body must be JSON." }, { status: 400 });
  }
  const parsed = TurnRequest.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid turn request.", issues: parsed.error.issues }, { status: 400 });
  }
  const turn = parsed.data;
  if (!turn.message && !turn.event) {
    return Response.json({ error: "Send a message or an event." }, { status: 400 });
  }

  // With a database: who is asking, their limits, the turn log, and the lesson's recent turns.
  // Without one, turns work exactly as before.
  const db = getDb();
  const user = db ? await currentUser(request.headers) : null;
  const turnId = turn.turn_id || randomUUID();
  const lessonId = turn.lesson_id ?? null;
  if (db) {
    if (user) {
      const over = await overLimit(db, user.id, limitsFor(user.isAnonymous));
      if (over) {
        const lines: StreamLine[] = [{ t: "say", text: LIMIT_SAY[over] }, { t: "done" }];
        await logLimited(db, { id: turnId, userId: user.id, lessonId, request: turn, promptVersion: PROMPT_VERSION, lines }).catch(() => {});
        console.log(`[turn] ${PROMPT_VERSION} · limited (${over}) for ${user.id}`);
        return new Response(lines.map((l) => JSON.stringify(l)).join("\n") + "\n", { headers: HEADERS });
      }
    }
    const fresh = await startTurn(db, { id: turnId, userId: user?.id ?? null, lessonId, request: turn, promptVersion: PROMPT_VERSION }).catch((e) => {
      console.error("[turn] could not log the turn", e);
      return true; // the log is not worth failing a lesson over
    });
    if (!fresh) return Response.json({ error: "This turn was already sent." }, { status: 409 });
  }

  const upstream = new AbortController();
  request.signal.addEventListener("abort", () => upstream.abort());

  // The lesson's recent turns and retrieved passages (lib/director/turn.ts).
  const started = Date.now();
  const prep = await prepareTurn(turn, { db, embedder: getEmbedder(), userId: user?.id, signal: upstream.signal });
  if (prep.retrievalNote?.startsWith("retrieval failed")) console.warn(`[turn] ${prep.retrievalNote}`);

  // Providers in order (LLM_CHAIN); the router falls back while nothing has reached the client.
  const attempts: Attempt[] = [];
  const routed = streamTurn(
    buildChain(config.chain, turn),
    { system: DIRECTOR_SYSTEM_PROMPT, user: prep.context, signal: upstream.signal },
    { attempts },
  );
  const lines = prep.citations ? withCitations(routed, prep.citations) : routed;
  const sent: StreamLine[] = [];
  const encoder = new TextEncoder();
  let finished = false;
  const finish = (status: "ok" | "error" | "aborted") => {
    if (finished) return;
    finished = true;
    const cites = prep.citations?.stats;
    console.log(`[turn] ${PROMPT_VERSION} · ${prep.sources.length} sources${cites ? ` (${cites.cited} cited, ${cites.removed} removed)` : ""} · ${describeAttempts(attempts) || "no attempt"}`);
    if (db) {
      const sources = prep.sources.map((s) => ({ sid: s.sid, chunkId: s.chunkId, heading: s.heading }));
      void finishTurn(db, turnId, { lines: sent, attempts, status, totalMs: Date.now() - started, sources, citations: cites ?? null })
        .catch((e) => console.error("[turn] could not complete the turn log", e));
      // the ideas worth remembering go into the learner's review queue
      if (user && status === "ok") {
        void saveCards(db, user.id, lessonId, cardsFromTurn(sent), new Date(), turn.workspace.goal ?? "explore")
          .then((n) => { if (n) console.log(`[turn] ${n} cards saved for review`); })
          .catch((e) => console.error("[turn] could not save cards", e));
      }
    }
  };

  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { value, done } = await lines.next();
        if (done) {
          finish(attempts.some((a) => a.outcome === "ok") ? "ok" : upstream.signal.aborted ? "aborted" : "error");
          return controller.close();
        }
        sent.push(value);
        controller.enqueue(encoder.encode(JSON.stringify(value satisfies StreamLine) + "\n"));
      } catch (e) {
        console.error("[turn] stream failure", e);
        finish("error");
        controller.close();
      }
    },
    cancel() {
      upstream.abort();
      void lines.return(undefined);
      finish("aborted");
    },
  });

  return new Response(stream, { headers: { ...HEADERS, "X-Chronicle-Prompt": PROMPT_VERSION } });
}
