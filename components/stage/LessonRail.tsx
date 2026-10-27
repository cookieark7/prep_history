"use client";

import { useEffect, useMemo, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useWorkspace } from "@/lib/store/workspace";
import { DWELL_MS, PASSIVE, railItems, type RailItem } from "@/lib/rail";
import { TYPE_LABEL } from "@/lib/store/reducer";
import { Icon } from "@/components/ui/icons";
import { scrollToBlock } from "@/components/blocks/Markdown";

/** Rail items for the current Stage (one per block, Stage order, with completion). */
export function useRailItems(): RailItem[] {
  const blocks = useWorkspace((s) => s.blocks);
  const pinned = useWorkspace((s) => s.pinned);
  const completed = useWorkspace((s) => s.completed);
  const gates = useWorkspace((s) => s.gates);
  const quizRuns = useWorkspace((s) => s.quizRuns);
  return useMemo(() => railItems(blocks, pinned, { completed, gates, quizRuns }), [blocks, pinned, completed, gates, quizRuns]);
}

/** Passive blocks count as read after DWELL_MS with ≥40% in view. */
export function useDwellCompletion(items: RailItem[]) {
  const key = items.filter((i) => !i.complete && PASSIVE.includes(i.type)).map((i) => i.id).join(",");
  useEffect(() => {
    if (!key) return;
    const timers = new Map<string, ReturnType<typeof setTimeout>>();
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        const id = (e.target as HTMLElement).dataset.block!;
        if (e.isIntersecting && !timers.has(id)) {
          timers.set(id, setTimeout(() => useWorkspace.getState().markComplete(id), DWELL_MS));
        } else if (!e.isIntersecting && timers.has(id)) {
          clearTimeout(timers.get(id));
          timers.delete(id);
        }
      }
    }, { threshold: 0.4 });
    for (const id of key.split(",")) {
      const el = document.getElementById(`block-${id}`);
      if (el) io.observe(el);
    }
    return () => { io.disconnect(); timers.forEach(clearTimeout); };
  }, [key]);
}

/** Mobile: a compact progress bar (one segment per block). */
export function LessonProgress({ className = "" }: { className?: string }) {
  const items = useRailItems();
  if (!items.length) return null;
  const done = items.filter((i) => i.complete).length;
  return (
    <div className={`flex gap-[2px] px-4 pb-1.5 ${className}`} role="img" aria-label={`${done} of ${items.length} blocks done`}>
      {items.map((it) => (
        <span key={it.id} className={`h-[3px] flex-1 rounded-full ${it.complete ? "bg-text" : "bg-rule"}`} />
      ))}
    </div>
  );
}

/** Mobile: "Jump to" bottom sheet listing the blocks. */
export function JumpToSheet() {
  const items = useRailItems();
  const flashBlock = useWorkspace((s) => s.flashBlock);
  const [open, setOpen] = useState(false);
  if (!items.length) return null;
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button type="button" className="grid h-11 w-11 place-items-center rounded-md text-muted hover:bg-hover hover:text-text md:hidden" aria-label="Jump to a block">
          <Icon.lineage size={16} />
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-[color-mix(in_srgb,var(--text)_18%,transparent)]" />
        <Dialog.Content className="fade-up fixed inset-x-0 bottom-0 z-50 max-h-[70vh] overflow-y-auto rounded-t-[10px] border-t border-rule bg-bg pb-[env(safe-area-inset-bottom)] outline-none">
          <div className="flex items-center justify-between px-4 py-3">
            <Dialog.Title className="font-heading text-[17px] font-semibold">Jump to</Dialog.Title>
            <Dialog.Close className="grid h-11 w-11 place-items-center rounded-md text-muted hover:bg-hover" aria-label="Close"><Icon.close /></Dialog.Close>
          </div>
          <Dialog.Description className="sr-only">Blocks in this lesson</Dialog.Description>
          <ol className="pb-3">
            {items.map((it) => {
              const I = Icon[it.type];
              return (
                <li key={it.id}>
                  <button
                    type="button"
                    onClick={() => { setOpen(false); setTimeout(() => scrollToBlock(it.id, null, flashBlock), 60); }}
                    className="flex min-h-11 w-full items-center gap-3 px-4 py-2 text-left text-[14px] hover:bg-hover"
                  >
                    <I size={14} className="shrink-0 text-muted" />
                    <span className="flex-1"><span className="text-muted">{TYPE_LABEL[it.type]}:</span> {it.title}</span>
                    {it.complete && <Icon.check size={14} className="text-ok" aria-label="done" />}
                  </button>
                </li>
              );
            })}
          </ol>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
