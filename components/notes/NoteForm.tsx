"use client";

import { useState } from "react";
import type { NoteKind } from "@/lib/contracts";
import { useWorkspace } from "@/lib/store/workspace";
import { sendTurn } from "@/lib/stream-client";
import { ACCOUNTS } from "@/lib/auth";

export const NOTE_KINDS: { id: NoteKind; label: string; cls: string; color: string }[] = [
  { id: "remember", label: "Remember", cls: "note-remember", color: "var(--ochre)" },
  { id: "question", label: "Question", cls: "note-question", color: "var(--brick)" },
  { id: "disagree", label: "Disagree", cls: "note-disagree", color: "var(--violet)" },
];

/** Create a note on a quote; fires note_created so the Director can respond. */
export function saveNote(n: { blockId: string; kind: NoteKind; quote: string; text: string; section: string | null }) {
  useWorkspace.getState().addNote(n);
  if (n.kind === "remember" && ACCOUNTS) void rememberCard(n);
  const label = NOTE_KINDS.find((k) => k.id === n.kind)!.label;
  void sendTurn({
    event: { event: "note_created", block_id: n.blockId, kind: n.kind, text: n.text, quote: n.quote },
    echo: `${label}: “${n.quote.length > 80 ? n.quote.slice(0, 77) + "…" : n.quote}”${n.text ? ` — ${n.text}` : ""}`,
  });
}

/** A "Remember" note also goes into the review queue (docs/PROTOTYPE_PLAN.md, section 7.2). */
function rememberCard(n: { blockId: string; quote: string; text: string }) {
  const q = n.quote.replace(/\s+/g, " ").trim();
  const short = q.length > 110 ? `${q.slice(0, 107).replace(/\s+\S*$/, "")}…` : q;
  const back = n.text ? `${q} (your note: ${n.text})` : q;
  return fetch("/api/review/cards", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      lessonId: useWorkspace.getState().lessonId,
      front: `What do you remember about this: “${short}”?`,
      back: back.length > 400 ? `${back.slice(0, 399)}…` : back,
      sourceRef: { block: n.blockId, node: null },
    }),
  }).catch(() => {}); // the note itself is kept either way
}

export function NoteForm({
  blockId, quote, section, initialKind = "remember", onDone,
}: { blockId: string; quote: string; section: string | null; initialKind?: NoteKind; onDone: () => void }) {
  const [kind, setKind] = useState<NoteKind>(initialKind);
  const [text, setText] = useState("");
  const submit = () => {
    saveNote({ blockId, kind, quote, text: text.trim(), section });
    onDone();
  };
  return (
    <div className="w-72 rounded-md border border-rule bg-surface p-3 text-[13px] text-text shadow-[var(--shadow-float)]">
      <p className="mb-2 line-clamp-2 text-[14px] italic text-muted">“{quote}”</p>
      <div role="radiogroup" aria-label="Note kind" className="mb-2 flex gap-1">
        {NOTE_KINDS.map((k) => (
          <button
            key={k.id}
            type="button"
            role="radio"
            aria-checked={kind === k.id}
            onClick={() => setKind(k.id)}
            className={`h-8 flex-1 rounded-md border text-[12.5px] ${kind === k.id ? "border-text" : "border-rule text-muted"}`}
          >
            <span className={k.cls}>{k.label}</span>
          </button>
        ))}
      </div>
      <textarea
        autoFocus
        rows={2}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey || !e.shiftKey)) { e.preventDefault(); submit(); }
          if (e.key === "Escape") { e.stopPropagation(); onDone(); }
        }}
        placeholder={kind === "remember" ? "Why it matters (optional)" : kind === "question" ? "What do you want to know?" : "What do you think instead?"}
        className="block w-full resize-none rounded-md border border-rule bg-bg px-2 py-1.5 outline-none focus:border-rule-strong"
        aria-label="Note text"
      />
      <div className="mt-2 flex justify-end gap-1.5">
        <button type="button" onClick={onDone} className="h-8 rounded-md px-2.5 text-muted hover:bg-hover">Cancel</button>
        <button type="button" onClick={submit} className="h-8 rounded-md bg-text px-3 text-bg">Save note</button>
      </div>
    </div>
  );
}
