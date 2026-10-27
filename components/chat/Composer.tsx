"use client";

import { useEffect, useRef, useState } from "react";
import { useWorkspace } from "@/lib/store/workspace";
import { abortTurn, sendTurn } from "@/lib/stream-client";
import { DEFAULT_SOURCE_PROMPT } from "@/lib/composer";
import { handoffHint } from "@/lib/landing/handoff";
import { usePrefill } from "@/lib/landing/prefill";
import { Icon } from "@/components/ui/icons";
import { PasteCard, useComposer } from "./useComposer";

export const COMPOSER_PLACEHOLDER = "Ask why, pick a period, or paste something you're reading";

type ComposerProps = { id?: string; autoFocus?: boolean; onFocus?: () => void };

/** Remounts with each question handed over from the landing page, so it starts prefilled. */
export function Composer(props: ComposerProps) {
  const nonce = usePrefill((s) => s.nonce);
  return <ComposerBox key={nonce} {...props} />;
}

function ComposerBox({ id = "composer", autoFocus = false, onFocus }: ComposerProps) {
  const streaming = useWorkspace((s) => s.streaming);
  const handoff = usePrefill((s) => s.handoff);
  const [hintGone, setHintGone] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);
  const c = useComposer({
    ref,
    streaming,
    initialText: usePrefill.getState().handoff?.q ?? "",
    onStop: abortTurn,
    onSubmit: ({ text, card }) => {
      const message = text || DEFAULT_SOURCE_PROMPT;
      // A handed-over question starts a fresh lesson, exactly as the home page does. It only
      // ever goes out here, when the learner presses Enter: the landing never auto-sends.
      if (usePrefill.getState().handoff) {
        usePrefill.getState().clear();
        const ws = useWorkspace.getState();
        ws.startLesson(text || "Pasted reading", ws.level);
      }
      return sendTurn({ message, sourceText: card?.text, attachmentWords: card?.words });
    },
  });

  // Arriving with a handed-over question: focus the visible composer, caret at the end.
  useEffect(() => {
    const el = ref.current;
    if (!usePrefill.getState().handoff || !el || el.offsetParent === null) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }, []);

  return (
    <div className="rounded-md border border-rule bg-surface transition-colors focus-within:border-accent">
      {handoff && !hintGone && (
        <p className="border-b border-rule px-3 py-1.5 text-[12px] text-muted" data-handoff-hint>
          {handoffHint(handoff)}
        </p>
      )}
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
        onChange={(e) => { c.setText(e.target.value); setHintGone(true); }}
        onKeyDown={c.onKeyDown}
        onPaste={c.onPaste}
        onFocus={onFocus}
        placeholder={c.card ? "What do you want from this? (optional)" : COMPOSER_PLACEHOLDER}
        // the whole box shows focus (focus-within above), so no second ring on the textarea
        className="block min-h-[52px] w-full resize-none bg-transparent px-3 pt-2.5 text-[14px] leading-5 text-text outline-none! placeholder:text-muted"
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
