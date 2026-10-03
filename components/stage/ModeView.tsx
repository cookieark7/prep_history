"use client";

import { useMemo } from "react";
import type { Mode, TimelineBlock as TimelineT } from "@/lib/contracts";
import { useWorkspace } from "@/lib/store/workspace";
import { CanvasView } from "@/components/canvas/CanvasView";
import { TimelineChart } from "@/components/blocks/TimelineBlock";

/** Canvas and timeline views. Focus mode is an overlay above the reader (see Workspace). */
export function ModeView({ mode }: { mode: Exclude<Mode, "reader" | "focus"> }) {
  if (mode === "canvas") return <CanvasView />;
  return <TimelineView />;
}

function TimelineView() {
  const blocks = useWorkspace((s) => s.blocks);
  const timelines = useMemo(() => blocks.filter((b): b is TimelineT => b.type === "timeline"), [blocks]);
  if (!timelines.length) {
    return (
      <div className="grid h-[calc(100vh-57px)] place-items-center px-6 text-center">
        <div>
          <p className="font-serif text-[20px]">No timeline on the Stage yet.</p>
          <p className="mt-1 text-[13.5px] text-muted">Ask about a sequence of events, or “what happened at the same time?”</p>
        </div>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-[1400px] space-y-14 px-4 pb-40 pt-8 md:px-8">
      {timelines.map((t) => (
        <section key={t.id} id={`block-${t.id}`} data-block={t.id}>
          <h2 className="mb-1 font-serif text-[24px] font-semibold">{t.title}</h2>
          <p className="mb-4 text-[12.5px] italic text-muted">{t.because}</p>
          <TimelineChart block={t} full />
        </section>
      ))}
    </div>
  );
}
