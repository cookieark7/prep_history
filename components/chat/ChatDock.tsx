"use client";

import { useEffect, useRef } from "react";
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
  const endRef = useRef<HTMLDivElement>(null);
  const last = chat.at(-1);
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [chat.length, last?.text, last?.landed.length, last?.followups.length, last?.status]);

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
            <DirectorRow entry={c} />
          )}
        </li>
      ))}
      <div ref={endRef} />
    </ol>
  );
}

function DirectorRow({ entry }: { entry: ChatEntry }) {
  const blocks = useWorkspace((s) => s.blocks);
  const flashBlock = useWorkspace((s) => s.flashBlock);
  const streaming = entry.status === "streaming";
  return (
    <div>
      {entry.text ? (
        <p className="fade-up font-serif text-[16px] leading-[1.5] text-text">{entry.text}</p>
      ) : streaming ? (
        <p className="sr-only">Working on it</p>
      ) : null}
      <StatusLine entry={entry} className="mt-2" />

      {entry.landed.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {entry.landed.map((id) => {
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

      {entry.followups.length > 0 && (
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
  if (!open) return null;
  return (
    <aside
      aria-label="Chat"
      className="fixed inset-y-0 left-0 z-30 hidden w-[340px] flex-col border-r border-rule bg-bg md:flex"
    >
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
      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto">
        <ChatLog />
      </div>
      <div className="border-t border-rule p-3">
        <Composer />
      </div>
    </aside>
  );
}
