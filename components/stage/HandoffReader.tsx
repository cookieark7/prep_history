"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { readHandoff, takePending } from "@/lib/landing/handoff";
import { usePrefill } from "@/lib/landing/prefill";
import { useWorkspace } from "@/lib/store/workspace";

/**
 * Picks up a question handed over from the landing page (prompt section 7): from the URL first,
 * then sessionStorage; clears both and leaves /study's URL clean. Renders nothing.
 * Must sit inside <Suspense> (useSearchParams on a prerendered route).
 */
export function HandoffReader() {
  const params = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const fromUrl = readHandoff(params);
    const stored = takePending(); // always clears the stored copy
    const h = fromUrl ?? stored;
    if (h) {
      usePrefill.getState().set(h);
      useWorkspace.getState().setChatOpen(true); // the composer has to be on screen to prefill
    }
    if (params.get("src") === "landing") router.replace("/study", { scroll: false });
  }, [params, router]);

  return null;
}
