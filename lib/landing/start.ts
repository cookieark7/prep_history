import { buildStudyHref, clean, clearPending, savePending, type Handoff } from "./handoff";

// requestStart: the one entry point for every question asked on the homepage (the question box,
// its lenses, the syllabus questions). It goes straight to /study, signed in or not, and the
// lesson starts there at once with the question, as a guest when needed (owner decision,
// 28 Oct 2026: no sign-in card in the way, and the question sends itself). Signing in stays
// on offer in the header; finishSignIn below is for that card.

export interface StartDeps {
  navigate: (href: string) => void;
  /** a fresh token per question, so /study starts each one exactly once */
  token: () => string;
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
  navigate,
  token: () => Date.now().toString(36),
};

export function requestStart(h: Handoff, deps: StartDeps = defaultDeps): void {
  const c = clean(h);
  if (!c) return;
  savePending(c); // the URL carries it too; this copy survives if the URL is lost on the way
  deps.navigate(`${buildStudyHref(c)}&t=${deps.token()}`);
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
