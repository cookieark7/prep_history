import type { BlockType } from "@/lib/contracts";
import { TYPE_LABEL } from "@/lib/store/reducer";

/** Shown between send and the first op. Short, and about what the Director is doing. */
export const WAITING_VERBS = [
  "Mapping causes",
  "Placing events in time",
  "Checking who came before whom",
  "Looking for the turning point",
  "Weighing the evidence",
  "Separating causes from consequences",
];
export const ROTATE_MS = 2500;

export interface LastOp {
  type: BlockType;
  kind: "added" | "updated";
}

/**
 * The single status line in a reply row (no spinner, no dots).
 *  - not streaming: nothing
 *  - no op yet: a rotating verb (tick = how many rotations have passed)
 *  - ops arriving: what just landed, plus a note that more is coming
 */
export function statusText(streaming: boolean, last: LastOp | null, tick: number): string | null {
  if (!streaming) return null;
  if (!last) return `${WAITING_VERBS[tick % WAITING_VERBS.length]}…`;
  return `${TYPE_LABEL[last.type]} ${last.kind} · working on the next block`;
}
