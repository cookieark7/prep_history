"use client";

import { useState } from "react";
import type { Mode } from "@/lib/contracts";
import { useWorkspace } from "@/lib/store/workspace";
import { Icon, type IconName } from "@/components/ui/icons";
import { ChatLog, ChatScroller } from "@/components/chat/ChatDock";
import { Composer } from "@/components/chat/Composer";
import { StatusLine } from "@/components/chat/TurnStatus";

const TABS: { id: Mode; label: string; icon: IconName }[] = [
  { id: "reader", label: "Reader", icon: "article" },
  { id: "canvas", label: "Canvas", icon: "cause_graph" },
  { id: "timeline", label: "Timeline", icon: "timeline" },
  { id: "focus", label: "Focus", icon: "quiz" },
];

/** Mobile: chat as a bottom sheet (collapsed = composer only) above a bottom tab bar. */
export function MobileChrome() {
  const [open, setOpen] = useState(false);
  const mode = useWorkspace((s) => s.mode);
  const count = useWorkspace((s) => s.chat.length);
  const streaming = useWorkspace((s) => s.streaming);
  const last = useWorkspace((s) => [...s.chat].reverse().find((c) => c.role === "director"));

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 md:hidden">
      <div className="rounded-t-[10px] border-t border-rule bg-bg shadow-[var(--shadow-float)]">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex h-9 w-full items-center justify-center gap-2 text-[12px] text-muted"
          aria-expanded={open}
          aria-label={open ? "Collapse conversation" : "Show conversation"}
        >
          <span className="h-1 w-9 rounded-full bg-rule-strong" />
          {!open && count > 0 && !streaming && <span>Conversation</span>}
        </button>
        {open ? (
          <ChatScroller className="h-[55vh] border-t border-rule">
            <ChatLog compact />
          </ChatScroller>
        ) : (
          last?.text && !streaming && (
            <p className="line-clamp-2 px-4 pb-2 font-serif text-[14px] leading-snug text-text">{last.text}</p>
          )
        )}
        {!open && <StatusLine entry={last} className="mx-4 mb-2" />}
        <div className="px-3 pb-2">
          <Composer id="composer-mobile" />
        </div>
      </div>
      <nav aria-label="Mode" className="flex border-t border-rule bg-bg pb-[env(safe-area-inset-bottom)]">
        {TABS.map((t) => {
          const I = Icon[t.icon];
          const on = mode === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => useWorkspace.getState().setMode(t.id)}
              aria-current={on ? "page" : undefined}
              className={`flex h-14 flex-1 flex-col items-center justify-center gap-1 text-[11px] ${on ? "text-accent" : "text-muted"}`}
            >
              <I size={16} />
              {t.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
