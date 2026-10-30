"use client";

import { useEffect, useState } from "react";
import { ACCOUNTS } from "@/lib/auth";
import { startSync } from "@/lib/store/sync";
import { useWorkspace } from "@/lib/store/workspace";

export interface Quota { used: number; perDay: number; left: number; guest: boolean }

/**
 * Questions left in today's free limit, refreshed after each turn finishes. Null until known,
 * and always null without accounts (no limits are kept then).
 */
export function useQuota(hydrated: boolean): Quota | null {
  const [quota, setQuota] = useState<Quota | null>(null);
  const streaming = useWorkspace((s) => s.streaming);
  useEffect(() => {
    if (!hydrated || !ACCOUNTS || streaming) return;
    let live = true;
    void startSync()
      .then(() => fetch("/api/turn/quota"))
      .then((r) => (r.ok ? (r.json() as Promise<Quota>) : null))
      .then((q) => { if (live && q) setQuota(q); })
      .catch(() => {});
    return () => { live = false; };
  }, [hydrated, streaming]);
  return quota;
}

/** "18 of 20 questions left today", with a note when it runs low. */
export function quotaText(q: Quota): string {
  const base = `${q.left} of ${q.perDay} questions left today`;
  if (q.left === 0) return q.guest ? "No questions left today. Your reviews still work; sign in for a higher limit." : "No questions left today. Your reviews still work.";
  if (q.left <= 3 && q.guest) return `${base}. Sign in for a higher limit.`;
  return base;
}
