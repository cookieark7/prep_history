import type { AuthClient, Session, SignInOptions } from "./types";

// TODO(auth): a fake session in localStorage. Nothing leaves the browser: "Continue with Google"
// opens no popup, and "Continue with email" signs in at once without sending any email.

export const PLACEHOLDER_KEY = "chronicle.auth.placeholder";

type KeyValue = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function createPlaceholderAuth(opts: { storage?: () => KeyValue | null; delayMs?: number } = {}): AuthClient {
  const storage = opts.storage ?? (() => { try { return localStorage; } catch { return null; } });
  const delayMs = opts.delayMs ?? 400;
  const listeners = new Set<(s: Session | null) => void>();
  let cache: Session | null | undefined; // undefined: not read yet

  const read = (): Session | null => {
    try {
      const raw = storage()?.getItem(PLACEHOLDER_KEY);
      const s = raw ? (JSON.parse(raw) as Session) : null;
      return s && typeof s.user?.id === "string" ? s : null;
    } catch {
      return null; // unreadable storage counts as signed out
    }
  };
  const write = (s: Session | null) => {
    try {
      if (s) storage()?.setItem(PLACEHOLDER_KEY, JSON.stringify(s));
      else storage()?.removeItem(PLACEHOLDER_KEY);
    } catch {
      // blocked storage: the session lives in memory for this page only
    }
    cache = s;
    listeners.forEach((l) => l(s));
  };
  const wait = () => new Promise<void>((r) => setTimeout(r, delayMs));
  const make = (provider: Session["provider"], email: string | null, o?: SignInOptions): Session => ({
    user: { id: `placeholder-${provider}`, name: email ? email.split("@")[0] : "Guest learner", email },
    provider,
    prefs: { weeklyNote: o?.weeklyNote ?? false },
  });

  return {
    getSession() {
      if (cache === undefined) cache = read();
      return cache;
    },
    async signInWithGoogle(o) {
      await wait();
      const s = make("google", null, o);
      write(s);
      return s;
    },
    async signInWithEmail(email, o) {
      const e = email.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) throw new Error("Enter a valid email address.");
      await wait();
      const s = make("email", e, o);
      write(s);
      return s;
    },
    async continueAsGuest() {
      const s: Session = { user: { id: "placeholder-guest", name: "Guest learner", email: null }, provider: "guest", prefs: { weeklyNote: false } };
      write(s);
      return s;
    },
    async signOut() {
      write(null);
    },
    subscribe(listener) {
      listeners.add(listener);
      // other tabs signing in or out
      const onStorage = (ev: StorageEvent) => {
        if (ev.key !== PLACEHOLDER_KEY) return;
        cache = read();
        listener(cache);
      };
      if (typeof window !== "undefined") window.addEventListener("storage", onStorage);
      return () => {
        listeners.delete(listener);
        if (typeof window !== "undefined") window.removeEventListener("storage", onStorage);
      };
    },
  };
}
