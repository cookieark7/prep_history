"use client";

import { Icon } from "@/components/ui/icons";
import { Plate } from "@/components/landing/Plate";
import { BEATS } from "@/content/landing/beats";
import type { Station } from "@/content/syllabus";
import { seriesOf, type SeriesPart } from "@/content/series";

// The same station, seen through each lens. The lesson picks its blocks from the question.
export const LENSES: { id: string; label: string; ask: (s: Station) => string }[] = [
  { id: "story", label: "Story", ask: (s) => `${s.name} (${s.dates}): tell it as a story` },
  { id: "timeline", label: "Timeline", ask: (s) => `${s.name} (${s.dates}): a timeline of the main events` },
  { id: "people", label: "People", ask: (s) => `${s.name} (${s.dates}): the key people and what each did` },
  { id: "places", label: "Places", ask: (s) => `${s.name} (${s.dates}): the key places and why they mattered` },
  { id: "causes", label: "Cause and effect", ask: (s) => `${s.name} (${s.dates}): what caused its main turning points` },
];

export interface SeriesProps {
  /** parts read, keyed "station/part" */
  read: Record<string, true>;
  /** this station's parts with a lesson started */
  started: Set<string>;
  onStart: (p: SeriesPart) => void;
}

/**
 * A station's way in: its plate, its series of parts (on the app home), three starter questions,
 * and the five lenses. Used on the home page and the app home.
 */
export function StationDetails({ station: s, onAsk, series }: { station: Station; onAsk: (message: string, topic: string) => void; series?: SeriesProps }) {
  const beat = s.plate ? BEATS.find((b) => b.id === s.plate) : undefined;
  const parts = series ? seriesOf(s.id) : [];
  const done = series ? parts.filter((p) => series.read[`${s.id}/${p.id}`]).length : 0;
  return (
    <div className={`grid gap-6 ${beat ? "sm:grid-cols-[minmax(0,220px)_minmax(0,1fr)]" : ""}`}>
      {beat && (
        <figure className="max-w-[320px]">
          <Plate id={beat.id} crop="wide" loading="lazy" className="block aspect-video w-full rounded-[3px] object-cover" />
          <figcaption className="mt-1.5 text-[12.5px] text-muted">Plate: {beat.title}</figcaption>
        </figure>
      )}
      <div className="min-w-0">
        {series && parts.length > 0 && (
          <div className="mb-7">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="text-[16px] font-semibold">In {parts.length} parts</h3>
              <p className="text-[13.5px] text-muted tnum">{done} of {parts.length} read</p>
            </div>
            <ol className="mt-2 border-t border-rule">
              {parts.map((p, i) => {
                const isRead = !!series.read[`${s.id}/${p.id}`];
                return (
                  <li key={p.id} className="border-b border-rule">
                    <button type="button" onClick={() => series.onStart(p)} className="group flex min-h-12 w-full items-center gap-3 py-2.5 text-left hover:text-accent">
                      <span className="w-4 shrink-0 text-[14px] text-muted tnum">{i + 1}</span>
                      <span className="min-w-0 flex-1 text-[15.5px]">
                        {p.title} <span className="whitespace-nowrap text-[13.5px] text-muted tnum">{p.dates}</span>
                      </span>
                      {isRead ? (
                        <span className="inline-flex shrink-0 items-center gap-1 text-[13px] font-medium text-ok"><Icon.check size={14} />Read</span>
                      ) : series.started.has(p.id) ? (
                        <span className="shrink-0 text-[13px] text-muted">Started</span>
                      ) : null}
                      <Icon.arrowRight size={15} className="shrink-0 text-muted group-hover:text-accent" />
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>
        )}
        <h3 className="text-[16px] font-semibold">{series && parts.length ? "Or start with a question" : "Start with a question"}</h3>
        <ul className="mt-2 border-t border-rule">
          {s.questions.map((q) => (
            <li key={q} className="border-b border-rule">
              <button type="button" onClick={() => onAsk(q, q)} className="group flex min-h-12 w-full items-center gap-3 py-2.5 text-left text-[15.5px] hover:text-accent">
                <span className="flex-1">{q}</span>
                <Icon.arrowRight size={15} className="shrink-0 text-muted group-hover:text-accent" />
              </button>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-[13.5px] text-muted">Or see the whole period through one lens</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {LENSES.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => onAsk(l.ask(s), `${s.name}: ${l.label.toLowerCase()}`)}
              className="h-9 rounded-md bg-sunk px-3 text-[14px] font-medium transition-transform duration-150 hover:bg-hover active:scale-[0.97]"
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
