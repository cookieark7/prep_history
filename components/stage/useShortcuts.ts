"use client";

import { useEffect } from "react";
import { useWorkspace } from "@/lib/store/workspace";
import { abortTurn } from "@/lib/stream-client";
import { scrollToEl } from "@/lib/scroll";

const isTyping = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));

/** The keyboard layer. The cheat sheet (components/ui/dialogs.tsx SHORTCUTS) must match this. */
function currentBlockId(): string | undefined {
  const el = document.activeElement?.closest<HTMLElement>("[data-block]")
    ?? [...document.querySelectorAll<HTMLElement>("main [data-block]")].find((x) => x.getBoundingClientRect().bottom > 120);
  return el?.dataset.block;
}

export function useShortcuts(h: {
  palette: () => void;
  shortcuts: () => void;
  anyDialogOpen: boolean;
  copyBlock?: (id: string) => void;
  newLesson?: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const s = useWorkspace.getState();
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "k") { e.preventDefault(); h.palette(); return; }
      if (mod && e.key === "\\") { e.preventDefault(); s.setChatOpen(!s.chatOpen); return; }
      if (h.anyDialogOpen) return;
      if (e.key === "Escape") {
        if (s.fullscreen) { s.exitFocus(); return; }
        if (s.streaming && !isTyping(e.target)) { abortTurn(); return; }
        if (s.mode === "focus" || s.mode === "canvas" || s.mode === "timeline") { s.setMode("reader"); return; }
        return;
      }
      if (isTyping(e.target) || mod || e.altKey) return;
      if (e.key === "?") { e.preventDefault(); h.shortcuts(); return; }
      if (e.key === "N" && e.shiftKey) { e.preventDefault(); h.newLesson?.(); return; }
      if (e.key === "/") {
        e.preventDefault();
        [...document.querySelectorAll<HTMLTextAreaElement>("[data-composer]")].find((el) => el.offsetParent !== null)?.focus();
        return;
      }
      if (e.key === "j" || e.key === "k") {
        const els = [...document.querySelectorAll<HTMLElement>("[data-block]")];
        if (!els.length) return;
        const active = document.activeElement?.closest<HTMLElement>("[data-block]");
        let i = active ? els.indexOf(active) : els.findIndex((el) => el.getBoundingClientRect().top > 60) - (e.key === "j" ? 1 : 0);
        i = e.key === "j" ? i + 1 : i - 1;
        const next = els[Math.max(0, Math.min(els.length - 1, i))];
        next.focus({ preventScroll: true });
        scrollToEl(next);
        return;
      }
      // block actions act on the focused block, else the topmost one in view (reader only)
      if (s.mode === "reader" && (e.key === "f" || e.key === "p" || e.key === "u" || e.key === "c")) {
        const id = currentBlockId();
        if (!id) return;
        e.preventDefault();
        if (e.key === "f") s.focusBlock(id, true);
        if (e.key === "p") s.togglePin(id);
        if (e.key === "u") s.undoLatestFor(id);
        if (e.key === "c") h.copyBlock?.(id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [h]);
}
