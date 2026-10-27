"use client";

import { useEffect, useRef, useState } from "react";
import { useWorkspace } from "@/lib/store/workspace";
import { BlockBody } from "@/components/blocks/registry";
import { Icon } from "@/components/ui/icons";
import { Composer } from "@/components/chat/Composer";
import { StatusLine } from "@/components/chat/TurnStatus";
import { NotesMargin } from "@/components/notes/NotesMargin";
import { Segmented } from "./TopBar";
import { TYPE_LABEL } from "@/lib/store/reducer";

/**
 * Fullscreen focus for one block (S6): everything else disappears. Reading blocks get the
 * 680px column, a hairline progress bar, a floating pill (Esc, depth, theme, reading aids,
 * notes), margin notes, and the conversation as a command bar at the bottom.
 */
export function FullscreenOverlay({ onNotes }: { onNotes: () => void }) {
  const focusId = useWorkspace((s) => s.focusId);
  const fullscreen = useWorkspace((s) => s.fullscreen);
  const block = useWorkspace((s) => s.blocks.find((b) => b.id === s.focusId));
  const depth = useWorkspace((s) => s.depth);
  const theme = useWorkspace((s) => s.theme);
  const lineHeight = useWorkspace((s) => s.lineHeight);
  const focusPara = useWorkspace((s) => s.focusParagraph);
  const notes = useWorkspace((s) => s.notes.filter((n) => n.blockId === s.focusId).length);
  const lastReply = useWorkspace((s) => [...s.chat].reverse().find((c) => c.role === "director"));
  const lastSay = lastReply?.text;
  const scroller = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!fullscreen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    scroller.current?.focus();
    return () => { document.body.style.overflow = prev; };
  }, [fullscreen, focusId]);

  if (!fullscreen || !block) return null;
  const reading = block.type === "article" || block.type === "callout" || block.type === "predict_gate" || block.type === "quiz";
  const nextTheme = theme === "light" ? "dark" : "light";

  const onScroll = (el: HTMLDivElement) => {
    const max = el.scrollHeight - el.clientHeight;
    setProgress(max > 0 ? el.scrollTop / max : 0);
    if (!focusPara) return;
    // the paragraph crossing the middle of the screen is the one being read
    const mid = el.clientHeight * 0.45;
    for (const p of el.querySelectorAll<HTMLElement>(".reading p")) {
      const r = p.getBoundingClientRect();
      p.classList.toggle("is-active", r.top <= mid && r.bottom >= mid);
    }
  };

  return (
    <div role="dialog" aria-modal="true" aria-label={`Fullscreen: ${block.title}`} className="fixed inset-0 z-40 bg-bg" data-fullscreen-root>
      <div className="absolute inset-x-0 top-0 z-10 h-px">
        <div className="h-px bg-accent" style={{ width: `${progress * 100}%` }} />
      </div>

      {/* floating pill */}
      <div className="fixed left-1/2 top-4 z-10 flex max-w-[calc(100vw-24px)] -translate-x-1/2 items-center gap-1 overflow-x-auto rounded-full border border-rule bg-surface px-1.5 py-1 shadow-[var(--shadow-float)]">
        <button type="button" onClick={() => useWorkspace.getState().exitFocus()} className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[12.5px] hover:bg-hover">
          <kbd className="font-mono text-[11px] text-muted">Esc</kbd> Exit
        </button>
        {block.type === "article" && (
          <Segmented label="Depth" size="sm" value={depth}
            options={[{ id: "brief", label: "Brief" }, { id: "standard", label: "Standard" }, { id: "deep", label: "Deep" }]}
            onChange={(d) => useWorkspace.getState().setDepth(d)} />
        )}
        <button type="button" onClick={() => useWorkspace.getState().setTheme(nextTheme)} className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[12.5px] capitalize hover:bg-hover" aria-label={`Theme: ${theme}. Switch to ${nextTheme}`}>
          <Icon.theme size={13} /> {theme}
        </button>
        {reading && (
          <>
            <label className="hidden h-8 shrink-0 items-center gap-2 px-2 text-[12px] text-muted sm:inline-flex" title="Line height">
              <span aria-hidden className="font-heading text-[15px] leading-none">≡</span>
              <span className="sr-only">Line height</span>
              <input type="range" min={1.4} max={2.2} step={0.05} value={lineHeight}
                onChange={(e) => useWorkspace.getState().setReading({ lineHeight: Number(e.target.value) })}
                className="w-20 accent-[var(--accent)]" />
            </label>
            <button type="button" aria-pressed={focusPara} onClick={() => useWorkspace.getState().setReading({ focusParagraph: !focusPara })}
              className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[12.5px] ${focusPara ? "bg-accent-soft text-accent" : "hover:bg-hover"}`}>
              <Icon.eye size={13} /> Focus paragraph
            </button>
          </>
        )}
        <button type="button" onClick={onNotes} className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[12.5px] hover:bg-hover" aria-label={`${notes} notes. Open notes`}>
          <Icon.note size={13} /> {notes}
        </button>
      </div>

      <div ref={scroller} tabIndex={-1} className="scroll-thin h-full overflow-y-auto outline-none" onScroll={(e) => onScroll(e.currentTarget)}>
        <div className={`relative mx-auto px-5 pb-56 pt-24 ${reading ? "max-w-[680px]" : "max-w-[1400px]"} ${focusPara ? "focus-para" : ""}`}>
          <p className="mb-2 text-[12px] uppercase tracking-wide text-muted">{TYPE_LABEL[block.type]}</p>
          <h1 className="mb-8 font-heading text-[32px] font-semibold leading-[1.15] md:text-[40px]">{block.title}</h1>
          <div data-fullscreen-block={block.id}>
            <BlockBody block={block} expanded />
          </div>
          {reading && (
            <div className="absolute left-full top-24 ml-10 hidden h-[calc(100%-6rem)] w-[260px] 2xl:block">
              <NotesMargin root="[data-fullscreen-root]" />
            </div>
          )}
        </div>
      </div>

      {/* the conversation collapses to a centred command bar */}
      <div className="fixed bottom-4 left-1/2 z-10 w-[min(600px,calc(100vw-24px))] -translate-x-1/2">
        {(lastSay || lastReply?.status === "streaming") && (
          <div className="mb-2 rounded-md border border-rule bg-surface px-4 py-2 shadow-[var(--shadow-float)]">
            {lastSay && <p className="line-clamp-2 text-[14.5px]">{lastSay}</p>}
            <StatusLine entry={lastReply} className="mt-1" />
          </div>
        )}
        <div className="shadow-[var(--shadow-float)]"><Composer id="composer-fs" /></div>
      </div>
    </div>
  );
}
