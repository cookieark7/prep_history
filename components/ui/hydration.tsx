"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useWorkspace } from "@/lib/store/workspace";
import { startSync } from "@/lib/store/sync";
import { syncThemeColor } from "@/lib/theme-colors";

/** Rehydrates the persisted store once on the client; renders children only after. */
export function useHydrated() {
  const hydrated = useSyncExternalStore(
    (cb) => useWorkspace.persist.onFinishHydration(cb),
    () => useWorkspace.persist.hasHydrated(),
    () => false,
  );
  useEffect(() => {
    if (!useWorkspace.persist.hasHydrated()) void useWorkspace.persist.rehydrate();
  }, []);
  return hydrated;
}

/** Keeps <html data-theme> in sync with the store. */
export function ThemeSync() {
  const theme = useWorkspace((s) => s.theme);
  const lineHeight = useWorkspace((s) => s.lineHeight);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    syncThemeColor(theme);
  }, [theme]);
  useEffect(() => {
    document.documentElement.style.setProperty("--reading-lh", String(lineHeight));
  }, [lineHeight]);
  return null;
}

/** Starts lesson sync once the store has loaded (a no-op without accounts). */
export function AccountSync() {
  const hydrated = useHydrated();
  useEffect(() => {
    if (hydrated) void startSync();
  }, [hydrated]);
  return null;
}
