import type { BlockType } from "@/lib/contracts";
import { TYPE_LABEL } from "@/lib/store/reducer";

export type Direction = "above" | "below";

export interface PendingLanding {
  id: string;
  type: BlockType;
  dir: Direction;
}

/** How long an unclicked landing chip stays up. */
export const LANDING_CHIP_MS = 8000;

/**
 * Where a just-landed block sits relative to the reading viewport, or null when any part
 * of it is visible (`topInset` is the sticky top bar).
 */
export function landingDirection(rect: { top: number; bottom: number }, viewportH: number, topInset = 64): Direction | null {
  if (rect.top >= viewportH) return "below";
  if (rect.bottom <= topInset) return "above";
  return null;
}

/** "Cause graph added, below" / "3 blocks added, below" / "2 blocks added" (mixed). */
export function chipLabel(pending: PendingLanding[]): string | null {
  if (!pending.length) return null;
  const dirs = new Set(pending.map((p) => p.dir));
  const where = dirs.size === 1 ? `, ${pending[0].dir}` : "";
  if (pending.length === 1) return `${TYPE_LABEL[pending[0].type]} added${where}`;
  return `${pending.length} blocks added${where}`;
}
