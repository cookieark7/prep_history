import { listLessons } from "@/lib/lessons/repo";
import { requireUser } from "@/lib/lessons/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The caller's lessons, newest first (no snapshots). */
export async function GET(request: Request) {
  const ctx = await requireUser(request);
  if (ctx instanceof Response) return ctx;
  return Response.json({ lessons: await listLessons(ctx.db, ctx.user.id) });
}
