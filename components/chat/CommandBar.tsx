"use client";

import { useWorkspace } from "@/lib/store/workspace";
import { Composer } from "./Composer";

/** In canvas and timeline modes the chat dock collapses to a bottom command bar. */
export function CommandBar() {
  const last = useWorkspace((s) => [...s.chat].reverse().find((c) => c.role === "director"));
  const streaming = useWorkspace((s) => s.streaming);
  return (
    <div className="fixed bottom-4 left-1/2 z-30 hidden w-[min(600px,calc(100vw-32px))] -translate-x-1/2 md:block">
      {(last?.text || streaming) && (
        <div className="mb-2 rounded-md border border-rule bg-surface px-4 py-2.5 shadow-[var(--shadow-float)]">
          {last?.text && <p className="line-clamp-2 font-serif text-[15px] leading-snug">{last.text}</p>}
          {streaming && <div className="progress-rule mt-2" />}
        </div>
      )}
      <div className="shadow-[var(--shadow-float)]">
        <Composer id="composer-bar" />
      </div>
    </div>
  );
}
