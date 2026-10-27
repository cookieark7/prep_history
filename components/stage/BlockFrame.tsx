"use client";

import { memo, useState } from "react";
import { copyBlock } from "@/lib/copy-actions";
import * as Popover from "@radix-ui/react-popover";
import type { Block } from "@/lib/contracts";
import { Icon } from "@/components/ui/icons";
import { BlockBody } from "@/components/blocks/registry";
import { confidenceSummary } from "@/lib/confidence";
import { useWorkspace } from "@/lib/store/workspace";
import { TYPE_LABEL } from "@/lib/store/reducer";

export const BlockFrame = memo(function BlockFrame({ block, blurred, current = false }: { block: Block; blurred?: boolean; current?: boolean }) {
  const arrivedAt = useWorkspace((s) => s.arrivals[block.id]);
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
      className="group/block relative scroll-mt-20 rounded-[2px] outline-none"
    >
      {/* a soft edge on arrival; keyed so each streamed section re-runs it */}
      {arrivedAt && <span key={arrivedAt} aria-hidden className="arrive pointer-events-none absolute -inset-x-3 -inset-y-2 rounded-[2px]" />}
      {patchedEntry && <span aria-hidden className="absolute -left-4 top-1 bottom-1 w-[3px] rounded-full bg-ochre" />}
      <header className="mb-3 flex items-start gap-3">
        <span className="mt-[3px] text-muted"><TypeIcon size={16} /></span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <h2 className={`font-heading text-[22px] font-semibold leading-[1.25] tracking-[-0.005em] ${flash ? "flash" : ""}`} key={flash ?? 0}>
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
          {summary && <p className="mt-1 text-[13px] leading-snug text-muted tnum">{summary}</p>}
        </div>
        <BlockMenu block={block} pinned={pinned} current={current} />
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

/**
 * Block actions, always in this order: Copy (c), Fullscreen (f), Pin (p), Undo (u).
 * Desktop: the button shows on hover and focus. Mobile / touch: only on the block in view.
 */
function BlockMenu({ block, pinned, current }: { block: Block; pinned: boolean; current: boolean }) {
  const canUndo = useWorkspace((s) => s.history.some((h) => h.blockId === block.id && h.status !== "undone" && h.inverse));
  const item = "flex h-9 w-full items-center gap-2 rounded px-2 text-left text-[13px] hover:bg-hover disabled:opacity-40";
  const [copied, setCopied] = useState(false);
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label="Block menu"
          className={`-mr-1 grid h-8 w-8 shrink-0 place-items-center rounded-md text-muted opacity-0 hover:bg-hover hover:text-text focus-visible:opacity-100 group-hover/block:opacity-100 group-focus-within/block:opacity-100 data-[state=open]:opacity-100 pointer-coarse:h-11 pointer-coarse:w-11 ${
            current ? "max-md:opacity-100 pointer-coarse:opacity-100" : "max-md:invisible pointer-coarse:invisible"
          }`}
        >
          <Icon.more />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="end" sideOffset={4} className="fade-up z-50 w-64 rounded-md border border-rule bg-surface p-1 text-text shadow-[var(--shadow-float)]">
          {block.because && (
            <>
              <p className="px-2 pb-2 pt-1.5 text-[12.5px] leading-snug text-muted"><span className="font-semibold text-text">Why this is here.</span> {block.because}</p>
              <div className="mb-1 h-px bg-rule" />
            </>
          )}
          {/* stays open so the label can flip to "Copied" */}
          <button
            type="button"
            className={item}
            onClick={async () => {
              if (await copyBlock(block.id)) {
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }
            }}
          >
            {copied ? <Icon.check size={14} className="text-ok" /> : <Icon.article size={14} />}
            <span aria-live="polite">{copied ? "Copied" : "Copy"}</span>
            <kbd className="ml-auto font-mono text-[11px] text-muted">c</kbd>
          </button>
          <Popover.Close asChild>
            <button type="button" className={item} onClick={() => useWorkspace.getState().focusBlock(block.id, true)}>
              <Icon.expand size={14} /> Fullscreen <kbd className="ml-auto font-mono text-[11px] text-muted">f</kbd>
            </button>
          </Popover.Close>
          <Popover.Close asChild>
            <button type="button" className={item} onClick={() => useWorkspace.getState().togglePin(block.id)}>
              <Icon.pin size={14} /> {pinned ? "Unpin" : "Pin to top"} <kbd className="ml-auto font-mono text-[11px] text-muted">p</kbd>
            </button>
          </Popover.Close>
          <Popover.Close asChild>
            <button type="button" className={item} disabled={!canUndo} onClick={() => useWorkspace.getState().undoLatestFor(block.id)}>
              <Icon.undo size={14} /> Undo last change <kbd className="ml-auto font-mono text-[11px] text-muted">u</kbd>
            </button>
          </Popover.Close>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
