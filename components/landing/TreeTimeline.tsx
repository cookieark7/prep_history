"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type KeyboardEvent } from "react";
import * as Popover from "@radix-ui/react-popover";
import { EVENTS, LINKS } from "@/content/landing/timeline";
import { PROMPT_KINDS, SUPPORTED_KINDS } from "@/content/landing/prompt-kinds";
import { LINK_CONFIDENCE, type PromptKind, type TimelineEvent } from "@/lib/landing/types";
import { layoutTree, type TreeMode } from "@/lib/landing/tree-layout";
import { requestStart } from "@/lib/landing/start";
import { dashFor, roughPath } from "@/lib/rough";
import { Glyph } from "./glyphs";
import { LANDING_THEME } from "./theme";

// The Starting points tree: time runs down the trunk, each event sits on a branch, and cause
// links are branches between events. Each part grows in as it scrolls into view (once).

const NARROW = "(max-width: 767px)";
const supported = (k: PromptKind) => (SUPPORTED_KINDS as readonly string[]).includes(k);
const titleOf = new Map(EVENTS.map((e) => [e.id, e.title]));

function useTreeMode(): TreeMode {
  return useSyncExternalStore(
    (on) => { const mq = matchMedia(NARROW); mq.addEventListener("change", on); return () => mq.removeEventListener("change", on); },
    () => (matchMedia(NARROW).matches ? "narrow" : "wide"),
    () => "wide",
  );
}

export function TreeTimeline({ kind }: { kind: PromptKind | null }) {
  const mode = useTreeMode();
  const tree = useMemo(() => layoutTree(EVENTS, LINKS, mode), [mode]);
  const [open, setOpen] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null); // the cause link under the pointer
  const [seen, setSeen] = useState<ReadonlySet<string>>(() => new Set());
  const listRef = useRef<HTMLOListElement>(null);
  const index = useMemo(() => new Map(EVENTS.map((e, i) => [e.id, i])), []);

  // Grow each branch in as it comes into view.
  useEffect(() => {
    const items = Array.from(listRef.current?.querySelectorAll<HTMLElement>("[data-event]") ?? []);
    const io = new IntersectionObserver((entries) => {
      const fresh = entries.filter((e) => e.isIntersecting).map((e) => (e.target as HTMLElement).dataset.event!);
      if (!fresh.length) return;
      fresh.forEach((id) => io.unobserve(listRef.current!.querySelector(`[data-event="${id}"]`)!));
      setSeen((s) => new Set([...s, ...fresh]));
    }, { rootMargin: "0px 0px -12% 0px" });
    items.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const onKey = (e: KeyboardEvent<HTMLOListElement>) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    const cards = Array.from(listRef.current?.querySelectorAll<HTMLButtonElement>(".tr-card") ?? []);
    const i = cards.findIndex((b) => b === document.activeElement);
    if (i < 0) return;
    e.preventDefault();
    cards[Math.max(0, Math.min(cards.length - 1, i + (e.key === "ArrowDown" ? 1 : -1)))].focus();
  };

  // From one event's card to another's: close this one, bring that one into view, open it.
  const jump = (id: string) => {
    setOpen(null);
    const card = listRef.current?.querySelector<HTMLButtonElement>(`[data-event="${id}"] .tr-card`);
    card?.scrollIntoView({ block: "center", behavior: "smooth" });
    setTimeout(() => { card?.focus({ preventScroll: true }); setOpen(id); }, 450);
  };

  const { geo } = tree;
  const rowOf = new Map(tree.rows.map((r) => [r.id, r]));
  return (
    <div className="tr" data-mode={mode} style={{ height: tree.height, ["--tree-w" as string]: `${geo.width}px`, ["--trunk-x" as string]: `${geo.trunkX}px`, ["--reach" as string]: `${geo.reach}px` }}>
      <svg className="tr-lines" width={geo.width} height={tree.height} aria-hidden>
        {/* the trunk, one segment per event so it can grow down as you read */}
        {tree.rows.slice(1).map((r, i) => (
          <line key={r.id} className="tr-seg" data-in={seen.has(r.id) ? "1" : undefined}
            x1={geo.trunkX} y1={tree.rows[i].y} x2={geo.trunkX} y2={r.y} pathLength={1} />
        ))}
        {tree.breaks.map((b) => (
          <g key={b.y} className="tr-break">
            <rect x={geo.trunkX - 8} y={b.y - 9} width={16} height={18} />
            <text x={geo.trunkX} y={b.y + 5} textAnchor="middle">≈</text>
          </g>
        ))}
        {tree.twigs.map((t) => (
          <path key={t.id} className="tr-twig" data-in={seen.has(t.id) ? "1" : undefined} d={t.d} pathLength={1} />
        ))}
        {tree.links.map((l) => {
          const c = LINK_CONFIDENCE[l.confidence];
          const on = seen.has(l.to) && seen.has(l.from);
          const lit = open === l.from || open === l.to;
          const label = l.confidence === "contested" ? `debated: ${l.label}` : l.label;
          return (
            <g key={`${l.from}-${l.to}`} className={`tr-link is-${l.confidence}`} data-in={on ? "1" : undefined} data-lit={lit ? "1" : undefined}
              onMouseEnter={() => setHover(`${l.from}-${l.to}`)} onMouseLeave={() => setHover(null)}>
              <title>{`${titleOf.get(l.from)} → ${titleOf.get(l.to)}: ${label}`}</title>
              {c === "C"
                ? roughPath(l.d, `${l.from}-${l.to}`).map((p, k) => <path key={k} d={p} />)
                : <path d={l.d} strokeDasharray={dashFor(c)} />}
              <path d={l.d} className="tr-link-hit" />
            </g>
          );
        })}
      </svg>

      <ol ref={listRef} className="tr-list" onKeyDown={onKey}>
        {EVENTS.map((e) => {
          const r = rowOf.get(e.id)!;
          return (
            <TreeEvent
              key={e.id} e={e} y={r.y} side={r.side} i={index.get(e.id)!}
              shown={seen.has(e.id)} open={open === e.id} onOpen={(o) => setOpen(o ? e.id : null)}
              kind={kind} onJump={jump}
            />
          );
        })}
      </ol>

      {/* Link labels sit above the cards, so a long one can cross a card's edge and stay readable. */}
      {mode === "wide" && (
        <svg className="tr-lines tr-labels" width={geo.width} height={tree.height} aria-hidden>
          {tree.links.map((l) => {
            const id = `${l.from}-${l.to}`;
            const showIt = hover === id || open === l.from || open === l.to;
            return (
              <text key={id} className={`tr-link-label is-${l.confidence}`} data-on={showIt ? "1" : undefined}
                x={l.tip[0] + (l.side === "left" ? -6 : 6)} y={l.tip[1]} textAnchor={l.side === "left" ? "end" : "start"}>
                {l.confidence === "contested" ? `debated: ${l.label}` : l.label}
              </text>
            );
          })}
        </svg>
      )}
    </div>
  );
}

function TreeEvent({ e, y, side, i, shown, open, onOpen, kind, onJump }: {
  e: TimelineEvent; y: number; side: "left" | "right"; i: number; shown: boolean;
  open: boolean; onOpen: (o: boolean) => void; kind: PromptKind | null; onJump: (id: string) => void;
}) {
  const prompts = e.prompts.filter((p) => supported(p.kind));
  const lit = kind !== null && prompts.some((p) => p.kind === kind);
  const from = LINKS.filter((l) => l.to === e.id);
  const to = LINKS.filter((l) => l.from === e.id);
  return (
    <li className="tr-item" data-event={e.id} data-side={side} data-in={shown ? "1" : undefined} data-lit={lit ? "1" : undefined}
      style={{ top: y, ["--i" as string]: i }}>
      <span className="tr-node" aria-hidden>
        <svg className="sp-glyph" data-glyph={e.glyph} viewBox="-11 -11 22 22" width="28" height="28">
          <circle r="10.5" className="sp-glyph-bg" />
          <Glyph name={e.glyph} color="currentColor" r={8} />
        </svg>
      </span>
      <Popover.Root open={open} onOpenChange={onOpen}>
        <Popover.Trigger asChild>
          <button type="button" className="tr-card" data-open={open ? "1" : undefined} aria-label={`${e.date}: ${e.title}`}>
            <span className="tr-date">{e.date}</span>
            <span className="tr-title">{e.title}</span>
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content side="bottom" align={side === "left" ? "end" : "start"} sideOffset={8} collisionPadding={16} className={`${LANDING_THEME} sp-card fade-up`}>
            <p className="font-mono text-[12px] text-[color:var(--lp-muted)]">{e.date}</p>
            <h3 className="lp-display mt-0.5 text-[21px] font-medium leading-[1.2]">{e.title}</h3>
            <p className="mt-1.5 font-sans text-[15px] leading-[1.5] text-[color:var(--lp-ink)]">{e.blurb}</p>
            <ul className="mt-3 grid gap-1.5">
              {prompts.map((p) => (
                <li key={p.text}>
                  <button
                    type="button"
                    className="sp-chip"
                    data-lit={kind === p.kind ? "1" : undefined}
                    onClick={() => { onOpen(false); requestStart({ q: p.text, kind: p.kind, ref: e.id }); }}
                  >
                    <span className="sp-chip-kind">{PROMPT_KINDS[p.kind].label}</span>
                    <span className="font-sans text-[15px] leading-[1.35]">{p.text}</span>
                  </button>
                </li>
              ))}
            </ul>
            {(from.length > 0 || to.length > 0) && (
              <div className="tr-causes">
                <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-[color:var(--lp-muted)]">Cause and consequence</p>
                <ul className="mt-1.5 grid gap-1">
                  {from.map((l) => (
                    <li key={l.from}>
                      <button type="button" className="tr-cause" data-c={l.confidence} onClick={() => onJump(l.from)}>
                        <span aria-hidden>↑</span> {titleOf.get(l.from)}: <em>{l.label}</em>
                        <span className="tr-conf">{l.confidence === "contested" ? "debated" : l.confidence}</span>
                      </button>
                    </li>
                  ))}
                  {to.map((l) => (
                    <li key={l.to}>
                      <button type="button" className="tr-cause" data-c={l.confidence} onClick={() => onJump(l.to)}>
                        <span aria-hidden>↓</span> {titleOf.get(l.to)}: <em>{l.label}</em>
                        <span className="tr-conf">{l.confidence === "contested" ? "debated" : l.confidence}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <Popover.Arrow className="fill-white" width={14} height={7} />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </li>
  );
}
