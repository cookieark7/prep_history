"use client";

import { useRef } from "react";
import { useWorkspace } from "@/lib/store/workspace";
import { abortTurn, sendTurn } from "@/lib/stream-client";
import { DEFAULT_SOURCE_PROMPT } from "@/lib/composer";
import { Icon } from "@/components/ui/icons";
import { PasteCard, useComposer } from "./useComposer";

export const COMPOSER_PLACEHOLDER = "Ask why, pick a period, or paste something you're reading";

type ComposerProps = { id?: string; autoFocus?: boolean; onFocus?: () => void };

// A question asked on the homepage doesn't pass through here: HandoffReader starts that lesson
// directly (components/stage/HandoffReader.tsx).
export function Composer({ id = "composer", autoFocus = false, onFocus }: ComposerProps) {
  const streaming = useWorkspace((s) => s.streaming);
  const ref = useRef<HTMLTextAreaElement>(null);
  const c = useComposer({
    ref,
    streaming,
    onStop: abortTurn,
    onSubmit: ({ text, card }) => {
      const message = text || DEFAULT_SOURCE_PROMPT;
      return sendTurn({ message, sourceText: card?.text, attachmentWords: card?.words });
    },
  });

  return (
    <div className="rounded-md border border-rule bg-surface transition-colors focus-within:border-accent">
      {c.card && <PasteCard card={c.card} onRemove={() => c.setCard(null)} />}
      <label htmlFor={id} className="sr-only">Message Chronicle</label>
      <textarea
        id={id}
        ref={ref}
        data-composer
        autoFocus={autoFocus}
        rows={2}
        maxLength={1000}
        value={c.text}
        onChange={(e) => c.setText(e.target.value)}
        onKeyDown={c.onKeyDown}
        onPaste={c.onPaste}
        onFocus={onFocus}
        placeholder={c.card ? "What do you want from this? (optional)" : COMPOSER_PLACEHOLDER}
        // the whole box shows focus (focus-within above), so no second ring on the textarea
        className="block min-h-[52px] w-full resize-none bg-transparent px-3 pt-2.5 text-[14px] pointer-coarse:text-[16px] leading-5 text-text outline-none! placeholder:text-muted"
      />
      <div className="flex items-center justify-between px-2 pb-2">
        <span className="pl-1 text-[11.5px] text-muted pointer-coarse:invisible">
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
            onClick={() => void c.submit()}
            disabled={!c.canSend}
            className="grid h-8 w-8 place-items-center rounded-md bg-accent text-bg transition-[background-color,transform] duration-150 hover:bg-accent-ink active:scale-[0.97] disabled:bg-sunk disabled:text-muted"
            aria-label="Send"
          >
            <Icon.send size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
