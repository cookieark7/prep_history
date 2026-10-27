import { currentUser, type CurrentUser } from "@/lib/auth/server";
import { getDb, type Db } from "@/lib/db/client";

/** For the lesson and review routes: the database and the caller, or the error response to send. */
export async function requireUser(request: Request): Promise<{ db: Db; user: CurrentUser } | Response> {
  const db = getDb();
  if (!db) return Response.json({ error: "Accounts are off: set DATABASE_URL." }, { status: 404 });
  const user = await currentUser(request.headers);
  if (!user) return Response.json({ error: "Not signed in." }, { status: 401 });
  return { db, user };
}

/** Parse a JSON body, refusing anything over `maxBytes`. */
export async function readJson(request: Request, maxBytes = 2_000_000): Promise<unknown | Response> {
  const text = await request.text();
  if (text.length > maxBytes) return Response.json({ error: "Too large." }, { status: 413 });
  try {
    return JSON.parse(text);
  } catch {
    return Response.json({ error: "Body must be JSON." }, { status: 400 });
  }
}
