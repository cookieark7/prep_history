import type { Block, BlockType } from "@/lib/contracts";
import type { HistoryEntry } from "@/lib/store/reducer";

/** Stage order: pinned blocks first, then the rest in lesson order. */
export function orderedBlocks(blocks: Block[], pinned: string[]): Block[] {
  const pins = pinned.map((id) => blocks.find((b) => b.id === id)).filter((b): b is Block => !!b);
  return [...pins, ...blocks.filter((b) => !pinned.includes(b.id))];
}

/** Blocks with no interaction count as done once read for this long (≥40% in view). */
export const DWELL_MS = 2500;
export const PASSIVE: BlockType[] = ["article", "cause_graph", "timeline", "lineage", "callout"];

export interface RailItem {
  id: string;
  type: BlockType;
  title: string;
  complete: boolean;
}

export interface CompletionState {
  completed: Record<string, true>;
  gates: Record<string, { answer: string | null; skipped: boolean }>;
  quizRuns: Record<string, Record<string, boolean>>;
}

/**
 * A block is complete when its interaction is done: a predict gate answered or skipped,
 * every quiz item attempted; or, for passive blocks, after a short dwell (recorded in
 * `completed`). Everything here is persisted, so completion survives reload.
 */
export function isComplete(b: Block, s: CompletionState): boolean {
  if (s.completed[b.id]) return true;
  if (b.type === "predict_gate") {
    const g = s.gates[b.id];
    return !!g && (g.answer != null || g.skipped);
  }
  if (b.type === "quiz") {
    const run = s.quizRuns[b.id];
    return !!run && b.items.every((i) => i.id in run);
  }
  return false;
}

/** One tick per Stage block, in Stage order. */
export function railItems(blocks: Block[], pinned: string[], s: CompletionState): RailItem[] {
  return orderedBlocks(blocks, pinned).map((b) => ({ id: b.id, type: b.type, title: b.title, complete: isComplete(b, s) }));
}

/** Blocks a reply landed (added or patched), from the step trace, de-duplicated, in order. */
export function landedFor(history: HistoryEntry[], turn: string, blocks: Block[]): string[] {
  const out: string[] = [];
  for (const h of history) {
    if (h.turn !== turn || h.status === "skipped" || !h.blockId) continue;
    if (h.op !== "add" && h.op !== "patch") continue;
    if (!out.includes(h.blockId) && blocks.some((b) => b.id === h.blockId)) out.push(h.blockId);
  }
  return out;
}

/** The most recent landed step of a turn, for op-driven status text. */
export function lastLanded(history: HistoryEntry[], turn: string): HistoryEntry | null {
  for (let i = history.length - 1; i >= 0; i--) {
    const h = history[i];
    if (h.turn === turn && h.status === "applied" && (h.op === "add" || h.op === "patch")) return h;
  }
  return null;
}
