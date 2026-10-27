import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createAuth } from "@/lib/auth/server";
import type { Db } from "@/lib/db/client";
import { listLessons, saveLesson } from "@/lib/lessons/repo";
import { testDb } from "./helpers/db";

// The whole account story through Better Auth's own HTTP handler, on an in-memory Postgres:
// a guest starts learning, then signs in with an email link and keeps their lesson.

const BASE = "http://localhost:3000";
let db: Db;
let close: () => Promise<void>;
let auth: ReturnType<typeof createAuth>;
const sent: { email: string; url: string }[] = [];

beforeAll(async () => {
  ({ db, close } = await testDb());
  auth = createAuth(db, { baseURL: BASE, secret: "test-secret-0123456789-abcdefghijklmnop", nextCookies: false, sendMagicLink: async (d) => { sent.push(d); } });
}, 30_000);
afterAll(() => close());

const call = (path: string, init: RequestInit = {}) =>
  auth.handler(new Request(`${BASE}/api/auth${path}`, { ...init, headers: { origin: BASE, "content-type": "application/json", ...(init.headers ?? {}) } }));
/** "name=value; name2=value2" from a response's Set-Cookie headers. */
const cookiesOf = (r: Response) => r.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
const sessionFor = (cookie: string) => auth.api.getSession({ headers: new Headers({ cookie }) });

describe("accounts", () => {
  it("guest → email link → the same lessons under a real account", async () => {
    const guest = await call("/sign-in/anonymous", { method: "POST", body: "{}" });
    expect(guest.status).toBe(200);
    const guestCookie = cookiesOf(guest);
    const g = await sessionFor(guestCookie);
    expect(g?.user).toMatchObject({ isAnonymous: true });

    await saveLesson(db, g!.user.id, { lessonId: "l-guest", topic: "Why did Rome beat Carthage?", blocks: [{ id: "b1" }] }, null);

    const link = await call("/sign-in/magic-link", { method: "POST", headers: { cookie: guestCookie }, body: JSON.stringify({ email: "learner@example.com", callbackURL: "/study" }) });
    expect(link.status).toBe(200);
    expect(sent.at(-1)).toMatchObject({ email: "learner@example.com" });

    const verified = await auth.handler(new Request(sent.at(-1)!.url, { headers: { cookie: guestCookie } }));
    expect([200, 302]).toContain(verified.status);
    const account = await sessionFor(cookiesOf(verified));
    expect(account?.user).toMatchObject({ email: "learner@example.com" });
    expect(account?.user.isAnonymous).toBeFalsy();
    expect(account!.user.id).not.toBe(g!.user.id);

    expect((await listLessons(db, account!.user.id)).map((l) => l.id)).toEqual(["l-guest"]);
  });

  it("the same email on another device reaches the same account", async () => {
    await call("/sign-in/magic-link", { method: "POST", body: JSON.stringify({ email: "learner@example.com", callbackURL: "/study" }) });
    const verified = await auth.handler(new Request(sent.at(-1)!.url));
    const other = await sessionFor(cookiesOf(verified));
    expect(other?.user.email).toBe("learner@example.com");
    expect((await listLessons(db, other!.user.id)).map((l) => l.id)).toEqual(["l-guest"]);
  });
});
