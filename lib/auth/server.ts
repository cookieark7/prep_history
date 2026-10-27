import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { anonymous, magicLink } from "better-auth/plugins";
import { getDb, schema, type Db } from "@/lib/db/client";
import { moveGuestData } from "./link";

// Accounts (docs/PROTOTYPE_PLAN.md, section 9), server side. Needs DATABASE_URL.
// - Everyone starts as a guest (anonymous plugin), so lessons and reviews are saved at once.
// - Signing in with an email link (or Google, when GOOGLE_CLIENT_ID/SECRET are set) keeps the
//   guest's data and makes it reachable from any device.

type SendMagicLink = (data: { email: string; url: string }) => Promise<void>;

export function createAuth(db: Db, opts: { baseURL?: string; secret?: string; sendMagicLink?: SendMagicLink; nextCookies?: boolean } = {}) {
  const google = process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ? { google: { clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET } }
    : {};
  const send = opts.sendMagicLink ?? sendMagicLink;
  return betterAuth({
    appName: "Chronicle",
    baseURL: opts.baseURL ?? process.env.BETTER_AUTH_URL,
    secret: opts.secret ?? process.env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: { user: schema.user, session: schema.session, account: schema.account, verification: schema.verification },
    }),
    socialProviders: google,
    session: { expiresIn: 60 * 60 * 24 * 90, updateAge: 60 * 60 * 24 },
    plugins: [
      anonymous({
        emailDomainName: "guest.chronicle.invalid",
        onLinkAccount: ({ anonymousUser, newUser }) => moveGuestData(db, anonymousUser.user.id, newUser.user.id),
      }),
      magicLink({ sendMagicLink: ({ email, url }) => send({ email, url }) }),
      ...(opts.nextCookies === false ? [] : [nextCookies()]), // keep last; tests run outside Next
    ],
  });
}

export type Auth = ReturnType<typeof createAuth>;

const g = globalThis as unknown as { __chronicleAuth?: Auth };

/** The app's auth, or null when there is no database (accounts are off). */
export function getAuth(): Auth | null {
  const db = getDb();
  if (!db) return null;
  g.__chronicleAuth ??= createAuth(db);
  return g.__chronicleAuth;
}

export const googleEnabled = () => !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

export interface CurrentUser { id: string; email: string; isAnonymous: boolean }

/** The signed-in (or guest) user for a request, or null. */
export async function currentUser(headers: Headers): Promise<CurrentUser | null> {
  const auth = getAuth();
  if (!auth) return null;
  const s = await auth.api.getSession({ headers }).catch(() => null);
  if (!s) return null;
  const u = s.user as typeof s.user & { isAnonymous?: boolean | null };
  return { id: u.id, email: u.email, isAnonymous: !!u.isAnonymous };
}

/**
 * Email links: sent through Resend when RESEND_API_KEY and EMAIL_FROM are set. In development
 * without them (or with AUTH_LOG_LINKS=1, for local test runs), the link is printed in the server log.
 */
async function sendMagicLink({ email, url }: { email: string; url: string }) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (key && from) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from, to: email, subject: "Your Chronicle sign-in link",
        text: `Open this link to sign in to Chronicle:\n\n${url}\n\nIt works once and expires in 5 minutes.`,
      }),
    });
    if (!res.ok) throw new Error(`Could not send the email (${res.status}).`);
    return;
  }
  // printing links is for development and local test runs (AUTH_LOG_LINKS=1), never a real deployment
  if (process.env.NODE_ENV === "production" && process.env.AUTH_LOG_LINKS !== "1") throw new Error("Email sign-in is not set up yet.");
  console.log(`[auth] sign-in link for ${email} (development; no email provider): ${url}`);
}
