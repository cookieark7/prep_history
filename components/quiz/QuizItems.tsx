"use client";

import { useState } from "react";
import type { ChronologyItem, MatchItem, McqItem } from "@/lib/contracts";
import { checkChronology, seededShuffle } from "@/lib/quiz";
import { formatYear } from "@/lib/layout/years";
import { Icon } from "@/components/ui/icons";

type Done = (correct: boolean) => void;

const row = "flex min-h-11 w-full items-center gap-3 rounded-md border px-3.5 py-2 text-left text-[15.5px] transition-colors";

/* ---------------- multiple choice ---------------- */
export function McqView({ item, onDone, locked }: { item: McqItem; onDone: Done; locked: string | null }) {
  const [chosen, setChosen] = useState<string | null>(locked);
  const done = chosen != null;
  return (
    <ul className="space-y-2" role="list">
      {item.options.map((o, i) => {
        const state = !done ? "idle" : o.id === item.answer_id ? "right" : o.id === chosen ? "wrong" : "other";
        return (
          <li key={o.id}>
            <button
              type="button"
              disabled={done}
              data-option={i + 1}
              onClick={() => { setChosen(o.id); onDone(o.id === item.answer_id); }}
              className={`${row} ${state === "idle" ? "border-rule bg-surface hover:border-text" : state === "right" ? "border-ok bg-surface" : state === "wrong" ? "border-brick bg-surface" : "border-rule text-muted"}`}
            >
              <span className="tnum grid h-6 w-6 shrink-0 place-items-center rounded-full border border-rule text-[12px] text-muted">
                {state === "right" ? <Icon.check size={12} className="text-ok" /> : state === "wrong" ? <Icon.cross size={12} className="text-brick" /> : i + 1}
              </span>
              {o.text}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/* ---------------- chronology: drag or tap-to-sequence ---------------- */
export function ChronologyView({ item, onDone }: { item: ChronologyItem; onDone: Done }) {
  const [order, setOrder] = useState(() => seededShuffle(item.events.map((e) => e.id), item.id));
  const [placed, setPlaced] = useState(0); // how many have been tapped into sequence
  const [drag, setDrag] = useState<string | null>(null);
  const [result, setResult] = useState<boolean | null>(null);
  const ev = (id: string) => item.events.find((e) => e.id === id)!;
  const sorted = [...item.events].sort((a, b) => a.year - b.year);
  const era = item.events.some((e) => e.year < 0);

  const move = (from: number, to: number) => {
    setOrder((o) => {
      const n = [...o];
      const [x] = n.splice(from, 1);
      n.splice(to, 0, x);
      return n;
    });
  };
  const tap = (id: string) => {
    if (result != null) return;
    const i = order.indexOf(id);
    if (i < placed) return; // already sequenced
    move(i, placed);
    setPlaced((p) => p + 1);
  };
  const check = () => {
    const ok = checkChronology(order, item.events);
    setResult(ok);
    onDone(ok);
  };

  return (
    <div>
      <p className="mb-3 text-[12.5px] text-muted">Tap the events in order, or drag them. Earliest first.</p>
      <ol className="space-y-2">
        {order.map((id, i) => {
          const e = ev(id);
          const rightPos = sorted.findIndex((s) => s.year === e.year) <= i && sorted.findLastIndex((s) => s.year === e.year) >= i;
          return (
            <li
              key={id}
              draggable={result == null}
              onDragStart={() => setDrag(id)}
              onDragOver={(evt) => {
                evt.preventDefault();
                if (drag && drag !== id) move(order.indexOf(drag), i);
              }}
              onDragEnd={() => { setDrag(null); setPlaced((p) => Math.max(p, 0)); }}
              className={`${row} ${result == null ? (i < placed ? "border-text bg-surface" : "border-rule bg-surface") : rightPos ? "border-ok bg-surface" : "border-brick bg-surface"} ${drag === id ? "opacity-50" : ""}`}
            >
              <span className="cursor-grab text-muted" aria-hidden><Icon.grip size={14} /></span>
              <button type="button" onClick={() => tap(id)} className="flex flex-1 items-center gap-3 text-left" disabled={result != null}>
                <span className="tnum grid h-6 w-6 shrink-0 place-items-center rounded-full border border-rule text-[12px] text-muted">{i < placed || result != null ? i + 1 : "·"}</span>
                <span className="flex-1">{e.label}</span>
                {result != null && <span className="tnum text-[12px] text-muted">{formatYear(e.year, { era })}</span>}
              </button>
              {result == null && (
                <span className="flex flex-col">
                  <button type="button" aria-label={`Move ${e.label} up`} disabled={i === 0} onClick={() => move(i, i - 1)} className="grid h-5 w-6 place-items-center text-muted hover:text-text disabled:opacity-30"><Icon.chevronUp size={12} /></button>
                  <button type="button" aria-label={`Move ${e.label} down`} disabled={i === order.length - 1} onClick={() => move(i, i + 1)} className="grid h-5 w-6 place-items-center text-muted hover:text-text disabled:opacity-30"><Icon.chevronDown size={12} /></button>
                </span>
              )}
            </li>
          );
        })}
      </ol>
      {result == null ? (
        <div className="mt-4 flex gap-2">
          <button type="button" data-primary onClick={check} className="h-10 rounded-md bg-text px-4 text-[14px] text-bg">Check order</button>
          {placed > 0 && <button type="button" onClick={() => setPlaced(0)} className="h-10 rounded-md px-3 text-[13px] text-muted hover:bg-hover">Reset taps</button>}
        </div>
      ) : (
        !result && (
          <p className="mt-3 text-[13.5px] text-muted">
            Correct order: {sorted.map((e) => `${e.label} (${formatYear(e.year, { era })})`).join(" → ")}
          </p>
        )
      )}
    </div>
  );
}

/* ---------------- match: tap to pair ---------------- */
export function MatchView({ item, onDone }: { item: MatchItem; onDone: Done }) {
  const rights = seededShuffle(item.pairs.map((p) => p.right), item.id);
  const [pairs, setPairs] = useState<Record<string, string>>({}); // left -> right
  const [active, setActive] = useState<string | null>(null);
  const [result, setResult] = useState<boolean | null>(null);
  const truth = Object.fromEntries(item.pairs.map((p) => [p.left, p.right]));
  const leftFor = (r: string) => Object.entries(pairs).find(([, v]) => v === r)?.[0];
  const num = (left: string) => item.pairs.findIndex((p) => p.left === left) + 1;

  const pickLeft = (l: string) => {
    if (result != null) return;
    if (pairs[l]) { const n = { ...pairs }; delete n[l]; setPairs(n); setActive(l); return; }
    setActive(l); // tapping the active item keeps it selected (the next one auto-activates after a pair)
  };
  const pickRight = (r: string) => {
    if (result != null || !active) return;
    const n = { ...pairs };
    const prev = leftFor(r);
    if (prev) delete n[prev];
    n[active] = r;
    setPairs(n);
    setActive(item.pairs.map((p) => p.left).find((l) => !n[l]) ?? null);
  };
  const check = () => {
    const ok = item.pairs.every((p) => pairs[p.left] === p.right);
    setResult(ok);
    onDone(ok);
  };
  const complete = item.pairs.every((p) => pairs[p.left]);

  return (
    <div>
      <p className="mb-3 text-[12.5px] text-muted">Tap an item on the left, then its match on the right.</p>
      <div className="grid grid-cols-2 gap-3">
        <ul className="space-y-2">
          {item.pairs.map((p) => {
            const st = result == null ? (active === p.left ? "active" : pairs[p.left] ? "paired" : "idle") : pairs[p.left] === truth[p.left] ? "right" : "wrong";
            return (
              <li key={p.left}>
                <button type="button" onClick={() => pickLeft(p.left)} aria-pressed={active === p.left}
                  className={`${row} ${st === "active" ? "border-accent bg-accent-soft" : st === "paired" ? "border-text bg-surface" : st === "right" ? "border-ok bg-surface" : st === "wrong" ? "border-brick bg-surface" : "border-rule bg-surface hover:border-text"}`}>
                  <span className="tnum grid h-6 w-6 shrink-0 place-items-center rounded-full border border-rule text-[12px] text-muted">{pairs[p.left] ? num(p.left) : ""}</span>
                  {p.left}
                </button>
              </li>
            );
          })}
        </ul>
        <ul className="space-y-2">
          {rights.map((r) => {
            const l = leftFor(r);
            return (
              <li key={r}>
                <button type="button" onClick={() => pickRight(r)} disabled={result != null}
                  className={`${row} ${l ? "border-text bg-surface" : active ? "border-rule bg-surface hover:border-accent" : "border-rule bg-surface"}`}>
                  <span className="tnum grid h-6 w-6 shrink-0 place-items-center rounded-full border border-rule text-[12px] text-muted">{l ? num(l) : ""}</span>
                  <span className="text-[14.5px]">{r}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      {result == null ? (
        <button type="button" data-primary disabled={!complete} onClick={check} className="mt-4 h-10 rounded-md bg-text px-4 text-[14px] text-bg disabled:bg-rule disabled:text-muted">Check pairs</button>
      ) : (
        !result && (
          <ul className="mt-3 space-y-0.5 text-[13.5px] text-muted">
            {item.pairs.map((p) => <li key={p.left}>{p.left} → {p.right}</li>)}
          </ul>
        )
      )}
    </div>
  );
}
