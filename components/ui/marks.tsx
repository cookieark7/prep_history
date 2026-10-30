"use client";

import * as Popover from "@radix-ui/react-popover";
import type { Confidence, Layer } from "@/lib/contracts";
import { CONFIDENCE_LABEL } from "@/lib/confidence";

/** Filled = established, half = likely, hollow = contested. Never colour alone. */
export function ConfidenceDot({ c, size = 8 }: { c: Confidence; size?: number }) {
  const r = size / 2 - 0.75;
  const mid = size / 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden className="shrink-0">
      <circle cx={mid} cy={mid} r={r} fill={c === "E" ? "currentColor" : "none"} stroke="currentColor" strokeWidth={1.2} />
      {c === "L" && <path d={`M${mid} ${mid - r} A${r} ${r} 0 0 0 ${mid} ${mid + r} Z`} fill="currentColor" />}
    </svg>
  );
}

/** Inline [E]/[L]/[C] tag with a popover explaining the three levels. */
export function ConfidenceTag({ c }: { c: Confidence }) {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="mx-0.5 inline-flex translate-y-[-2px] items-center gap-1 rounded-[3px] border border-rule px-1 py-px align-middle tnum font-semibold text-[11.5px] leading-none text-muted hover:border-rule-strong hover:text-text"
          aria-label={`Confidence: ${CONFIDENCE_LABEL[c]}. What does this mean?`}
        >
          <ConfidenceDot c={c} size={7} />
          {c}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          sideOffset={6}
          className="pop z-50 w-72 rounded-md border border-rule bg-surface p-3 font-sans text-[13px] leading-snug text-text shadow-[var(--shadow-float)]"
        >
          <p className="mb-2 font-medium">How sure are historians?</p>
          <ul className="space-y-1.5">
            {(["E", "L", "C"] as const).map((k) => (
              <li key={k} className={`flex items-start gap-2 ${k === c ? "" : "text-muted"}`}>
                <span className="mt-1"><ConfidenceDot c={k} /></span>
                <span>
                  <span className="font-medium capitalize">{CONFIDENCE_LABEL[k]}</span>
                  {k === "E" && " — well attested in sources; broadly agreed."}
                  {k === "L" && " — the best reading of the evidence, but not certain."}
                  {k === "C" && " — historians actively disagree."}
                </span>
              </li>
            ))}
          </ul>
          <Popover.Arrow className="fill-[var(--surface)]" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

export const LAYER_LABEL: Record<Layer, string> = {
  structural: "Long-term cause",
  enabling: "Made it possible",
  trigger: "Spark",
  contingency: "Chance or choice",
  event: "The event",
  consequence: "What it led to",
};

export const layerColor = (l: Layer) => (l === "event" ? "var(--text)" : `var(--l-${l})`);

/** Square, triangle, diamond, open circle, filled circle; the event is a rounded square. */
export function LayerShape({ layer, size = 12 }: { layer: Layer; size?: number }) {
  const s = size;
  const col = layerColor(layer);
  const sw = 1.4;
  return (
    <svg width={s} height={s} viewBox="0 0 12 12" aria-hidden className="shrink-0">
      {layer === "structural" && <rect x="1.5" y="1.5" width="9" height="9" fill={col} />}
      {layer === "enabling" && <path d="M6 1.2 11 10.5H1z" fill={col} />}
      {layer === "trigger" && <path d="M6 .8 11.2 6 6 11.2.8 6z" fill={col} />}
      {layer === "contingency" && <circle cx="6" cy="6" r="4.4" fill="none" stroke={col} strokeWidth={sw * 1.2} />}
      {layer === "consequence" && <circle cx="6" cy="6" r="5" fill={col} />}
      {layer === "event" && <rect x=".8" y=".8" width="10.4" height="10.4" rx="2.6" fill={col} />}
    </svg>
  );
}
