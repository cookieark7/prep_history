"use client";

import { forwardRef, useState, type FormEvent } from "react";

/**
 * The homepage's question box, in the hero and under the tree ("Or ask your own").
 * It never sends anything itself: submitting hands the text to the caller, which runs the
 * handoff (lib/landing/handoff.ts).
 */
export const LandingComposer = forwardRef<HTMLDivElement, { id: string; onSubmit: (q: string) => void }>(
  function LandingComposer({ id, onSubmit }, boxRef) {
    const [q, setQ] = useState("");
    const submit = (e: FormEvent) => {
      e.preventDefault();
      if (q.trim()) onSubmit(q);
    };
    return (
      <form onSubmit={submit} className="w-full">
        <div
          ref={boxRef}
          className="flex h-14 items-center rounded-[10px] border border-[color:var(--lp-rule-strong)] bg-[color:var(--lp-card)] shadow-[0_1px_2px_rgba(22,32,28,0.05)] transition-colors focus-within:border-[color:var(--lp-accent)]"
        >
          <label htmlFor={id} className="sr-only">What do you want to understand?</label>
          <input
            id={id}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            maxLength={1000}
            autoComplete="off"
            placeholder="What do you want to understand?"
            className="h-full min-w-0 flex-1 bg-transparent px-4 font-sans text-[16px] text-[color:var(--lp-ink)] outline-none placeholder:text-[color:var(--lp-muted)] md:text-[17px]"
          />
          <button
            type="submit"
            disabled={!q.trim()}
            className="mr-2 inline-flex h-10 items-center rounded-[7px] bg-[color:var(--lp-accent)] px-4 font-sans text-[14px] font-semibold text-[color:var(--lp-on-accent)] transition-colors hover:bg-[color:var(--lp-accent-ink)] disabled:opacity-45"
          >
            Ask
          </button>
        </div>
      </form>
    );
  },
);
