import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { schema } from "@/lib/db/client";
import { readLlmConfig } from "@/lib/llm/config";
import { checkAnswer } from "@/lib/review/check";
import { readJson, requireUser } from "@/lib/lessons/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({ cardId: z.string().max(64), answer: z.string().trim().min(1).max(1000) });

/** Check a typed review answer against the card's answer: { verdict, feedback }. */
export async function POST(request: Request) {
  const ctx = await requireUser(request);
  if (ctx instanceof Response) return ctx;
  const body = await readJson(request, 10_000);
  if (body instanceof Response) return body;
  const parsed = Body.safeParse(body);
  if (!parsed.success) return Response.json({ error: "Send a card and an answer." }, { status: 400 });
  const config = readLlmConfig();
  if (!config.ok) return Response.json({ error: "The checker isn't set up here." }, { status: 503 });

  const c = schema.cards;
  const [card] = await ctx.db.select({ front: c.front, back: c.back }).from(c)
    .where(and(eq(c.id, parsed.data.cardId), eq(c.userId, ctx.user.id))).limit(1);
  if (!card) return Response.json({ error: "No such card." }, { status: 404 });

  const result = await checkAnswer({ ...card, answer: parsed.data.answer }, config.chain, request.signal);
  return result ? Response.json(result) : Response.json({ error: "The checker is busy. Compare with the answer yourself this time." }, { status: 503 });
}
