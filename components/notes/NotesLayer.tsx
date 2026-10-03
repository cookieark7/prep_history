"use client";

import { useEffect, useState } from "react";
import type { NoteKind } from "@/lib/contracts";
import { useWorkspace } from "@/lib/store/workspace";
import { findTextRange } from "@/lib/notes";
import { NOTE_KINDS, NoteForm } from "./NoteForm";

/** Underline every note's quote in place (CSS Custom Highlight API). */
export function useNoteHighlights() {
  const notes = useWorkspace((s) => s.notes);
  const blocks = useWorkspace((s) => s.blocks);
  const depth = useWorkspace((s) => s.depth);
  const fullscreen = useWorkspace((s) => s.fullscreen);
  const mode = useWorkspace((s) => s.mode);

  useEffect(() => {
    if (typeof CSS === "undefined" || !("highlights" in CSS) || typeof Highlight === "undefined") return;
    // setTimeout (not rAF) so highlights also apply while the tab is in the background
    const t = setTimeout(() => {
      const byKind: Record<NoteKind, Range[]> = { remember: [], question: [], disagree: [] };
      for (const n of notes) {
        for (const art of document.querySelectorAll(`[data-article="${n.blockId}"]`)) {
          const scope = (n.section && art.querySelector(`[data-section="${CSS.escape(n.section)}"]`)) || art;
          const r = findTextRange(scope, n.quote) ?? (scope !== art ? findTextRange(art, n.quote) : null);
          if (r) byKind[n.kind].push(r);
        }
      }
      for (const k of Object.keys(byKind) as NoteKind[]) CSS.highlights.set(`note-${k}`, new Highlight(...byKind[k]));
    }, 0);
    return () => clearTimeout(t);
  }, [notes, blocks, depth, fullscreen, mode]);
}

interface Sel { blockId: string; section: string | null; quote: string; x: number; y: number }

/** A tiny toolbar over selected article text: Remember / Question / Disagree. */
export function SelectionToolbar() {
  const [sel, setSel] = useState<Sel | null>(null);
  const [form, setForm] = useState<(Sel & { kind: NoteKind }) | null>(null);

  useEffect(() => {
    const read = () => {
      const s = window.getSelection();
      if (!s || s.isCollapsed || !s.rangeCount) return setSel(null);
      const range = s.getRangeAt(0);
      const host = (range.commonAncestorContainer instanceof Element ? range.commonAncestorContainer : range.commonAncestorContainer.parentElement)?.closest<HTMLElement>("[data-article]");
      const quote = s.toString().trim();
      if (!host || quote.length < 3) return setSel(null);
      const startEl = range.startContainer instanceof Element ? range.startContainer : range.startContainer.parentElement;
      const section = startEl?.closest<HTMLElement>("[data-section]")?.dataset.section ?? null;
      const rect = range.getBoundingClientRect();
      setSel({ blockId: host.dataset.article!, section, quote: quote.slice(0, 600), x: rect.left + rect.width / 2, y: rect.top });
    };
    const onUp = () => setTimeout(read, 0);
    const onScroll = () => setSel(null);
    document.addEventListener("mouseup", onUp);
    document.addEventListener("keyup", onUp);
    document.addEventListener("touchend", onUp);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mouseup", onUp);
      document.removeEventListener("keyup", onUp);
      document.removeEventListener("touchend", onUp);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, []);

  if (form) {
    return (
      <div className="fixed z-50" style={{ left: Math.max(16, Math.min(form.x - 144, window.innerWidth - 304)), top: Math.max(16, Math.min(form.y + 12, window.innerHeight - 260)) }}>
        <NoteForm blockId={form.blockId} quote={form.quote} section={form.section} initialKind={form.kind} onDone={() => { setForm(null); window.getSelection()?.removeAllRanges(); }} />
      </div>
    );
  }
  if (!sel) return null;
  return (
    <div
      role="toolbar"
      aria-label="Add a note"
      className="fade-up fixed z-50 flex -translate-x-1/2 -translate-y-full items-center gap-0.5 rounded-md border border-rule bg-surface p-1 shadow-[var(--shadow-float)]"
      style={{ left: sel.x, top: sel.y - 8 }}
      onMouseDown={(e) => e.preventDefault()}
    >
      {NOTE_KINDS.map((k) => (
        <button
          key={k.id}
          type="button"
          onClick={() => { setForm({ ...sel, kind: k.id }); setSel(null); }}
          className="h-8 rounded-[5px] px-2.5 text-[12.5px] hover:bg-hover"
        >
          <span className={k.cls}>{k.label}</span>
        </button>
      ))}
    </div>
  );
}
