"use client";

import { Icon } from "@/components/ui/icons";
import { Plate } from "@/components/landing/Plate";
import { BEATS } from "@/content/landing/beats";
import type { Station } from "@/content/syllabus";

// The same station, seen through each lens. The lesson picks its blocks from the question.
export const LENSES: { id: string; label: string; ask: (s: Station) => string }[] = [
  { id: "story", label: "Story", ask: (s) => `${s.name} (${s.dates}): tell it as a story` },
  { id: "timeline", label: "Timeline", ask: (s) => `${s.name} (${s.dates}): a timeline of the main events` },
  { id: "people", label: "People", ask: (s) => `${s.name} (${s.dates}): the key people and what each did` },
  { id: "places", label: "Places", ask: (s) => `${s.name} (${s.dates}): the key places and why they mattered` },
  { id: "causes", label: "Cause and effect", ask: (s) => `${s.name} (${s.dates}): what caused its main turning points` },
];

/** A station's way in: its plate, three starter questions, and the five lenses. Used on the home page and the app home. */
export function StationDetails({ station: s, onAsk }: { station: Station; onAsk: (message: string, topic: string) => void }) {
  const beat = s.plate ? BEATS.find((b) => b.id === s.plate) : undefined;
  return (
    <div className={`grid gap-6 ${beat ? "sm:grid-cols-[minmax(0,220px)_minmax(0,1fr)]" : ""}`}>
      {beat && (
        <figure className="max-w-[320px]">
          <Plate id={beat.id} crop="wide" loading="lazy" className="block aspect-video w-full rounded-[3px] object-cover" />
          <figcaption className="mt-1.5 text-[12.5px] text-muted">Plate: {beat.title}</figcaption>
        </figure>
      )}
      <div className="min-w-0">
        <h3 className="text-[16px] font-semibold">Start with a question</h3>
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
