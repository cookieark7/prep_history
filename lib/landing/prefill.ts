import { create } from "zustand";
import type { Handoff } from "./handoff";

/**
 * A question handed over from the landing page, waiting in /study's composer (prompt section 7).
 * `nonce` changes with every new handoff so composers remount with it as their starting text.
 * It is never sent automatically: the first send while it waits starts a fresh lesson.
 */
interface PrefillState {
  handoff: Handoff | null;
  nonce: number;
  set: (h: Handoff) => void;
  clear: () => void;
}

export const usePrefill = create<PrefillState>((set) => ({
  handoff: null,
  nonce: 0,
  set: (h) => set((s) => ({ handoff: h, nonce: s.nonce + 1 })),
  clear: () => set({ handoff: null }),
}));
