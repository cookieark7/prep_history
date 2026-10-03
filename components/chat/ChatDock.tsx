"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { landedFor } from "@/lib/rail";
import { clampDock, dockKeyStep, DOCK_DEFAULT, DOCK_MAX, DOCK_MIN } from "@/lib/dock";
import { scrollToEl } from "@/lib/scroll";
import Link from "next/link";
import { useWorkspace, type ChatEntry } from "@/lib/store/workspace";
import { retryTurn, sendTurn } from "@/lib/stream-client";
import { Icon } from "@/components/ui/icons";
import { TYPE_LABEL } from "@/lib/store/reducer";
import { scrollToBlock } from "@/components/blocks/Markdown";
import { Composer } from "./Composer";
import { StatusLine } from "./TurnStatus";

export function ChatLog({ compact = false }: { compact?: boolean }) {
  const chat = useWorkspace((s) => s.chat);
  const latestReply = [...chat].reverse().find((c) => c.role === "director")?.id;

  if (!chat.length) {
    return <p className="px-5 py-6 font-serif text-[15px] italic text-muted">The conversation shows up here. The lesson builds on the Stage.</p>;
  }
  return (
    <ol className={compact ? "" : "pb-4"} aria-label="Conversation">
      {chat.map((c) => (
        <li key={c.id} className="border-b border-rule px-5 py-3.5 last:border-b-0">
          {c.role === "learner" ? (
            <>
              <p className="text-[13.5px] leading-snug text-muted">{c.text}</p>
              {c.attachment && (
                <p className="mt-1 inline-flex items-center gap-1.5 rounded-[2px] border border-rule px-1.5 py-0.5 text-[11.5px] text-muted">
                  <Icon.article size={11} /> Pasted text, {c.attachment.words.toLocaleString()} words
                </p>
              )}
            </>
          ) : (
            <DirectorRow entry={c} latest={c.id === latestReply} />
          )}
        </li>
      ))}
      <div data-chat-end />
    </ol>
  );
}

function DirectorRow({ entry, latest }: { entry: ChatEntry; latest: boolean }) {
  const blocks = useWorkspace((s) => s.blocks);
  const history = useWorkspace((s) => s.history);
  const flashBlock = useWorkspace((s) => s.flashBlock);
  const streaming = entry.status === "streaming";
  // landed chips are read from the step trace (same entries as the drawer and the rail)
  const landed = useMemo(() => landedFor(history, entry.id, blocks), [history, entry.id, blocks]);
  return (
    <div>
      {entry.text ? (
        <p className="fade-up font-serif text-[16px] leading-[1.5] text-text">{entry.text}</p>
      ) : streaming ? (
        <p className="sr-only">Working on it</p>
      ) : null}
      <StatusLine entry={entry} className="mt-2" />

      {landed.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {landed.map((id) => {
            const b = blocks.find((x) => x.id === id);
            if (!b) return null;
            const I = Icon[b.type];
            return (
              <button
                key={id}
                type="button"
                onClick={() => scrollToBlock(id, null, flashBlock)}
                className="fade-up inline-flex max-w-full items-center gap-1.5 rounded-md border border-rule bg-surface px-2 py-1 text-[12px] text-text hover:border-rule-strong"
                title={`${TYPE_LABEL[b.type]}: ${b.title}`}
              >
                <I size={12} className="shrink-0 text-muted" />
                <span className="truncate"><span className="text-muted">{TYPE_LABEL[b.type]}:</span> {b.title}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* follow-ups only under the latest reply: once one is used, the next reply replaces them */}
      {latest && entry.followups.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {entry.followups.map((f) => {
            const I = Icon[f.kind];
            return (
              <button
                key={f.label}
                type="button"
                onClick={() => void sendTurn({ message: f.label })}
                className="fade-up inline-flex min-h-8 items-center gap-1.5 rounded-md border border-dashed border-rule-strong px-2 py-1 text-left text-[12.5px] text-text hover:border-accent hover:text-accent"
              >
                <I size={12} className="shrink-0" />
                {f.label}
              </button>
            );
          })}
        </div>
      )}

      {entry.status === "error" && (
        <p className="mt-2 flex items-center gap-2 text-[13px] text-muted">
          The reply stopped before it finished. Your Stage is unchanged.
          {entry.retry && (
            <button type="button" className="text-accent underline-offset-2 hover:underline" onClick={() => retryTurn(entry.id)}>
              Retry
            </button>
          )}
        </p>
      )}
      {entry.status === "aborted" && <p className="mt-1 text-[12.5px] text-muted">Stopped.</p>}
    </div>
  );
}

export function ChatDock() {
  const open = useWorkspace((s) => s.chatOpen);
  const width = useWorkspace((s) => s.dockWidth);
  if (!open) return null;
  return (
    <aside
      aria-label="Chat"
      style={{ width }}
      className="fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-rule bg-bg md:flex"
    >
      <DockResizer width={width} />
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-rule px-5">
        <Link href="/" className="font-serif text-[19px] font-semibold tracking-tight">Chronicle</Link>
        <button
          type="button"
          onClick={() => useWorkspace.getState().setChatOpen(false)}
          className="grid h-8 w-8 place-items-center rounded-md text-muted hover:bg-hover hover:text-text"
          aria-label="Collapse chat (Cmd+\)"
          title="Collapse chat (⌘\)"
        >
          <Icon.sidebar />
        </button>
      </div>
      <ChatScroller className="min-h-0 flex-1">
        <ChatLog />
      </ChatScroller>
      <div className="border-t border-rule p-3">
        <Composer />
      </div>
    </aside>
  );
}

/**
 * Stick-to-bottom for the conversation only: follows new content while the learner is
 * within 80px of the bottom; once they scroll up it stops and offers "Jump to latest".
 */
export function ChatScroller({ className = "", innerClassName = "", children }: { className?: string; innerClassName?: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pinned, setPinned] = useState(true);
  // a cheap signature of "the conversation changed"
  const sig = useWorkspace((s) => {
    const l = s.chat.at(-1);
    return `${s.chat.length}|${l?.text.length}|${s.history.length}|${l?.followups.length}|${l?.status}`;
  });
  useLayoutEffect(() => {
    const el = ref.current;
    if (pinned && el) el.scrollTop = el.scrollHeight;
  }, [sig, pinned]);

  return (
    <div className={`relative ${className}`}>
      <div
        ref={ref}
        onScroll={(e) => {
          const el = e.currentTarget;
          setPinned(el.scrollHeight - el.scrollTop - el.clientHeight < 80);
        }}
        className={`scroll-thin h-full overflow-y-auto ${innerClassName}`}
      >
        {children}
      </div>
      {!pinned && (
        <button
          type="button"
          onClick={() => { scrollToEl(ref.current?.querySelector("[data-chat-end]"), "end"); setPinned(true); }}
          className="fade-up absolute bottom-3 left-1/2 inline-flex h-8 -translate-x-1/2 items-center gap-1.5 rounded-full border border-rule bg-surface px-3 text-[12px] shadow-[var(--shadow-float)] hover:border-rule-strong"
        >
          <Icon.chevronDown size={12} /> Jump to latest
        </button>
      )}
    </div>
  );
}

/**
 * Drag handle between the dock and the Stage (E6): a keyboard-operable separator.
 * Mouse, touch and pen via pointer events; arrows ±16 (Shift ±48); Home/End to the limits;
 * double-click resets. The width persists.
 */
function DockResizer({ width }: { width: number }) {
  const set = (w: number) => useWorkspace.getState().setDockWidth(w);
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize chat"
      aria-valuenow={width}
      aria-valuemin={DOCK_MIN}
      aria-valuemax={DOCK_MAX}
      tabIndex={0}
      title="Drag to resize · double-click to reset"
      onPointerDown={(e) => {
        e.preventDefault();
        const el = e.currentTarget;
        el.setPointerCapture(e.pointerId);
        const startX = e.clientX;
        const startW = width;
        document.body.style.userSelect = "none";
        const move = (ev: PointerEvent) => set(clampDock(startW + ev.clientX - startX));
        const up = () => {
          document.body.style.userSelect = "";
          el.removeEventListener("pointermove", move);
          el.removeEventListener("pointerup", up);
          el.removeEventListener("pointercancel", up);
        };
        el.addEventListener("pointermove", move);
        el.addEventListener("pointerup", up);
        el.addEventListener("pointercancel", up);
      }}
      onDoubleClick={() => set(DOCK_DEFAULT)}
      onKeyDown={(e) => {
        const next = dockKeyStep(e.key, e.shiftKey, width);
        if (next != null) { e.preventDefault(); set(next); }
      }}
      className="group absolute inset-y-0 -right-[5px] z-10 w-[10px] cursor-col-resize touch-none outline-none"
    >
      <span className="absolute inset-y-0 left-1/2 w-[2px] -translate-x-1/2 bg-transparent transition-colors duration-150 group-hover:bg-rule-strong group-focus-visible:bg-accent group-active:bg-accent" />
    </div>
  );
}
