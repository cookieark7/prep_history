"use client";

import { useState } from "react";
import { useWorkspace } from "@/lib/store/workspace";
import { ChatLog, ChatScroller } from "@/components/chat/ChatDock";
import { Composer } from "@/components/chat/Composer";
import { StatusLine } from "@/components/chat/TurnStatus";

/** Mobile: the conversation as a bottom sheet (collapsed = the status line and the composer, so the lesson keeps the screen). The view switch is in the top bar. */
export function MobileChrome() {
  const [open, setOpen] = useState(false);
  const count = useWorkspace((s) => s.chat.length);
  const streaming = useWorkspace((s) => s.streaming);
  const last = useWorkspace((s) => [...s.chat].reverse().find((c) => c.role === "director"));

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 md:hidden">
      <div className="rounded-t-[10px] border-t border-rule bg-bg shadow-[var(--shadow-float)]">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex h-9 w-full items-center justify-center gap-2 text-[13px] text-muted"
          aria-expanded={open}
          aria-label={open ? "Collapse conversation" : "Show conversation"}
        >
          <span className="h-1 w-9 rounded-full bg-rule-strong" />
          {!open && count > 0 && !streaming && <span>Conversation</span>}
        </button>
        {open && (
          <ChatScroller className="enter-rise h-[55dvh] border-t border-rule">
            <ChatLog compact />
          </ChatScroller>
        )}
        {!open && <StatusLine entry={last} className="mx-4 mb-2" />}
        <div className="px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          <Composer id="composer-mobile" />
        </div>
      </div>
    </div>
  );
}
