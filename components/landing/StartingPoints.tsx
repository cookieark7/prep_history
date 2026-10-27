"use client";

import { useState } from "react";
import { PROMPT_KINDS, SUPPORTED_KINDS } from "@/content/landing/prompt-kinds";
import type { PromptKind } from "@/lib/landing/types";
import { requestStart } from "@/lib/landing/start";
import { LandingComposer } from "./Composer";
import { TreeTimeline } from "./TreeTimeline";
import "./starting-points.css";

// Starting points (prompt section 6): 20 events, each a way into a lesson, on a vertical tree
// (TreeTimeline). The questions on each card show what you can ask; picking one hands it to
// /study (never auto-sent).

export function StartingPoints() {
  const [kind, setKind] = useState<PromptKind | null>(null);
  return (
    <section id="starting-points" aria-labelledby="sp-h" className="sp">
      <div className="mx-auto max-w-[1120px] px-4 md:px-6">
        <p className="font-mono text-[12px] uppercase tracking-[0.14em] text-[color:var(--lp-muted)]">Starting points</p>
        <h2 id="sp-h" className="lp-display mt-3 text-[32px] font-medium leading-[1.1] md:text-[44px]">
          Pick a moment. Ask the question you actually have.
        </h2>
        <p className="mt-3 max-w-[640px] font-sans text-[18px] leading-[1.5] text-[color:var(--lp-muted)] md:text-[19px]">
          Every event is a way in. The questions show what you can ask Chronicle. Tap one to start, or write your own.
        </p>

        <HowToAsk active={kind} onActive={setKind} />

        <div className="mt-12" role="region" aria-label="Timeline of starting points, oldest first">
          <TreeTimeline kind={kind} />
        </div>
      </div>

      <div className="mx-auto mt-10 max-w-[640px] px-4">
        <p className="lp-display mb-3 text-[24px] font-medium">Or ask your own</p>
        <LandingComposer id="sp-composer" onSubmit={(q) => requestStart({ q, kind: "free" })} />
      </div>
    </section>
  );
}

/** The prompt guide (prompt 6.2): five kinds of question and what each gets you. */
function HowToAsk({ active, onActive }: { active: PromptKind | null; onActive: (k: PromptKind | null) => void }) {
  return (
    <div className="sp-legend" aria-label="How to ask">
      <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-[color:var(--lp-muted)]">How to ask</p>
      <ul className="sp-legend-row">
        {SUPPORTED_KINDS.map((k) => {
          const info = PROMPT_KINDS[k];
          return (
            <li key={k}>
              <button
                type="button"
                className="sp-kind"
                data-on={active === k ? "1" : undefined}
                onMouseEnter={() => onActive(k)}
                onMouseLeave={() => onActive(null)}
                onFocus={() => onActive(k)}
                onBlur={() => onActive(null)}
                aria-pressed={active === k}
              >
                <span className="flex items-center gap-2">
                  <Mark kind={info.mark} />
                  <span className="sp-chip-kind">{info.label}</span>
                </span>
                <span className="mt-1 block font-serif text-[15px] italic leading-[1.35]">{info.example}</span>
                <span className="mt-1 block text-[12.5px] leading-[1.4] text-[color:var(--lp-muted)]">{info.youGet}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Mark({ kind }: { kind: string }) {
  const s = { fill: "none", stroke: "currentColor", strokeWidth: 1.5 } as const;
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden className="text-[color:var(--lp-accent)]">
      {kind === "diamond" && <path d="M8 1.5 14.5 8 8 14.5 1.5 8Z" {...s} />}
      {kind === "ticks" && <path d="M1 12H15M3 12V7M8 12V4M13 12V8" {...s} />}
      {kind === "fork" && <path d="M8 2V7M8 7 3 13M8 7 13 13M8 7V13" {...s} />}
      {kind === "half-circle" && <path d="M2 10A6 6 0 0 1 14 10Z" {...s} />}
      {kind === "check" && <path d="M2.5 8.5 6.5 12.5 13.5 3.5" {...s} />}
    </svg>
  );
}
