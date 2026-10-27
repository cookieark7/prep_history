import { z } from "zod";
import { recordReview } from "@/lib/review/repo";
import { readJson, requireUser } from "@/lib/lessons/http";

export const runtime = "nodejs";

const Body = z.object({
  rating: z.number().int().min(1).max(4),
  correct: z.boolean().nullable().optional(),
  answerText: z.string().max(2000).nullable().optional(),
  durationMs: z.number().int().min(0).max(3_600_000).nullable().optional(),
});

/** Record one answer: 1 again, 2 hard, 3 good, 4 easy. Returns when the card comes back. */
export async function POST(request: Request, { params }: { params: Promise<{ cardId: string }> }) {
  const ctx = await requireUser(request);
  if (ctx instanceof Response) return ctx;
  const body = await readJson(request);
  if (body instanceof Response) return body;
  const parsed = Body.safeParse(body);
  if (!parsed.success) return Response.json({ error: "Invalid review." }, { status: 400 });
  const res = await recordReview(ctx.db, ctx.user.id, (await params).cardId, parsed.data);
  return res ? Response.json(res) : Response.json({ error: "No such card." }, { status: 404 });
}
