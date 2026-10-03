/** Chat dock width limits (E6). */
export const DOCK_MIN = 280;
export const DOCK_MAX = 520;
export const DOCK_DEFAULT = 340;
export const DOCK_STEP = 16;

export function clampDock(w: number): number {
  if (!Number.isFinite(w)) return DOCK_DEFAULT;
  return Math.round(Math.min(DOCK_MAX, Math.max(DOCK_MIN, w)));
}

/** Keyboard resizing for the separator: arrows ±16 (Shift ±48), Home/End to the limits. */
export function dockKeyStep(key: string, shift: boolean, current: number): number | null {
  const step = shift ? DOCK_STEP * 3 : DOCK_STEP;
  if (key === "ArrowRight") return clampDock(current + step);
  if (key === "ArrowLeft") return clampDock(current - step);
  if (key === "Home") return DOCK_MIN;
  if (key === "End") return DOCK_MAX;
  return null;
}
