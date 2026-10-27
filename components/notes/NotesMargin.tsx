"use client";

import { useEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import type { NoteKind } from "@/lib/contracts";
import { useWorkspace, type Note } from "@/lib/store/workspace";
import { sendTurn } from "@/lib/stream-client";
import { cleanQuote } from "@/lib/notes";
import { exportMarkdown } from "@/lib/export";
import { Icon } from "@/components/ui/icons";
import { scrollToBlock } from "@/components/blocks/Markdown";
import { NOTE_KINDS } from "./NoteForm";

function askAbout(n: Note) {
  void sendTurn({ event: { event: "ask_why", block_id: n.blockId, selection: cleanQuote(n.quote) }, echo: `Ask about: “${cleanQuote(n.quote).slice(0, 80)}”` });
}

export function NoteCard({ note, compact = false }: { note: Note; compact?: boolean }) {
  const k = NOTE_KINDS.find((x) => x.id === note.kind)!;
  return (
    <div className="rounded-[2px] border-l-2 bg-surface py-2 pl-3 pr-2 text-[13px] leading-snug" style={{ borderColor: k.color }}>
      <p className="mb-1 flex items-center justify-between text-[11px] uppercase tracking-wide text-muted">
        <span className={k.cls}>{k.label}</span>
        <button type="button" onClick={() => useWorkspace.getState().removeNote(note.id)} className="grid h-6 w-6 place-items-center rounded text-muted hover:bg-hover hover:text-text" aria-label="Delete note">
          <Icon.close size={11} />
        </button>
      </p>
      <p className={`text-[14px] italic text-muted ${compact ? "line-clamp-2" : "line-clamp-3"}`}>“{cleanQuote(note.quote)}”</p>
      {note.text && <p className="mt-1 text-text">{note.text}</p>}
      <button type="button" onClick={() => askAbout(note)} className="mt-1.5 text-[12px] text-accent hover:underline">Ask Chronicle about this</button>
    </div>
  );
}

/** Notes in the right margin, each aligned to the paragraph it annotates. */
export function NotesMargin({ root }: { root?: string }) {
  const notes = useWorkspace((s) => s.notes);
  const blocks = useWorkspace((s) => s.blocks);
  const depth = useWorkspace((s) => s.depth);
  const box = useRef<HTMLDivElement>(null);
  const cards = useRef<Record<string, HTMLDivElement | null>>({});
  const [tops, setTops] = useState<Record<string, number>>({});
  const focusId = useWorkspace((s) => s.focusId);
  const visible = notes.filter((n) => blocks.some((b) => b.id === n.blockId) && (!root || n.blockId === focusId));

  useEffect(() => {
    const layout = () => {
      const container = box.current;
      if (!container) return;
      const base = container.getBoundingClientRect().top;
      const anchors = visible.map((n) => {
        const art = root
          ? document.querySelector(`${root} [data-article="${n.blockId}"]`)
          : document.querySelector(`#block-${n.blockId} [data-article="${n.blockId}"]`) ?? document.getElementById(`block-${n.blockId}`);
        const sec = n.section ? art?.querySelector(`[data-section="${CSS.escape(n.section)}"]`) : null;
        const el = (sec ?? art) as HTMLElement | null;
        return { id: n.id, top: el ? el.getBoundingClientRect().top - base : 0 };
      }).sort((a, b) => a.top - b.top);
      const next: Record<string, number> = {};
      let floor = 0;
      for (const a of anchors) {
        const t = Math.max(a.top, floor);
        next[a.id] = t;
        floor = t + (cards.current[a.id]?.offsetHeight ?? 110) + 10;
      }
      setTops(next);
    };
    const t = setTimeout(layout, 0);
    const ro = new ResizeObserver(() => setTimeout(layout, 0));
    if (box.current?.parentElement?.parentElement) ro.observe(box.current.parentElement.parentElement);
    return () => { clearTimeout(t); ro.disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes, blocks, depth, root, focusId]);

  return (
    <div ref={box} className="absolute inset-0" aria-label="Margin notes">
      {visible.map((n) => (
        <div
          key={n.id}
          ref={(el) => { cards.current[n.id] = el; }}
          className="absolute left-0 right-0 transition-[top] duration-200"
          style={{ top: tops[n.id] ?? 0, opacity: n.id in tops ? 1 : 0 }}
        >
          <NoteCard note={n} compact />
        </div>
      ))}
    </div>
  );
}

/** Inline, expandable note rows under a section (used where there is no margin). */
export function InlineNotes({ blockId, section }: { blockId: string; section: string }) {
  const notes = useWorkspace((s) => s.notes);
  const mine = notes.filter((n) => n.blockId === blockId && n.section === section);
  const [open, setOpen] = useState(false);
  if (!mine.length) return null;
  return (
    <div className="mt-3 font-sans xl:hidden">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="inline-flex h-8 items-center gap-1.5 text-[12.5px] text-muted hover:text-text">
        <Icon.note size={13} /> {mine.length} note{mine.length > 1 ? "s" : ""} {open ? <Icon.chevronUp size={12} /> : <Icon.chevronDown size={12} />}
      </button>
      {open && <div className="mt-1 space-y-2">{mine.map((n) => <NoteCard key={n.id} note={n} />)}</div>}
    </div>
  );
}

/** Slide-over with every note, filters, and export. */
export function NotesPanel({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const notes = useWorkspace((s) => s.notes);
  const blocks = useWorkspace((s) => s.blocks);
  const flashBlock = useWorkspace((s) => s.flashBlock);
  const [filter, setFilter] = useState<NoteKind | "all">("all");
  const list = notes.filter((n) => filter === "all" || n.kind === filter);
  const title = (id: string) => blocks.find((b) => b.id === id)?.title ?? "Removed block";

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-[color-mix(in_srgb,var(--text)_18%,transparent)]" />
        <Dialog.Content className="fade-up fixed inset-y-0 right-0 z-50 flex w-full max-w-[420px] flex-col border-l border-rule bg-bg shadow-[var(--shadow-float)] outline-none">
          <div className="flex h-14 items-center justify-between border-b border-rule px-5">
            <Dialog.Title className="font-heading text-[18px] font-semibold">Notes</Dialog.Title>
            <Dialog.Close className="grid h-9 w-9 place-items-center rounded-md text-muted hover:bg-hover" aria-label="Close"><Icon.close /></Dialog.Close>
          </div>
          <Dialog.Description className="sr-only">All notes in this lesson</Dialog.Description>
          <div className="flex flex-wrap items-center gap-1.5 border-b border-rule px-5 py-3" role="radiogroup" aria-label="Filter notes">
            {(["all", ...NOTE_KINDS.map((k) => k.id)] as const).map((f) => (
              <button key={f} type="button" role="radio" aria-checked={filter === f} onClick={() => setFilter(f)}
                className={`h-8 rounded-md px-2.5 text-[12.5px] capitalize ${filter === f ? "bg-text text-bg" : "text-muted hover:bg-hover"}`}>
                {f} {f === "all" ? notes.length : notes.filter((n) => n.kind === f).length}
              </button>
            ))}
            <button type="button" onClick={() => exportMarkdown(useWorkspace.getState())} className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-md border border-rule px-2.5 text-[12.5px] hover:bg-hover">
              <Icon.download size={13} /> Export as Markdown
            </button>
          </div>
          <div className="scroll-thin flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-4">
            {!list.length && <p className="text-[13.5px] text-muted">Select text in an article to add a note: Remember, Question, or Disagree.</p>}
            {list.map((n) => (
              <div key={n.id}>
                <button type="button" onClick={() => { onOpenChange(false); setTimeout(() => scrollToBlock(n.blockId, null, flashBlock), 60); }} className="mb-1 text-left text-[12px] text-muted hover:text-accent">
                  {title(n.blockId)}{n.section ? ` · ${n.section}` : ""}
                </button>
                <NoteCard note={n} />
              </div>
            ))}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
