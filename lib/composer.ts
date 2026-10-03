/** Composer rules shared by every composer (dock, mobile sheet, command bars, Home). */

/** Pastes longer than this become a "Pasted text" card instead of flooding the box. */
export const PASTE_THRESHOLD = 1200;
/** `TurnRequest.source_text` cap. */
export const SOURCE_TEXT_MAX = 8000;
/** The box grows up to this many lines, then scrolls inside itself. */
export const COMPOSER_MAX_LINES = 8;
/** Message sent when the learner sends a pasted card with nothing typed. */
export const DEFAULT_SOURCE_PROMPT = "Help me understand what I'm reading.";

export type KeyAction = "send" | "stop" | "none";

interface KeyLike {
  key: string;
  shiftKey?: boolean;
  isComposing?: boolean;
  keyCode?: number;
}

/**
 * Enter sends, Shift+Enter is a newline, Esc stops a streaming turn.
 * IME guard: never send while composing (isComposing, or keyCode 229 on browsers that
 * report composition that way), so CJK and other IME input does not send early.
 */
export function composerKeyAction(e: KeyLike, streaming: boolean): KeyAction {
  if (e.isComposing || e.keyCode === 229) return "none";
  if (e.key === "Enter" && !e.shiftKey) return "send";
  if (e.key === "Escape" && streaming) return "stop";
  return "none";
}

export interface PastedText {
  text: string;
  words: number;
  truncated: boolean;
}

export function wordCount(s: string): number {
  const m = s.trim().match(/\S+/g);
  return m ? m.length : 0;
}

/** Short pastes insert normally; long ones become a card (capped at SOURCE_TEXT_MAX). */
export function classifyPaste(text: string): { kind: "inline" } | { kind: "card"; card: PastedText } {
  if (text.length <= PASTE_THRESHOLD) return { kind: "inline" };
  const capped = text.slice(0, SOURCE_TEXT_MAX);
  return { kind: "card", card: { text: capped, words: wordCount(capped), truncated: text.length > SOURCE_TEXT_MAX } };
}
