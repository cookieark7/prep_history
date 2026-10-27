import { getAuthClient } from "@/lib/auth";
import { buildStudyHref, clean, clearPending, savePending, type Handoff } from "./handoff";
import { useLoginCard } from "./login-store";

// requestStart: the one entry point for every prompt chip, composer and "Ask about this" link
// (prompt section 7). Signed in, it goes straight to /study; signed out, it opens the login card
// with the question waiting, and finishSignIn carries it on afterwards.

export interface StartDeps {
  signedIn: () => boolean;
  navigate: (href: string) => void;
  openLogin: (h: Handoff) => void;
}

let navigator: ((href: string) => void) | null = null;

/** The landing registers Next's router here so navigation stays client-side. */
export function setNavigator(fn: (href: string) => void): () => void {
  navigator = fn;
  return () => { if (navigator === fn) navigator = null; };
}

export function navigate(href: string): void {
  if (navigator) navigator(href);
  else window.location.assign(href);
}

const defaultDeps: StartDeps = {
  signedIn: () => !!getAuthClient().getSession(),
  navigate,
  openLogin: (h) => useLoginCard.getState().openLogin(h),
};

export function requestStart(h: Handoff, deps: StartDeps = defaultDeps): void {
  const c = clean(h);
  if (!c) return;
  savePending(c); // survives a real OAuth redirect later
  if (deps.signedIn()) deps.navigate(buildStudyHref(c));
  else deps.openLogin(c);
}

/** After signing in on the card: the waiting question, or /study with an empty composer. */
export function finishSignIn(pending: Handoff | null, nav: (href: string) => void = navigate): void {
  if (!pending) clearPending();
  nav(pending ? buildStudyHref(pending) : "/study");
}

/** "Later" or Esc: drop the waiting question so it doesn't turn up on a later visit to /study. */
export function cancelStart(): void {
  clearPending();
}
