"use client";

import { useSyncExternalStore } from "react";
import { createBetterAuthClient } from "./better";
import { createPlaceholderAuth } from "./placeholder";
import type { AuthClient, Session } from "./types";

export type { AuthClient, Session, SignInOptions } from "./types";

let client: AuthClient | null = null;

/** Real accounts when the server has a database (NEXT_PUBLIC_CHRONICLE_ACCOUNTS=1), else the placeholder. */
export const ACCOUNTS = process.env.NEXT_PUBLIC_CHRONICLE_ACCOUNTS === "1";

export function getAuthClient(): AuthClient {
  if (!client) client = ACCOUNTS ? createBetterAuthClient() : createPlaceholderAuth();
  return client;
}

/** The current session for rendering (null on the server and while signed out). */
export function useSession(): Session | null {
  return useSyncExternalStore(
    (cb) => getAuthClient().subscribe(cb),
    () => getAuthClient().getSession(),
    () => null,
  );
}
