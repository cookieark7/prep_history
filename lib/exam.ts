// Exam prep's accuracy bar (docs/MODES_PLAN.md, 5.4), on the client: a key fact no passage backs
// is shown with a "check this" mark, and a lesson with few sources says so up front.

/** Key-fact sections are the ones the exam lesson heads "Key facts" (lib/prompts/director/goals.ts). */
export const isKeyFacts = (heading: string) => /^key facts\b/i.test(heading.trim());

const ITEM = /^(\s*)([-*+]|\d+[.)])\s+/;

/** Mark each list line without a citation ([S:n]) so Markdown renders "Check this" after it. */
export function markUnsourced(md: string): string {
  return md.split("\n").map((line) => (ITEM.test(line) && !/\[S:\d+\]/.test(line) ? `${line.trimEnd()} [Check this](check:)` : line)).join("\n");
}

/** Below this many passages, an exam lesson tells the student its sources are thin. */
export const THIN_SOURCES = 3;
