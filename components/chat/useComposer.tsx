"use client";

import { useLayoutEffect, useState, type ClipboardEvent, type KeyboardEvent, type RefObject } from "react";
import { classifyPaste, composerKeyAction, COMPOSER_MAX_LINES, type PastedText } from "@/lib/composer";
import { Icon } from "@/components/ui/icons";

export interface ComposerSubmit {
  text: string;
  card: PastedText | null;
}

/**
 * Shared composer behaviour: auto-grow up to 8 lines, Enter/Shift+Enter with an IME guard,
 * long-paste cards, and draft restore when a send fails.
 */
export function useComposer(opts: {
  /** the textarea (owned by the caller so the returned state is plain data) */
  ref: RefObject<HTMLTextAreaElement | null>;
  streaming: boolean;
  onSubmit: (s: ComposerSubmit) => Promise<"done" | "error" | "aborted" | void> | void;
  onStop?: () => void;
  /** Starting text, e.g. a question handed over from the landing page. */
  initialText?: string;
}) {
  const [text, setText] = useState(opts.initialText ?? "");
  const [card, setCard] = useState<PastedText | null>(null);
  const { ref } = opts;

  // auto-grow: up to COMPOSER_MAX_LINES lines, then scroll inside
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    // a hidden composer (e.g. the desktop dock on a phone) measures 0; don't pin it at 0px
    if (el.offsetParent === null) {
      el.style.height = "";
      return;
    }
    const cs = getComputedStyle(el);
    const line = parseFloat(cs.lineHeight) || 20;
    const max = line * COMPOSER_MAX_LINES + parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
    el.style.height = "auto";
    const want = el.scrollHeight;
    el.style.height = `${Math.min(want, max)}px`;
    el.style.overflowY = want > max ? "auto" : "hidden";
  }, [text, ref]);

  const submit = async () => {
    const t = text.trim();
    if (!t && !card) return;
    const sentCard = card;
    setText("");
    setCard(null);
    const status = await opts.onSubmit({ text: t, card: sentCard });
    // a failed send gives the draft back, unless the learner already started a new one
    if (status === "error") {
      setText((cur) => (cur ? cur : t));
      setCard((cur) => cur ?? sentCard);
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    const action = composerKeyAction(
      { key: e.key, shiftKey: e.shiftKey, isComposing: e.nativeEvent.isComposing, keyCode: e.nativeEvent.keyCode },
      opts.streaming,
    );
    if (action === "send") { e.preventDefault(); void submit(); }
    if (action === "stop") { e.preventDefault(); opts.onStop?.(); }
  };

  const onPaste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    const pasted = e.clipboardData.getData("text/plain");
    const r = classifyPaste(pasted);
    if (r.kind === "card") {
      e.preventDefault();
      setCard(r.card);
    }
  };

  return { text, setText, card, setCard, submit, onKeyDown, onPaste, canSend: !!text.trim() || !!card };
}

/** "Pasted text, N words" with expand and remove. */
export function PasteCard({ card, onRemove }: { card: PastedText; onRemove: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mx-2 mt-2 rounded-[2px] border border-rule bg-bg text-[12.5px]">
      <div className="flex items-center gap-2 px-2.5 py-1.5">
        <Icon.article size={13} className="shrink-0 text-muted" />
        <span className="flex-1 truncate">
          Pasted text, {card.words.toLocaleString()} words{card.truncated && <span className="text-muted"> (first 8,000 characters)</span>}
        </span>
        <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="h-7 rounded px-1.5 text-muted hover:bg-hover hover:text-text">
          {open ? "Collapse" : "Expand"}
        </button>
        <button type="button" onClick={onRemove} aria-label="Remove pasted text" className="grid h-7 w-7 place-items-center rounded text-muted hover:bg-hover hover:text-text">
          <Icon.close size={12} />
        </button>
      </div>
      {open && (
        <p className="scroll-thin max-h-40 overflow-y-auto whitespace-pre-wrap border-t border-rule px-2.5 py-2 text-[13.5px] leading-relaxed text-muted">
          {card.text}
        </p>
      )}
    </div>
  );
}
