"use client";

import { createAuthClient } from "better-auth/react";
import { anonymousClient, magicLinkClient } from "better-auth/client/plugins";
import type { AuthClient, Session } from "./types";

// Real accounts over Better Auth (lib/auth/server.ts), behind the app's AuthClient interface.
// The session is cached so getSession() can stay synchronous for rendering.

const METHOD_KEY = "chronicle.auth.method"; // how this browser last signed in, for Session.provider
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface BetterUser { id: string; name: string; email: string; isAnonymous?: boolean | null }

/** Only same-site paths, so a crafted link can't send someone elsewhere after signing in. */
const safeNext = (next?: string) => (next && next.startsWith("/") && !next.startsWith("//") ? next : "/study");

export function createBetterAuthClient(): AuthClient {
  const client = createAuthClient({ plugins: [anonymousClient(), magicLinkClient()] });
  const listeners = new Set<(s: Session | null) => void>();
  let cache: Session | null = null;
  let loading: Promise<Session | null> | null = null;

  const remember = (m: "google" | "email") => { try { localStorage.setItem(METHOD_KEY, m); } catch { /* private mode */ } };
  const method = (): "google" | "email" => { try { return localStorage.getItem(METHOD_KEY) === "google" ? "google" : "email"; } catch { return "email"; } };

  const toSession = (u: BetterUser | undefined | null): Session | null => {
    if (!u) return null;
    const guest = !!u.isAnonymous;
    return {
      user: { id: u.id, name: guest ? "Guest learner" : u.name || u.email.split("@")[0], email: guest ? null : u.email },
      provider: guest ? "guest" : method(),
      prefs: { weeklyNote: false },
    };
  };
  const set = (s: Session | null) => { cache = s; listeners.forEach((l) => l(s)); };
  const refresh = async () => {
    const { data } = await client.getSession();
    const s = toSession(data?.user as BetterUser | undefined);
    set(s);
    return s;
  };
  const loaded = () => (loading ??= refresh().catch(() => null));
  if (typeof window !== "undefined") void loaded();

  return {
    getSession: () => cache,

    async signInWithGoogle(opts) {
      remember("google");
      const { error } = await client.signIn.social({ provider: "google", callbackURL: safeNext(opts?.next) });
      if (error) throw new Error(error.status === 404 ? "Google sign-in isn't set up yet. Use your email." : error.message || "That didn't work. Try again.");
      return new Promise<Session>(() => {}); // the page is on its way to Google
    },

    async signInWithEmail(email, opts) {
      const e = email.trim();
      if (!EMAIL.test(e)) throw new Error("Enter a valid email address.");
      remember("email");
      const { error } = await client.signIn.magicLink({ email: e, callbackURL: safeNext(opts?.next) });
      if (error) throw new Error(error.message || "We couldn't send the link. Try again.");
      return null; // finished when the learner opens the link
    },

    async continueAsGuest() {
      const current = await loaded();
      if (current) return current;
      const { error } = await client.signIn.anonymous();
      if (error) throw new Error(error.message || "We couldn't start a session. Try again.");
      const s = await refresh();
      if (!s) throw new Error("We couldn't start a session. Try again.");
      return s;
    },

    async signOut() {
      await client.signOut();
      set(null);
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
  };
}
