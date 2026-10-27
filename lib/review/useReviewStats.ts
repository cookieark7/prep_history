"use client";

import { useEffect, useState } from "react";
import { ACCOUNTS } from "@/lib/auth";
import { startSync } from "@/lib/store/sync";

export interface ReviewSummary {
  due: number;
  newAvailable: number;
  totalCards: number;
  learned: number;
  reviewedToday: number;
  streakDays: number;
}

export type ReviewStatus = { state: "off" } | { state: "loading" } | { state: "error" } | { state: "ready"; stats: ReviewSummary };

// One request per page however many places show the count (sidebar, tabs, the home panel).
let pending: Promise<ReviewSummary | null> | null = null;
let fetchedAt = 0;

function load(): Promise<ReviewSummary | null> {
  if (pending && Date.now() - fetchedAt < 30_000) return pending;
  fetchedAt = Date.now();
  pending = startSync()
    .then(() => fetch(`/api/review/stats?tz=${-new Date().getTimezoneOffset()}`))
    .then((r) => (r.ok ? (r.json() as Promise<ReviewSummary>) : null))
    .catch(() => null);
  return pending;
}

/** What is waiting for review today. "off" without accounts: review lives on the server. */
export function useReviewStats(hydrated: boolean): ReviewStatus {
  const [status, setStatus] = useState<ReviewStatus>(ACCOUNTS ? { state: "loading" } : { state: "off" });
  useEffect(() => {
    if (!hydrated || !ACCOUNTS) return;
    let live = true;
    void load().then((stats) => { if (live) setStatus(stats ? { state: "ready", stats } : { state: "error" }); });
    return () => { live = false; };
  }, [hydrated]);
  return status;
}

export const waitingCount = (s: ReviewStatus) => (s.state === "ready" ? s.stats.due + s.stats.newAvailable : 0);
