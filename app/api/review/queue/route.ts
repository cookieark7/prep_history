import { reviewQueue, startOfLocalDay } from "@/lib/review/repo";
import { requireUser } from "@/lib/lessons/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The cards to review now: due ones first, with today's new cards mixed in. ?tz= is the UTC offset in minutes. */
export async function GET(request: Request) {
  const ctx = await requireUser(request);
  if (ctx instanceof Response) return ctx;
  const q = new URL(request.url).searchParams;
  const now = new Date();
  const tz = Number(q.get("tz") ?? 0) || 0;
  const items = await reviewQueue(ctx.db, ctx.user.id, {
    now, limit: Math.min(50, Number(q.get("limit") ?? 20) || 20),
    newPerDay: Number(process.env.REVIEW_NEW_PER_DAY ?? 10), dayStart: startOfLocalDay(now, tz),
  });
  return Response.json({ items });
}
