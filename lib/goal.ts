"use client";

import { useWorkspace } from "@/lib/store/workspace";
import { sendTurn } from "@/lib/stream-client";

// Turning an explore lesson into exam notes (docs/MODES_PLAN.md, section 6): the lesson keeps
// what it has, and the Director adds only the exam parts it lacks (lib/prompts/director/goals.ts).

export const EXAM_NOTES_ASK = "Make exam notes from this lesson: add the key facts, terms, timeline and practice questions it doesn't have yet.";

export function makeExamNotes() {
  useWorkspace.getState().setGoal("exam");
  return sendTurn({ message: EXAM_NOTES_ASK });
}
