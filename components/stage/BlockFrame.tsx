"use client";

import { memo } from "react";
import * as Popover from "@radix-ui/react-popover";
import type { Block } from "@/lib/contracts";
import { Icon } from "@/components/ui/icons";
import { BlockBody } from "@/components/blocks/registry";
import { confidenceSummary } from "@/lib/confidence";
import { useWorkspace } from "@/lib/store/workspace";
import { TYPE_LABEL } from "@/lib/store/reducer";

export const BlockFrame = memo(function BlockFrame({ block, blurred }: { block: Block; blurred?: boolean }) {
  const fresh = useWorkspace((s) => !!s.arrivals[block.id]);
  const patchedEntry = useWorkspace((s) => s.patched[block.id]);
  const pinned = useWorkspace((s) => s.pinned.includes(block.id));
  const flash = useWorkspace((s) => (s.flash?.id === block.id ? s.flash.nonce : null));

  const TypeIcon = Icon[block.type];
  const summary = confidenceSummary(block);
  const approximate = block.type === "lineage";

  return (
    <article
      id={`block-${block.id}`}
      tabIndex={-1}
      data-block={block.id}
      aria-label={`${TYPE_LABEL[block.type]}: ${block.title}`}
      className={`group/block relative scroll-mt-20 rounded-[2px] outline-none ${fresh ? "arrive" : ""}`}
    >
      {patchedEntry && <span aria-hidden className="absolute -left-4 top-1 bottom-1 w-[3px] rounded-full bg-ochre" />}
      <header className="mb-3 flex items-start gap-3">
        <span className="mt-[3px] text-muted"><TypeIcon size={16} /></span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <h2 className={`font-serif text-[22px] font-semibold leading-[1.25] tracking-[-0.005em] ${flash ? "flash" : ""}`} key={flash ?? 0}>
              {block.title}
            </h2>
            {pinned && <span className="text-[11px] text-muted" title="Pinned"><Icon.pin size={12} /></span>}
            {approximate && (
              <span className="rounded-[3px] border border-rule px-1.5 py-px text-[11px] text-muted">Approximate</span>
            )}
            {patchedEntry && (
              <span className="inline-flex items-center gap-1 rounded-[3px] bg-accent-soft px-1.5 py-px text-[11px] text-accent">
                updated
                <button
                  type="button"
                  className="underline-offset-2 hover:underline"
                  onClick={() => useWorkspace.getState().undo(patchedEntry)}
                >
                  Undo
                </button>
              </span>
            )}
          </div>
          <p className="mt-1 text-[12.5px] leading-snug text-muted">
            <span className="italic">{block.because}</span>
            {summary && <span className="mono-tab ml-2 whitespace-nowrap text-[11px]">· {summary}</span>}
          </p>
        </div>
        <BlockMenu block={block} pinned={pinned} />
      </header>
      <div
        className={blurred ? "pointer-events-none select-none blur-[6px] transition-[filter] duration-200" : "transition-[filter] duration-200"}
        aria-hidden={blurred || undefined}
        // `inert` keeps keyboard focus out of a blurred block
        {...(blurred ? { inert: true } : {})}
      >
        <BlockBody block={block} />
      </div>
    </article>
  );
});

function BlockMenu({ block, pinned }: { block: Block; pinned: boolean }) {
  const canUndo = useWorkspace((s) => s.history.some((h) => h.blockId === block.id && !h.undone && h.inverse));
  const item = "flex h-9 w-full items-center gap-2 rounded px-2 text-left text-[13px] hover:bg-hover disabled:opacity-40";
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label="Block menu"
          className="-mr-1 grid h-8 w-8 shrink-0 place-items-center rounded-md text-muted opacity-60 hover:bg-hover hover:text-text group-hover/block:opacity-100 focus-visible:opacity-100"
        >
          <Icon.more />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="end" sideOffset={4} className="fade-up z-50 w-44 rounded-md border border-rule bg-surface p-1 text-text shadow-[var(--shadow-float)]">
          <Popover.Close asChild>
            <button type="button" className={item} onClick={() => useWorkspace.getState().focusBlock(block.id, true)}>
              <Icon.expand size={14} /> Fullscreen <kbd className="ml-auto font-mono text-[11px] text-muted">f</kbd>
            </button>
          </Popover.Close>
          <Popover.Close asChild>
            <button type="button" className={item} onClick={() => useWorkspace.getState().togglePin(block.id)}>
              <Icon.pin size={14} /> {pinned ? "Unpin" : "Pin to top"}
            </button>
          </Popover.Close>
          <Popover.Close asChild>
            <button type="button" className={item} disabled={!canUndo} onClick={() => useWorkspace.getState().undoLatestFor(block.id)}>
              <Icon.undo size={14} /> Undo last change
            </button>
          </Popover.Close>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
