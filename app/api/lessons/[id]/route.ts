import { z } from "zod";
import { deleteLesson, getLesson, LessonSnapshot, saveLesson } from "@/lib/lessons/repo";
import { readJson, requireUser } from "@/lib/lessons/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Ctx) {
  const ctx = await requireUser(request);
  if (ctx instanceof Response) return ctx;
  const lesson = await getLesson(ctx.db, ctx.user.id, (await params).id);
  return lesson ? Response.json(lesson) : Response.json({ error: "No such lesson." }, { status: 404 });
}

const Put = z.object({ snapshot: LessonSnapshot, baseVersion: z.number().int().positive().nullable() });

/** Save; 409 with the server's copy when the save was based on an older version. */
export async function PUT(request: Request, { params }: Ctx) {
  const ctx = await requireUser(request);
  if (ctx instanceof Response) return ctx;
  const body = await readJson(request);
  if (body instanceof Response) return body;
  const parsed = Put.safeParse(body);
  const id = (await params).id;
  if (!parsed.success || parsed.data.snapshot.lessonId !== id) return Response.json({ error: "Invalid lesson." }, { status: 400 });
  const r = await saveLesson(ctx.db, ctx.user.id, parsed.data.snapshot, parsed.data.baseVersion);
  if (r.ok) return Response.json({ version: r.version });
  if (r.reason === "not_yours") return Response.json({ error: "Not your lesson." }, { status: 403 });
  return Response.json({ version: r.version, snapshot: r.snapshot, updatedAt: r.updatedAt }, { status: 409 });
}

export async function DELETE(request: Request, { params }: Ctx) {
  const ctx = await requireUser(request);
  if (ctx instanceof Response) return ctx;
  const gone = await deleteLesson(ctx.db, ctx.user.id, (await params).id);
  return gone ? new Response(null, { status: 204 }) : Response.json({ error: "No such lesson." }, { status: 404 });
}
