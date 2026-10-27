import { toNextJsHandler } from "better-auth/next-js";
import { getAuth } from "@/lib/auth/server";

// Better Auth's endpoints (/api/auth/*): guest sign-in, email links, Google, sessions.
export const runtime = "nodejs";

const off = () => Response.json({ error: "Accounts are off: set DATABASE_URL." }, { status: 404 });
const auth = getAuth();

export const { GET, POST } = auth ? toNextJsHandler(auth) : { GET: off, POST: off };
