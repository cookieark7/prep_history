import { z } from "zod";
import { saveCards } from "@/lib/review/repo";
import { readJson, requireUser } from "@/lib/lessons/http";

export const runtime = "nodejs";

const Body = z.object({
  lessonId: z.string().max(64).nullable(),
  front: z.string().min(8).max(200),
  back: z.string().min(2).max(400),
  sourceRef: z.object({ block: z.string().max(32), node: z.string().max(32).nullable() }).nullable(),
});

/** A card the learner made themselves (a "Remember" note). */
export async function POST(request: Request) {
  const ctx = await requireUser(request);
  if (ctx instanceof Response) return ctx;
  const body = await readJson(request);
  if (body instanceof Response) return body;
  const parsed = Body.safeParse(body);
  if (!parsed.success) return Response.json({ error: "Invalid card." }, { status: 400 });
  const { lessonId, front, back, sourceRef } = parsed.data;
  const saved = await saveCards(ctx.db, ctx.user.id, lessonId, [{ kind: "note", front, back, sourceRef, cites: [], origin: "note" }]);
  return Response.json({ saved });
}
