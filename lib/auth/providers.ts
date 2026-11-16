// Which sign-in methods the server can offer. Plain env reads, safe to import anywhere on the
// server (lib/auth/server.ts opens the database; this doesn't).

/** Google sign-in needs both keys of an OAuth client (see .env.example). */
export const googleEnabled = (): boolean => !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
