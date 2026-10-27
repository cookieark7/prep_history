// The auth interface the app talks to (landing prompt section 3). Two implementations:
// lib/auth/better.ts (real accounts, when the server has a database) and lib/auth/placeholder.ts
// (a fake session in localStorage, when it does not).

export interface Session {
  user: { id: string; name: string; email: string | null };
  /** "guest": an account made automatically on first use, not yet tied to an email */
  provider: "google" | "email" | "guest";
  prefs: { weeklyNote: boolean }; // TODO(auth): wire to real email preferences
}

export interface SignInOptions {
  weeklyNote?: boolean;
  /** where to land after signing in, e.g. /study with the waiting question (default /study) */
  next?: string;
}

export interface AuthClient {
  /** The current session, or null. Synchronous: clients keep a cached copy for rendering. */
  getSession(): Session | null;
  signInWithGoogle(opts?: SignInOptions): Promise<Session>;
  /**
   * The session, or null when a sign-in link was emailed instead: the learner finishes by
   * opening it (real accounts work this way; the placeholder signs in at once).
   */
  signInWithEmail(email: string, opts?: SignInOptions): Promise<Session | null>;
  /** Start without an account: a guest session that a later sign-in keeps. */
  continueAsGuest(): Promise<Session>;
  signOut(): Promise<void>;
  /** Called with the new session (or null) whenever it changes. Returns an unsubscribe. */
  subscribe(listener: (s: Session | null) => void): () => void;
}
