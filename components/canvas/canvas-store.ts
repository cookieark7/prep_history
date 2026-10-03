"use client";

import { create } from "zustand";

export type CanvasTool = "select" | "note" | "path";

/** Transient canvas UI state (not persisted). */
interface CanvasState {
  graphId: string | null;
  selected: string | null;
  tool: CanvasTool;
  pathEnds: string[];
  /** highlighted node ids (trace back / path / ripple) and edge keys */
  lit: { nodes: string[]; edges: string[]; label: string } | null;
  set: (p: Partial<Omit<CanvasState, "set" | "open">>) => void;
  open: (graphId: string, selected?: string | null) => void;
}

export const useCanvas = create<CanvasState>((set) => ({
  graphId: null,
  selected: null,
  tool: "select",
  pathEnds: [],
  lit: null,
  set: (p) => set(p),
  open: (graphId, selected = null) => set({ graphId, selected, lit: null, pathEnds: [], tool: "select" }),
}));
