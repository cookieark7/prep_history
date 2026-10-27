// Landing -> app handoff (prompt section 7): the question travels as plain text in the /study URL,
// backed up in sessionStorage. `kind` and `ref` never reach the Director: no contract changes.
// The entry point, requestStart, lives in lib/landing/start.ts (it needs auth and the login card).

export type PromptKind = "why" | "when" | "who" | "whatif" | "quiz" | "free";
export type Handoff = { q: string; kind: PromptKind; ref?: string }; // ref = "E06" or "B24"

export const PENDING_KEY = "chronicle.pendingQuestion";
const MAX_Q = 1000; // TurnRequest.message limit
const KINDS: readonly PromptKind[] = ["why", "when", "who", "whatif", "quiz", "free"];

/** Trimmed, capped at the TurnRequest limit; null when there's no question left. */
export function clean(h: Handoff): Handoff | null {
  const q = h.q.trim().slice(0, MAX_Q);
  if (!q) return null;
  return h.ref ? { q, kind: h.kind, ref: h.ref } : { q, kind: h.kind };
}

/** "/study?q=...&kind=why&src=landing&ref=E06" */
export function buildStudyHref(h: Handoff): string {
  const c = clean(h);
  if (!c) return "/study";
  const p = new URLSearchParams({ q: c.q, kind: c.kind, src: "landing" });
  if (c.ref) p.set("ref", c.ref);
  return `/study?${p.toString()}`;
}

/** The handoff in a /study URL, or null. */
export function readHandoff(searchParams: { get(name: string): string | null }): Handoff | null {
  if (searchParams.get("src") !== "landing") return null;
  const q = searchParams.get("q");
  if (!q) return null;
  const k = searchParams.get("kind") as PromptKind | null;
  const ref = searchParams.get("ref") ?? undefined;
  return clean({ q, kind: k && KINDS.includes(k) ? k : "free", ref });
}

export function savePending(h: Handoff): void {
  try {
    sessionStorage.setItem(PENDING_KEY, JSON.stringify(h));
  } catch {
    // storage blocked: the URL still carries the question
  }
}

export function takePending(): Handoff | null {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY);
    sessionStorage.removeItem(PENDING_KEY);
    if (!raw) return null;
    const h = JSON.parse(raw) as Handoff;
    return typeof h?.q === "string" ? clean({ q: h.q, kind: KINDS.includes(h.kind) ? h.kind : "free", ref: h.ref }) : null;
  } catch {
    return null;
  }
}

export function clearPending(): void {
  try {
    sessionStorage.removeItem(PENDING_KEY);
  } catch {
    // ignore
  }
}

/** The one-line hint above /study's composer while a handed-off question waits. */
export function handoffHint(h: Handoff): string {
  const from = h.ref?.startsWith("E") ? "From Starting points" : h.ref?.startsWith("B") ? "From the film" : "From the home page";
  return `${from} · press Enter to begin`;
}
