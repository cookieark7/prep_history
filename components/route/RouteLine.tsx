"use client";

import type { ReactNode } from "react";
import type { Station } from "@/content/syllabus";
import { formatYear } from "@/lib/layout/years";

// The product's one drawing of time: a line with stations, the current one on a yellow station
// board. Laptops get it across the page; phones and narrow windows get the same line running down
// the left, with the current station's details opening in place.

export const stationMark = (s: Station) => s.mark ?? formatYear(s.from, { era: s.from < 1000 });

type Props = {
  stations: Station[];
  current: string;
  started: Record<string, number>;
  onSelect: (id: string) => void;
  label: string;
};

export function StationDot({ here, started, size }: { here: boolean; started: boolean; size: "sm" | "lg" }) {
  const d = here ? (size === "lg" ? "h-[22px] w-[22px]" : "h-5 w-5") : "h-3.5 w-3.5";
  const fill = here ? "bg-board" : started ? "bg-line" : "bg-bg";
  return <span aria-hidden className={`block shrink-0 rounded-full border-[3px] border-line ${d} ${fill}`} />;
}

/** Across the page: the board slides along the line to the chosen station. */
export function RouteLine({ stations, current, started, onSelect, label }: Props) {
  const n = stations.length;
  const i = Math.max(0, stations.findIndex((s) => s.id === current));
  const at = (k: number) => (k + 0.5) / n;
  const here = stations[i];
  // past about two thirds of the way, the board hangs to the left of its post so it stays on the page
  const flip = at(i) > 0.62;
  const x = flip ? `calc(${at(i)} * 100cqw - 100% + 14px)` : `calc(${at(i)} * 100cqw - 14px)`;

  return (
    <div className="relative h-[178px] [container-type:inline-size]">
      <div aria-hidden className="absolute inset-x-0 top-[100px] h-[3px] bg-line" />
      <div
        aria-hidden
        className="absolute left-0 top-0 max-w-[100cqw] transition-transform duration-[320ms] ease-[var(--ease-in-out)]"
        style={{ transform: `translateX(${x})` }}
      >
        <div className="border-[3px] border-line bg-board px-4 pb-2 pt-2.5 text-board-ink">
          <p className="board-type whitespace-nowrap text-[26px]">{here.name}</p>
          <p className="mt-1 text-[14px] font-bold tnum">{here.dates}</p>
        </div>
        <div className={`h-[24px] w-[3px] bg-line ${flip ? "ml-auto mr-[12.5px]" : "ml-[12.5px]"}`} />
      </div>
      <ol aria-label={label} className="absolute inset-x-0 top-[87.5px]">
        {stations.map((s, k) => (
          <li key={s.id} className="absolute -translate-x-1/2" style={{ left: `${at(k) * 100}%` }}>
            <button
              type="button"
              aria-pressed={k === i}
              onClick={() => onSelect(s.id)}
              className="group flex w-[6.75rem] flex-col items-center rounded-md pb-1.5 text-center"
            >
              <span className="grid h-7 place-items-center">
                <StationDot here={k === i} started={!!started[s.id]} size="lg" />
              </span>
              <span className={`mt-1.5 text-[13.5px] leading-tight ${k === i ? "font-bold" : "font-semibold group-hover:underline group-hover:underline-offset-2"}`}>{s.short}</span>
              <span className="mt-0.5 text-[12.5px] text-muted tnum">{stationMark(s)}</span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Down the left edge: the same stations as a list; the current one wears the board and opens. */
export function RouteList({ stations, current, started, onSelect, label, details }: Props & { details: (s: Station) => ReactNode }) {
  return (
    <ol aria-label={label} className="relative">
      <span aria-hidden className="absolute bottom-5 left-[14px] top-5 w-[3px] bg-line" />
      {stations.map((s) => {
        const here = s.id === current;
        return (
          <li key={s.id} className="relative">
            {here ? (
              <div className="py-2">
                <div className="flex items-start gap-3">
                  <span className="grid h-[52px] w-8 shrink-0 place-items-center"><StationDot here started={!!started[s.id]} size="sm" /></span>
                  <div className="min-w-0 flex-1 border-[3px] border-line bg-board px-3 pb-1.5 pt-2 text-board-ink">
                    <p className="board-type text-[22px]">{s.name}</p>
                    <p className="mt-1 text-[13.5px] font-bold tnum">{s.dates}</p>
                  </div>
                </div>
                <div className="ml-11 mt-3">{details(s)}</div>
              </div>
            ) : (
              <button type="button" onClick={() => onSelect(s.id)} className="flex min-h-12 w-full items-center gap-3 rounded-md text-left hover:bg-hover">
                <span className="grid w-8 shrink-0 place-items-center"><StationDot here={false} started={!!started[s.id]} size="sm" /></span>
                <span className="flex-1 text-[15.5px] font-semibold">{s.name}</span>
                <span className="pr-2 text-[13px] text-muted tnum">{stationMark(s)}</span>
              </button>
            )}
          </li>
        );
      })}
    </ol>
  );
}
