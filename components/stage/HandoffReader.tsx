"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { readHandoff, takePending } from "@/lib/landing/handoff";
import { useWorkspace } from "@/lib/store/workspace";
import { startSync } from "@/lib/store/sync";
import { sendTurn } from "@/lib/stream-client";

/** One start per question, even when React runs an effect twice (keyed by the URL's token). */
const started = new Set<string>();

/**
 * Starts the lesson for a question asked on the homepage (owner decision, 28 Oct 2026: the
 * question sends itself). Reads it from the URL first, then sessionStorage, clears both and
 * leaves /study's URL clean. Renders nothing. Must sit inside <Suspense> (useSearchParams on a
 * prerendered route).
 */
export function HandoffReader() {
  const params = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const fromUrl = readHandoff(params);
    const stored = takePending(); // always clears the stored copy
    const h = fromUrl ?? stored;
    if (params.get("src") === "landing") router.replace("/study", { scroll: false });
    if (!h) return;
    const key = params.get("t") ?? (fromUrl ? params.toString() : `stored:${Date.now()}`);
    if (started.has(key)) return;
    started.add(key);
    void startLesson(h.q);
  }, [params, router]);

  return null;
}

/** As the app home does it: a fresh lesson with the question, sent at once. */
async function startLesson(question: string) {
  if (!useWorkspace.persist.hasHydrated()) await useWorkspace.persist.rehydrate();
  // The guest session first (a no-op without accounts), so the turn counts against its daily
  // limit and the lesson is saved to it; this also loads any lesson from another device before
  // the new one replaces it on screen.
  await startSync();
  const ws = useWorkspace.getState();
  ws.setChatOpen(true);
  ws.startLesson(question, ws.level);
  void sendTurn({ message: question });
}
