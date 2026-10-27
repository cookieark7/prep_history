"use client";

import { useMemo, useState } from "react";
import type { LineageBlock as LineageT } from "@/lib/contracts";
import { layoutLineage, type PositionedPerson } from "@/lib/layout/lineage-layout";
import { formatRange } from "@/lib/layout/years";
import { roughPath } from "@/lib/rough";
import { useWorkspace } from "@/lib/store/workspace";
import { ConfidenceDot } from "@/components/ui/marks";
import { CONFIDENCE_LABEL } from "@/lib/confidence";
import { Icon } from "@/components/ui/icons";
import { scrollToBlock } from "./Markdown";

type Person = LineageT["people"][number];
type Link = LineageT["links"][number];
const PAD = 22;

/** Everyone below `id` through parent links. */
function descendants(id: string, links: Link[]): Set<string> {
  const out = new Set<string>();
  const stack = [id];
  while (stack.length) {
    const cur = stack.pop()!;
    for (const l of links) if (l.rel === "parent" && l.from === cur && !out.has(l.to)) { out.add(l.to); stack.push(l.to); }
  }
  return out;
}

/** Shortest path between two people over any link, ignoring direction. */
function personPath(a: string, z: string, links: Link[]): Set<string> {
  const prev = new Map<string, string>();
  const q = [a];
  const seen = new Set([a]);
  while (q.length) {
    const cur = q.shift()!;
    if (cur === z) break;
    for (const l of links) {
      const next = l.from === cur ? l.to : l.to === cur ? l.from : null;
      if (next && !seen.has(next)) { seen.add(next); prev.set(next, cur); q.push(next); }
    }
  }
  if (!seen.has(z)) return new Set([a, z]);
  const out = new Set([z]);
  let cur = z;
  while (cur !== a) { cur = prev.get(cur)!; out.add(cur); }
  return out;
}

export function LineageBlock({ block }: { block: LineageT }) {
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const [focusMode, setFocusMode] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const flash = useWorkspace((s) => (s.flash?.id === block.id ? s.flash : null));

  const hidden = useMemo(() => {
    const h = new Set<string>();
    for (const c of collapsed) descendants(c, block.links).forEach((d) => h.add(d));
    return h;
  }, [collapsed, block.links]);
  const people = useMemo(() => block.people.filter((p) => !hidden.has(p.id)), [block.people, hidden]);
  const links = useMemo(() => block.links.filter((l) => !hidden.has(l.from) && !hidden.has(l.to)), [block.links, hidden]);
  const lay = useMemo(() => layoutLineage(people, links), [people, links]);

  const onPath = focusMode && picked.length === 2 ? personPath(picked[0], picked[1], links) : null;
  const dim = (id: string) => (onPath ? !onPath.has(id) : false);
  const successionOrder = block.links
    .filter((l) => l.rel === "succeeded")
    .sort((a, b) => (block.people.find((p) => p.id === a.to)?.start ?? 0) - (block.people.find((p) => p.id === b.to)?.start ?? 0));
  const childCount = (id: string) => block.links.filter((l) => l.rel === "parent" && l.from === id).length;
  const sources = (id: string) => [...new Set(block.links.filter((l) => l.to === id && (l.rel === "parent" || l.rel === "succeeded")).map((l) => l.from))];

  const W = lay.width + PAD * 2;
  const H = lay.height + PAD * 2 + 10;
  const box = (id: string) => {
    const p = lay.byId[id];
    return p ? { ...p, x: p.x + PAD, y: p.y + PAD } : null;
  };

  const onPerson = (id: string) => {
    if (focusMode) {
      setPicked((cur) => (cur.length >= 2 ? [id] : cur.includes(id) ? cur : [...cur, id]));
      return;
    }
    setSelected(selected === id ? null : id);
  };

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-2 text-[12px] text-muted">
        <button
          type="button"
          aria-pressed={focusMode}
          onClick={() => { setFocusMode(!focusMode); setPicked([]); }}
          className={`inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 ${focusMode ? "border-accent text-accent" : "border-rule text-text hover:border-rule-strong"}`}
        >
          <Icon.path size={13} /> Focus path
        </button>
        {focusMode && <span>{picked.length < 2 ? `Pick ${2 - picked.length} ${picked.length ? "more person" : "people"}` : "Showing the path between them"}</span>}
        {collapsed.length > 0 && (
          <button type="button" onClick={() => setCollapsed([])} className="text-accent hover:underline">Expand all</button>
        )}
        <LineageLegend />
      </div>

      <div className="scroll-thin overflow-x-auto rounded-[2px] border border-rule bg-surface">
        <div className="relative mx-auto" style={{ width: W, height: H }}>
          <svg width={W} height={H} className="absolute inset-0" aria-hidden>
            <defs>
              <marker id="lin-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M0,1 L9,5 L0,9" fill="none" stroke="var(--accent)" strokeWidth={1.8} strokeLinecap="round" />
              </marker>
            </defs>
            {links.map((l, i) => {
              const a = box(l.from), b = box(l.to);
              if (!a || !b) return null;
              const opacity = dim(l.from) || dim(l.to) ? 0.15 : 1;
              return <LinkStroke key={`${l.from}-${l.to}-${l.rel}-${i}`} link={l} a={a} b={b} opacity={opacity} n={successionOrder.indexOf(l) + 1} />;
            })}
          </svg>
          {people.map((p) => {
            const b = box(p.id)!;
            const isSel = selected === p.id || picked.includes(p.id);
            const lit = flash?.node === p.id;
            const multi = sources(p.id).length > 1;
            const kids = childCount(p.id);
            const isCollapsed = collapsed.includes(p.id);
            return (
              <div key={p.id} className="absolute" style={{ left: b.x, top: b.y, width: b.w, height: b.h, opacity: dim(p.id) ? 0.25 : 1, transition: "opacity 200ms" }}>
                <button
                  type="button"
                  onClick={() => onPerson(p.id)}
                  className={`flex h-full w-full flex-col justify-center rounded-[3px] border bg-surface px-2.5 text-left hover:border-rule-strong ${isSel ? "border-accent ring-2 ring-accent/30" : "border-rule"} ${lit ? "flash" : ""}`}
                  aria-pressed={isSel}
                  aria-label={`${p.name}, ${formatRange(p.start, p.end, p.approx)}`}
                >
                  <span className="truncate font-heading text-[14.5px] font-semibold leading-tight">{p.name}</span>
                  <span className="tnum text-[11px] text-muted">{formatRange(p.start, p.end, p.approx) || "dates unknown"}</span>
                </button>
                {multi && <span className="absolute -top-2 left-2 rounded-[2px] bg-surface px-1 text-[10px] italic text-muted" title={`Reached by ${sources(p.id).length} paths`}>also here</span>}
                {kids > 0 && (
                  <button
                    type="button"
                    onClick={() => setCollapsed((c) => (c.includes(p.id) ? c.filter((x) => x !== p.id) : [...c, p.id]))}
                    className="absolute -bottom-2.5 left-1/2 grid h-5 min-w-5 -translate-x-1/2 place-items-center rounded-full border border-rule bg-surface px-1 text-[10px] text-muted hover:text-text"
                    aria-label={isCollapsed ? `Expand ${p.name}'s branch` : `Collapse ${p.name}'s branch`}
                    title={isCollapsed ? "Expand branch" : "Collapse branch"}
                  >
                    {isCollapsed ? `+${descendants(p.id, block.links).size}` : "−"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {selected && <PersonDrawer block={block} person={block.people.find((p) => p.id === selected)!} onClose={() => setSelected(null)} />}
    </div>
  );
}

function LinkStroke({ link, a, b, opacity, n }: { link: Link; a: PositionedPerson; b: PositionedPerson; opacity: number; n: number }) {
  const id = `${link.from}-${link.to}-${link.rel}`;
  const dash = link.confidence === "L" ? "5 4" : undefined;
  const rough = link.confidence === "C";
  const sameRow = Math.abs(a.y - b.y) < 2;
  const left = a.x < b.x ? a : b;
  const right = a.x < b.x ? b : a;

  const draw = (d: string, stroke: string, w: number, extra: { dash?: string; marker?: string; forceRough?: boolean } = {}) =>
    rough || extra.forceRough
      ? roughPath(d, id, extra.forceRough ? 1.2 : 1.4).map((p, i) => (
          <path key={i} d={p} fill="none" stroke={stroke} strokeWidth={w} strokeDasharray={extra.dash} markerEnd={i === 0 ? extra.marker : undefined} />
        ))
      : <path d={d} fill="none" stroke={stroke} strokeWidth={w} strokeDasharray={extra.dash ?? dash} markerEnd={extra.marker} />;

  if (link.rel === "parent") {
    const sx = a.x + a.w / 2, sy = a.y + a.h, tx = b.x + b.w / 2, ty = b.y;
    const my = (sy + ty) / 2;
    return <g opacity={opacity}>{draw(`M${sx},${sy} V${my} H${tx} V${ty}`, "var(--muted)", 1.2)}</g>;
  }
  if (link.rel === "spouse") {
    if (sameRow) {
      const x1 = left.x + left.w, x2 = right.x, y = a.y + a.h / 2;
      return (
        <g opacity={opacity} stroke="var(--muted)" strokeWidth={1.2}>
          <line x1={x1} x2={x2} y1={y - 2} y2={y - 2} strokeDasharray={dash} />
          <line x1={x1} x2={x2} y1={y + 2} y2={y + 2} strokeDasharray={dash} />
        </g>
      );
    }
    const d = `M${a.x + a.w / 2},${a.y + a.h} L${b.x + b.w / 2},${b.y}`;
    return <g opacity={opacity}>{draw(d, "var(--muted)", 1.2)}</g>;
  }
  if (link.rel === "succeeded") {
    let d: string, mx: number, my: number;
    if (sameRow) {
      const sx = a.x + a.w / 2, tx = b.x + b.w / 2, y = a.y;
      d = `M${sx},${y} C${sx},${y - 34} ${tx},${y - 34} ${tx},${y - 2}`;
      mx = (sx + tx) / 2; my = y - 26;
    } else {
      const sx = a.x + a.w - 18, sy = a.y + a.h, tx = b.x + b.w - 18, ty = b.y;
      const bow = 34;
      d = `M${sx},${sy} C${sx + bow},${sy + 26} ${tx + bow},${ty - 26} ${tx},${ty - 1}`;
      mx = (sx + tx) / 2 + bow * 0.75; my = (sy + ty) / 2;
    }
    return (
      <g opacity={opacity}>
        {draw(d, "var(--accent)", 1.5, { marker: "url(#lin-arrow)" })}
        <g transform={`translate(${mx},${my})`}>
          <circle r={8} fill="var(--surface)" stroke="var(--accent)" strokeWidth={1.2} />
          <text textAnchor="middle" dy="3.5" fontSize={10} fontFamily="var(--font-mono)" fill="var(--accent)">{n}</text>
        </g>
      </g>
    );
  }
  // claimed: dashed hand-drawn line with a small "claim" marker
  let d: string, mx: number, my: number;
  if (sameRow) {
    const sx = a.x + a.w / 2, tx = b.x + b.w / 2, y = a.y + a.h;
    const depth = 18 + Math.min(30, Math.abs(tx - sx) / 10);
    d = `M${sx},${y} C${sx},${y + depth} ${tx},${y + depth} ${tx},${y}`;
    mx = (sx + tx) / 2; my = y + depth * 0.75;
  } else {
    const down = b.y > a.y;
    const sx = a.x + a.w / 2, sy = down ? a.y + a.h : a.y, tx = b.x + b.w / 2, ty = down ? b.y : b.y + b.h;
    d = `M${sx},${sy} C${sx},${(sy + ty) / 2} ${tx},${(sy + ty) / 2} ${tx},${ty}`;
    mx = (sx + tx) / 2; my = (sy + ty) / 2;
  }
  return (
    <g opacity={opacity}>
      {draw(d, "var(--brick)", 1.3, { dash: "5 4", forceRough: true })}
      <g transform={`translate(${mx},${my})`}>
        <rect x={-15} y={-7} width={30} height={14} rx={2} fill="var(--surface)" stroke="var(--brick)" strokeWidth={0.8} />
        <text textAnchor="middle" dy="3.5" fontSize={9} fill="var(--brick)">claim</text>
      </g>
    </g>
  );
}

function LineageLegend() {
  return (
    <span className="ml-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px]">
      <span className="inline-flex items-center gap-1"><svg width="20" height="8"><path d="M1,4 H19" stroke="var(--accent)" strokeWidth="1.5" /></svg>succeeded (numbered)</span>
      <span className="inline-flex items-center gap-1"><svg width="20" height="8"><path d="M1,4 H19" stroke="var(--muted)" strokeWidth="1.2" /></svg>parent</span>
      <span className="inline-flex items-center gap-1"><svg width="20" height="8"><path d="M1,2 H19 M1,6 H19" stroke="var(--muted)" strokeWidth="1.2" /></svg>spouse</span>
      <span className="inline-flex items-center gap-1"><svg width="20" height="8"><path d="M1,5 C6,1 12,8 19,3" fill="none" stroke="var(--brick)" strokeWidth="1.3" strokeDasharray="4 3" /></svg>claim</span>
    </span>
  );
}

const REL_WORDS: Record<Link["rel"], [string, string]> = {
  parent: ["Parent of", "Child of"],
  spouse: ["Spouse of", "Spouse of"],
  succeeded: ["Succeeded by", "Succeeded"],
  claimed: ["Claim contested by", "Contested the claim of"],
};

function PersonDrawer({ block, person, onClose }: { block: LineageT; person: Person; onClose: () => void }) {
  const blocks = useWorkspace((s) => s.blocks);
  const flashBlock = useWorkspace((s) => s.flashBlock);
  const name = (id: string) => block.people.find((p) => p.id === id)?.name ?? id;
  const rels = block.links
    .filter((l) => l.from === person.id || l.to === person.id)
    .map((l) => ({ l, word: REL_WORDS[l.rel][l.from === person.id ? 0 : 1], other: l.from === person.id ? l.to : l.from }));
  const timelineMatch = (label: string) => {
    const key = label.toLowerCase();
    for (const b of blocks) {
      if (b.type !== "timeline") continue;
      const e = b.events.find((ev) => ev.label.toLowerCase() === key) ??
        b.events.find((ev) => ev.label.toLowerCase().includes(key) || key.includes(ev.label.toLowerCase()));
      if (e) return { blockId: b.id, eventId: e.id };
    }
    return null;
  };
  return (
    <div className="fade-up mt-3 rounded-[2px] border border-rule bg-surface p-4">
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <p className="font-heading text-[19px] font-semibold">{person.name}</p>
          <p className="tnum text-[12px] text-muted">{formatRange(person.start, person.end, person.approx) || "dates unknown"}{person.approx && " · approximate"}</p>
        </div>
        <button type="button" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-md text-muted hover:bg-hover" aria-label="Close"><Icon.close size={14} /></button>
      </div>
      {person.key_events.length > 0 && (
        <>
          <p className="mb-1 mt-3 text-[11.5px] font-medium uppercase tracking-wide text-muted">Key events</p>
          <ul className="space-y-1 text-[13.5px]">
            {person.key_events.map((k) => {
              const m = timelineMatch(k);
              return (
                <li key={k}>
                  {m ? (
                    <button type="button" className="inline-flex items-center gap-1 text-accent hover:underline" onClick={() => scrollToBlock(m.blockId, m.eventId, flashBlock)}>
                      <Icon.timeline size={12} /> {k}
                    </button>
                  ) : <span>{k}</span>}
                </li>
              );
            })}
          </ul>
        </>
      )}
      {rels.length > 0 && (
        <ul className="mt-3 space-y-1 border-t border-rule pt-2 text-[13px]">
          {rels.map(({ l, word, other }, i) => (
            <li key={i} className="flex items-center gap-1.5">
              <ConfidenceDot c={l.confidence} />
              <span className="text-muted">{word}</span> {name(other)}
              {l.confidence !== "E" && <span className="text-[11.5px] text-muted">({CONFIDENCE_LABEL[l.confidence]})</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
