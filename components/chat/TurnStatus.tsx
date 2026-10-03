"use client";

import { useEffect, useState } from "react";
import { useWorkspace, type ChatEntry } from "@/lib/store/workspace";
import { ROTATE_MS, statusText, type LastOp } from "@/lib/status";
import { lastLanded } from "@/lib/rail";

/** What the last op of this turn did, for op-driven status text. */
export function useLastOp(entry: ChatEntry | undefined): LastOp | null {
  const step = useWorkspace((s) => (entry ? lastLanded(s.history, entry.id) : null));
  const type = useWorkspace((s) => s.blocks.find((b) => b.id === step?.blockId)?.type);
  if (!step || !type) return null;
  return { type, kind: step.op === "patch" ? "updated" : "added" };
}

/** Rotating verbs until the first op lands, then op-driven text. Cleared when the turn ends. */
export function useTurnStatus(entry: ChatEntry | undefined): string | null {
  const streaming = entry?.status === "streaming";
  const last = useLastOp(entry);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!streaming || last) return;
    const t = setInterval(() => setTick((n) => n + 1), ROTATE_MS);
    return () => clearInterval(t);
  }, [streaming, last]);
  return statusText(streaming, last, tick);
}

/**
 * The status line itself. aria-hidden: rotations are never announced; the Announcer
 * speaks op-driven changes (history labels) politely instead.
 */
export function StatusLine({ entry, className = "" }: { entry: ChatEntry | undefined; className?: string }) {
  const text = useTurnStatus(entry);
  if (!text) return null;
  return (
    <div className={className}>
      <p key={text} aria-hidden className="fade-up text-[12.5px] italic text-muted">{text}</p>
      <div className="progress-rule mt-1.5" aria-hidden />
    </div>
  );
}
