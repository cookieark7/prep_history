import { reviewStats } from "@/lib/review/repo";
import { requireUser } from "@/lib/lessons/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Due today, streak, and how much is remembered by interval. ?tz= is the UTC offset in minutes. */
export async function GET(request: Request) {
  const ctx = await requireUser(request);
  if (ctx instanceof Response) return ctx;
  const tz = Number(new URL(request.url).searchParams.get("tz") ?? 0) || 0;
  return Response.json(await reviewStats(ctx.db, ctx.user.id, new Date(), tz, Number(process.env.REVIEW_NEW_PER_DAY ?? 10)));
}
