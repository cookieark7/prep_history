import { create } from "zustand";
import type { Handoff } from "./handoff";

/** The landing's login card: open or not, and the question waiting behind it (prompt section 5). */
interface LoginCardState {
  open: boolean;
  pending: Handoff | null;
  /** Whatever had focus when the card opened; focus goes back there when it closes. */
  opener: HTMLElement | null;
  openLogin: (pending?: Handoff | null) => void;
  close: () => void;
}

export const useLoginCard = create<LoginCardState>((set) => ({
  open: false,
  pending: null,
  opener: null,
  openLogin: (pending = null) =>
    set({
      open: true,
      pending,
      opener: typeof document !== "undefined" && document.activeElement instanceof HTMLElement ? document.activeElement : null,
    }),
  close: () => set({ open: false }),
}));
