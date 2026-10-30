import type { BlockType } from "@/lib/contracts";
import { TYPE_LABEL } from "@/lib/store/reducer";

/**
 * Before the first part lands the line is honest rather than busy: what is happening and for how
 * long, and, once the wait is long, why (free models take a while to start). `tick` is seconds.
 */
export const ROTATE_MS = 1000;
export const SLOW_AFTER_S = 8;

export interface LastOp {
  type: BlockType;
  kind: "added" | "updated";
}

/**
 * The single status line in a reply row (no spinner, no dots).
 *  - not streaming: nothing
 *  - no part yet: "Writing your lesson", with the seconds so far (tick = seconds), and after
 *    SLOW_AFTER_S a note on why it takes this long
 *  - parts arriving: what just landed, plus a note that more is coming
 */
export function statusText(streaming: boolean, last: LastOp | null, tick: number): string | null {
  if (!streaming) return null;
  if (!last) {
    const s = tick > 0 ? ` · ${tick} s` : "";
    return tick >= SLOW_AFTER_S ? `Writing your lesson${s}. Free models can take up to 30 s to start.` : `Writing your lesson${s}`;
  }
  return `${TYPE_LABEL[last.type]} ${last.kind} · working on the next part`;
}
