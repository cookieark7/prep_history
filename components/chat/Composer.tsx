"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { useWorkspace } from "@/lib/store/workspace";
import { abortTurn, sendTurn } from "@/lib/stream-client";
import { Icon } from "@/components/ui/icons";

export const COMPOSER_PLACEHOLDER = "Ask why, pick a period, or paste something you're reading";

export function Composer({ id = "composer", autoFocus = false, onFocus }: { id?: string; autoFocus?: boolean; onFocus?: () => void }) {
  const [text, setText] = useState("");
  const streaming = useWorkspace((s) => s.streaming);
  const ref = useRef<HTMLTextAreaElement>(null);

  const submit = () => {
    const t = text.trim();
    if (!t) return;
    setText("");
    void sendTurn({ message: t });
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    } else if (e.key === "Escape" && streaming) {
      e.preventDefault();
      abortTurn();
    }
  };

  return (
    <div className="rounded-md border border-rule bg-surface focus-within:border-rule-strong">
      <label htmlFor={id} className="sr-only">Message Chronicle</label>
      <textarea
        id={id}
        ref={ref}
        data-composer
        autoFocus={autoFocus}
        rows={2}
        maxLength={1000}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKey}
        onFocus={onFocus}
        placeholder={COMPOSER_PLACEHOLDER}
        className="block max-h-40 min-h-[52px] w-full resize-none bg-transparent px-3 pt-2.5 text-[14px] leading-snug text-text outline-none placeholder:text-muted"
      />
      <div className="flex items-center justify-between px-2 pb-2">
        <span className="pl-1 text-[11.5px] text-muted">
          <kbd className="font-mono">⌘K</kbd> commands
        </span>
        {streaming ? (
          <button
            type="button"
            onClick={abortTurn}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-rule px-2.5 text-[12.5px] text-text hover:bg-hover"
            aria-label="Stop (Esc)"
          >
            <Icon.stop size={12} /> Stop
          </button>
        ) : (
          <button
            type="button"
            onClick={submit}
            disabled={!text.trim()}
            className="grid h-8 w-8 place-items-center rounded-md bg-accent text-surface disabled:bg-rule disabled:text-muted"
            aria-label="Send"
          >
            <Icon.send size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
