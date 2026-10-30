import { limitsFor, turnsLastDay } from "@/lib/turns/log";
import { requireUser } from "@/lib/lessons/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** How many questions this user has left in the daily limit (the last 24 hours), and whether a guest. */
export async function GET(request: Request) {
  const ctx = await requireUser(request);
  if (ctx instanceof Response) return ctx;
  const guest = !!ctx.user.isAnonymous;
  const { perDay } = limitsFor(guest);
  const used = await turnsLastDay(ctx.db, ctx.user.id);
  return Response.json({ used, perDay, left: Math.max(0, perDay - used), guest });
}
