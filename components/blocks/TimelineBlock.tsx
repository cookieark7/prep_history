"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { select } from "d3-selection";
import "d3-transition";
import { zoom, zoomIdentity, type ZoomBehavior, type ZoomTransform } from "d3-zoom";
import type { TimelineBlock as TimelineT } from "@/lib/contracts";
import { makeTimelineScale, visibleLabels, yearTicks } from "@/lib/layout/timeline-scale";
import { formatRange, formatYear, fromAstro, toAstro } from "@/lib/layout/years";
import { useWorkspace } from "@/lib/store/workspace";
import { findMentions } from "@/lib/entities";
import { ConfidenceDot } from "@/components/ui/marks";
import { CONFIDENCE_LABEL } from "@/lib/confidence";
import { Icon } from "@/components/ui/icons";
import { scrollToBlock } from "./Markdown";

const AXIS_H = 30;
const MINI_H = 22;

type Ev = TimelineT["events"][number];

export function TimelineBlock({ block, expanded }: { block: TimelineT; expanded?: boolean }) {
  return <TimelineChart block={block} full={!!expanded} />;
}

export function TimelineChart({ block, full = false }: { block: TimelineT; full?: boolean }) {
  const wrap = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const [width, setWidth] = useState(680);
  const [t, setT] = useState<ZoomTransform>(zoomIdentity);
  const [pick, setPick] = useState<{ id: string | null; at: number }>({ id: null, at: 0 });
  const [simul, setSimul] = useState(false);
  const [guide, setGuide] = useState<number | null>(null); // astro year under the guide
  const flash = useWorkspace((s) => (s.flash?.id === block.id ? s.flash : null));

  const trackH = full ? 64 : 58;
  const chartH = AXIS_H + block.tracks.length * trackH + 8;
  const labelW = full ? 140 : 0;
  const plotW = Math.max(200, width - labelW);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.round(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const base = useMemo(() => makeTimelineScale(block.range.from, block.range.to, plotW, 20), [block.range.from, block.range.to, plotW]);
  const xz = useMemo(() => t.rescaleX(base.astro), [t, base]);
  const x = (year: number) => xz(toAstro(year));

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const z = zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 80])
      .extent([[0, 0], [plotW, chartH]])
      .translateExtent([[0, 0], [plotW, chartH]])
      // in the reading column, plain wheel scrolls the page; ctrl/cmd + wheel (or pinch) zooms
      .filter((e: Event) => {
        const ev = e as WheelEvent & MouseEvent;
        if (ev.type === "wheel") return full || ev.ctrlKey || ev.metaKey;
        return !ev.button;
      })
      .on("zoom", (ev) => setT(ev.transform));
    zoomRef.current = z;
    const sel = select(svg);
    sel.call(z);
    return () => { sel.on(".zoom", null); };
  }, [plotW, chartH, full]);

  // a flash from elsewhere (e.g. a lineage key event) selects that event until the next click
  const flashed = flash?.node && flash.nonce !== pick.at && block.events.some((e) => e.id === flash.node) ? flash.node : null;
  const selected = flashed ?? pick.id;
  const setSelected = (id: string | null) => setPick({ id, at: flash?.nonce ?? 0 });

  // ...and brings it into view
  useEffect(() => {
    if (!flash?.node) return;
    const ev = block.events.find((e) => e.id === flash.node);
    if (!ev) return;
    const svg = svgRef.current, z = zoomRef.current;
    if (svg && z) {
      const k = Math.max(t.k, 2);
      const cx = base.astro(toAstro(ev.start));
      select(svg).transition().duration(400).call(z.transform, zoomIdentity.translate(plotW / 2 - cx * k, 0).scale(k));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flash?.nonce]);

  const zoomBy = (f: number) => {
    const svg = svgRef.current, z = zoomRef.current;
    if (svg && z) select(svg).transition().duration(200).call(z.scaleBy, f);
  };
  const reset = () => {
    const svg = svgRef.current, z = zoomRef.current;
    if (svg && z) select(svg).transition().duration(250).call(z.transform, zoomIdentity);
  };

  const domain = xz.domain() as [number, number];
  const ticks = yearTicks(domain, Math.max(3, Math.round(plotW / 110)));
  const era = block.range.from < 0;
  const shown = visibleLabels(block.events, x, full ? 7 : 6.6);
  const sel = block.events.find((e) => e.id === selected) ?? null;
  const guideYear = guide != null ? fromAstro(Math.round(guide)) : null;
  const atGuide = (e: Ev) => guideYear != null && e.start <= guideYear && (e.end ?? e.start) >= guideYear;
  const nearGuide = (e: Ev) => guideYear != null && (atGuide(e) || Math.abs(toAstro(e.start) - guide!) <= (domain[1] - domain[0]) / 60);

  return (
    <div ref={wrap} className="select-none">
      <div className="mb-2 flex flex-wrap items-center gap-2 text-[12px] text-muted">
        <button
          type="button"
          aria-pressed={simul}
          onClick={() => { setSimul(!simul); setGuide(null); }}
          className={`inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 ${simul ? "border-accent text-accent" : "border-rule text-text hover:border-rule-strong"}`}
          title="Draw a vertical guide across all tracks to see what happened at the same time"
        >
          <span className="h-3.5 w-px bg-current" /> Simultaneity
        </button>
        <div className="inline-flex rounded-md border border-rule">
          <button type="button" onClick={() => zoomBy(1.6)} className="grid h-8 w-8 place-items-center hover:bg-hover" aria-label="Zoom in">+</button>
          <button type="button" onClick={() => zoomBy(1 / 1.6)} className="grid h-8 w-8 place-items-center border-l border-rule hover:bg-hover" aria-label="Zoom out">−</button>
          <button type="button" onClick={reset} className="h-8 border-l border-rule px-2 hover:bg-hover">Reset</button>
        </div>
        <span className="tnum text-[12px] ml-auto">{formatYear(fromAstro(Math.round(domain[0])), { era })} – {formatYear(fromAstro(Math.round(domain[1])), { era })}</span>
        {!full && <span className="hidden text-[12px] md:inline">⌘ + scroll to zoom · drag to pan</span>}
      </div>

      <div className="flex rounded-[2px] border border-rule bg-surface">
        {full && (
          <div className="shrink-0 border-r border-rule" style={{ width: labelW, paddingTop: AXIS_H }}>
            {block.tracks.map((tr) => (
              <div key={tr.id} className="flex items-center px-3 text-[12.5px] font-medium text-muted" style={{ height: trackH }}>{tr.label}</div>
            ))}
          </div>
        )}
        <svg
          ref={svgRef}
          width={plotW}
          height={chartH}
          className="block cursor-grab touch-none outline-none active:cursor-grabbing"
          role="img"
          aria-label={`Timeline: ${block.title}, ${formatYear(block.range.from)} to ${formatYear(block.range.to)}`}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "+" || e.key === "=") zoomBy(1.4);
            if (e.key === "-") zoomBy(1 / 1.4);
            const svg = svgRef.current, z = zoomRef.current;
            if (svg && z && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
              e.preventDefault();
              select(svg).call(z.translateBy, e.key === "ArrowLeft" ? 60 / t.k : -60 / t.k, 0);
            }
          }}
          onMouseMove={(e) => {
            if (!simul) return;
            const r = e.currentTarget.getBoundingClientRect();
            setGuide(xz.invert(e.clientX - r.left));
          }}
        >
          {/* axis */}
          <line x1={0} x2={plotW} y1={AXIS_H - 0.5} y2={AXIS_H - 0.5} stroke="var(--rule-strong)" />
          {ticks.map((y) => (
            <g key={y} transform={`translate(${x(y)},0)`}>
              <line y1={AXIS_H - 6} y2={chartH} stroke="var(--rule)" strokeDasharray="2 4" />
              <text y={AXIS_H - 11} textAnchor="middle" fontSize={12} style={{ fontVariantNumeric: "tabular-nums" }} fill="var(--muted)">{formatYear(y, { era })}</text>
            </g>
          ))}
          {/* tracks: markers first, then labels on top so a bar never hides a label */}
          {block.tracks.map((tr, i) => {
            const y0 = AXIS_H + i * trackH;
            return (
              <g key={tr.id}>
                {i > 0 && <line x1={0} x2={plotW} y1={y0} y2={y0} stroke="var(--rule)" />}
                {!full && <text x={6} y={y0 + 12} fontSize={12} fontWeight={600} fill="var(--muted)">{tr.label}</text>}
              </g>
            );
          })}
          {(["marker", "label"] as const).map((pass) => (
            <g key={pass}>
              {block.events.map((e) => {
                const ti = block.tracks.findIndex((tr) => tr.id === e.track);
                const y0 = AXIS_H + ti * trackH;
                const cy = full ? y0 + trackH / 2 + 2 : y0 + trackH - 18;
                const x1 = x(e.start);
                const isRange = e.end != null && e.end !== e.start;
                const x2 = isRange ? x(e.end!) : x1;
                const on = selected === e.id;
                const hi = simul && guideYear != null ? nearGuide(e) : true;
                const r = 2.5 + e.importance * 1.4;
                const half = e.importance + 2;
                if (pass === "label") {
                  if (!(shown.has(e.id) || on)) return null;
                  return (
                    <text
                      key={e.id}
                      x={x1 + (isRange ? 1 : r + 4)} y={isRange ? cy - half - 5 : cy + 4}
                      opacity={hi ? 1 : 0.25}
                      fontSize={e.importance === 3 ? 12.5 : 11.5}
                      fontWeight={e.importance === 3 ? 600 : 400}
                      fill={on ? "var(--accent)" : "var(--text)"}
                      pointerEvents="none"
                      style={{ paintOrder: "stroke", stroke: "var(--surface)", strokeWidth: 4, strokeLinejoin: "round" }}
                    >
                      {e.label}
                    </text>
                  );
                }
                const rangeFill = e.confidence === "E" ? "var(--muted)" : e.confidence === "L" ? "url(#tl-half)" : "var(--surface)";
                const dotFill = e.confidence === "E" ? "var(--text)" : e.confidence === "L" ? "url(#tl-half)" : "var(--surface)";
                return (
                  <g
                    key={e.id}
                    opacity={hi ? 1 : 0.25}
                    className="cursor-pointer"
                    onClick={(ev) => { ev.stopPropagation(); setSelected(on ? null : e.id); }}
                    role="button"
                    aria-label={`${e.label}, ${formatRange(e.start, e.end)}`}
                  >
                    <title>{`${e.label} — ${formatRange(e.start, e.end)} (${CONFIDENCE_LABEL[e.confidence]})`}</title>
                    {isRange ? (
                      <rect
                        x={x1} y={cy - half} width={Math.max(2, x2 - x1)} height={half * 2} rx={1}
                        fill={rangeFill} fillOpacity={e.confidence === "E" ? 0.55 : 1}
                        stroke={on ? "var(--accent)" : "var(--muted)"} strokeWidth={on ? 2 : 1} strokeDasharray={e.confidence === "C" ? "3 2" : undefined}
                      />
                    ) : (
                      <circle cx={x1} cy={cy} r={r} fill={dotFill} stroke="var(--text)" strokeWidth={on ? 2 : 1.1} strokeDasharray={e.confidence === "C" ? "2 1.5" : undefined} />
                    )}
                    {on && !isRange && <circle cx={x1} cy={cy} r={r + 4} fill="none" stroke="var(--accent)" strokeWidth={1.5} />}
                    <rect x={Math.min(x1, x2) - 8} y={cy - 12} width={Math.abs(x2 - x1) + 16} height={24} fill="transparent" />
                  </g>
                );
              })}
            </g>
          ))}
          {simul && guide != null && (
            <g pointerEvents="none">
              <line x1={xz(guide)} x2={xz(guide)} y1={AXIS_H} y2={chartH} stroke="var(--accent)" strokeWidth={1.2} />
              <rect x={xz(guide) - 34} y={2} width={68} height={16} rx={2} fill="var(--accent)" />
              <text x={xz(guide)} y={14} textAnchor="middle" fontSize={12} style={{ fontVariantNumeric: "tabular-nums" }} fill="var(--surface)">{formatYear(guideYear!, { era })}</text>
            </g>
          )}
          <defs>
            <pattern id="tl-half" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="4" height="4" fill="var(--surface)" />
              <rect width="2" height="4" fill="var(--text)" />
            </pattern>
          </defs>
        </svg>
      </div>

      <Minimap block={block} base={base} domain={domain} plotW={plotW} offset={labelW} onCenter={(astro) => {
        const svg = svgRef.current, z = zoomRef.current;
        if (svg && z) select(svg).call(z.translateTo, base.astro(astro), chartH / 2);
      }} />

      {simul && guideYear != null && (
        <p className="mt-2 text-[12.5px] text-muted">
          <span className="tnum text-[12px] text-accent">{formatYear(guideYear, { era })}</span>{" "}
          {block.events.filter(atGuide).map((e) => e.label).join(" · ") || "Nothing on these tracks in that year."}
        </p>
      )}
      {sel && <EventDrawer block={block} ev={sel} onClose={() => setSelected(null)} />}
    </div>
  );
}

function Minimap({ block, base, domain, plotW, offset, onCenter }: {
  block: TimelineT; base: ReturnType<typeof makeTimelineScale>; domain: [number, number]; plotW: number; offset: number; onCenter: (astro: number) => void;
}) {
  const dragging = useRef(false);
  const l = base.astro(domain[0]);
  const r = base.astro(domain[1]);
  const full = r - l >= plotW - 41;
  const toAstroAt = (clientX: number, el: HTMLElement) => base.astro.invert(clientX - el.getBoundingClientRect().left);
  return (
    <div className="mt-1.5" style={{ paddingLeft: offset }}>
      <div
        className="relative cursor-pointer rounded-[2px] bg-hover"
        style={{ height: MINI_H, width: plotW }}
        role="slider"
        aria-label="Timeline overview: drag to scrub"
        aria-valuemin={block.range.from}
        aria-valuemax={block.range.to}
        aria-valuenow={fromAstro(Math.round((domain[0] + domain[1]) / 2))}
        tabIndex={-1}
        onPointerDown={(e) => { dragging.current = true; e.currentTarget.setPointerCapture(e.pointerId); onCenter(toAstroAt(e.clientX, e.currentTarget)); }}
        onPointerMove={(e) => { if (dragging.current) onCenter(toAstroAt(e.clientX, e.currentTarget)); }}
        onPointerUp={() => { dragging.current = false; }}
      >
        {block.events.map((e) => (
          <span key={e.id} className="absolute top-1/2 h-2 w-[2px] -translate-y-1/2 bg-muted" style={{ left: base.x(e.start), opacity: 0.4 + e.importance * 0.2 }} />
        ))}
        {!full && (
          <span className="absolute inset-y-0 rounded-[2px] border border-accent bg-accent-soft" style={{ left: Math.max(0, l), width: Math.max(6, Math.min(plotW, r) - Math.max(0, l)) }} />
        )}
      </div>
    </div>
  );
}

function EventDrawer({ block, ev, onClose }: { block: TimelineT; ev: Ev; onClose: () => void }) {
  const blocks = useWorkspace((s) => s.blocks);
  const flashBlock = useWorkspace((s) => s.flashBlock);
  const track = block.tracks.find((t) => t.id === ev.track)?.label;
  const mentions = findMentions(blocks.filter((b) => b.id !== block.id), ev.label);
  return (
    <div className="fade-up mt-3 rounded-[2px] border border-rule bg-surface p-4">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="tnum text-[12px] text-muted">{formatRange(ev.start, ev.end)} · {track}</p>
          <p className="mt-0.5 font-heading text-[18px] font-semibold">{ev.label}</p>
          <p className="mt-1 flex items-center gap-1.5 text-[12px] text-muted"><ConfidenceDot c={ev.confidence} /> {CONFIDENCE_LABEL[ev.confidence]}</p>
        </div>
        <button type="button" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-md text-muted hover:bg-hover" aria-label="Close"><Icon.close size={14} /></button>
      </div>
      {mentions.length > 0 && (
        <ul className="mt-3 space-y-1 border-t border-rule pt-2 text-[13px]">
          {mentions.map((m) => (
            <li key={`${m.blockId}-${m.node}`}>
              <button type="button" className="text-left hover:text-accent" onClick={() => scrollToBlock(m.blockId, m.node, flashBlock)}>
                <span className="text-muted">See in {m.where.toLowerCase()}:</span> {m.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
