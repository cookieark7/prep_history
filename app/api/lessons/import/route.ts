import { z } from "zod";
import { importLessons, LessonSnapshot } from "@/lib/lessons/repo";
import { readJson, requireUser } from "@/lib/lessons/http";

export const runtime = "nodejs";

const Body = z.object({ lessons: z.array(LessonSnapshot).max(20) });

/** One-time upload of the lessons this browser kept before accounts existed. */
export async function POST(request: Request) {
  const ctx = await requireUser(request);
  if (ctx instanceof Response) return ctx;
  const body = await readJson(request, 8_000_000);
  if (body instanceof Response) return body;
  const parsed = Body.safeParse(body);
  if (!parsed.success) return Response.json({ error: "Invalid lessons." }, { status: 400 });
  return Response.json({ imported: await importLessons(ctx.db, ctx.user.id, parsed.data.lessons) });
}
