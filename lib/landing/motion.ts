"use client";

import { useSyncExternalStore } from "react";

// Reduced motion for the landing: the OS setting, or `?motion=reduced` to preview that path
// without changing OS settings. With it, the opening's window waits on its first frame until the
// reader presses play.

const QUERY = "(prefers-reduced-motion: reduce)";

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return matchMedia(QUERY).matches || new URLSearchParams(location.search).get("motion") === "reduced";
}

function subscribe(onChange: () => void): () => void {
  const mq = matchMedia(QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, prefersReducedMotion, () => false);
}
