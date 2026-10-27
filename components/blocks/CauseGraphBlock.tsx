"use client";

import { useEffect, useMemo, useRef } from "react";
import type { CauseGraphBlock as GraphT } from "@/lib/contracts";
import { layoutCauseGraph, LANES, NODE_H, EVENT_H } from "@/lib/layout/cause-graph-layout";
import { useWorkspace } from "@/lib/store/workspace";
import { useCanvas } from "@/components/canvas/canvas-store";
import { Icon } from "@/components/ui/icons";
import { LAYER_LABEL, LayerShape, ConfidenceDot } from "@/components/ui/marks";
import { ArrowDefs, EdgeStroke, ShapeAt } from "./GraphGlyphs";
import type { Box } from "@/lib/rough";

const SX = 0.74; // horizontal scale of the full layout in the preview
const LANE_P = 50; // preview lane height
const PAD = 14;
const PREVIEW_H = 260;

export function CauseGraphBlock({ block }: { block: GraphT }) {
  const lay = useMemo(() => layoutCauseGraph(block.nodes), [block.nodes]);
  const flash = useWorkspace((s) => (s.flash?.id === block.id ? s.flash : null));
  const scroller = useRef<HTMLDivElement>(null);

  // preview geometry: same x order as the canvas, compressed lanes
  const boxes = useMemo(() => {
    const out: Record<string, Box & { layer: GraphT["nodes"][number]["layer"] }> = {};
    for (const n of block.nodes) {
      const p = lay.byId[n.id];
      const isEvent = n.layer === "event";
      const h = isEvent ? 44 : 34;
      const laneTop = PAD + p.lane * LANE_P;
      out[n.id] = { x: PAD + p.x * SX, y: laneTop + (LANE_P - h) / 2, w: p.w * SX, h, layer: n.layer };
    }
    return out;
  }, [block.nodes, lay]);
  const width = PAD * 2 + lay.width * SX;

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    el.scrollLeft = Math.max(0, PAD + lay.eventX * SX - el.clientWidth * 0.55);
  }, [lay.eventX]);

  const openCanvas = (nodeId: string | null = null) => {
    useCanvas.getState().open(block.id, nodeId);
    useWorkspace.getState().setMode("canvas");
  };

  return (
    <div>
      <div className="relative overflow-hidden rounded-[2px] border border-rule bg-surface">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 flex w-[30px] flex-col bg-[linear-gradient(90deg,var(--surface)_60%,transparent)] pt-[14px]">
          {LANES.map((l) => (
            <span key={l} className="flex items-center justify-center" style={{ height: LANE_P }} title={LAYER_LABEL[l]}>
              <LayerShape layer={l} size={9} />
            </span>
          ))}
        </div>
        <div ref={scroller} className="scroll-thin overflow-x-auto" style={{ height: PREVIEW_H }}>
          <svg width={Math.max(width, 640)} height={PREVIEW_H} role="img" aria-label={`Cause graph: ${block.title}. ${block.nodes.length} events, ${block.edges.length} links.`}>
            <ArrowDefs />
            {LANES.map((l, i) => (
              <line key={l} x1={0} x2={Math.max(width, 640)} y1={PAD + (i + 1) * LANE_P} y2={PAD + (i + 1) * LANE_P} stroke="var(--rule)" strokeDasharray="2 4" />
            ))}
            {block.edges.map((e) => {
              const a = boxes[e.from], b = boxes[e.to];
              if (!a || !b) return null;
              return <EdgeStroke key={`${e.from}-${e.to}`} edge={e} a={a} b={b} strokeWidth={1.2} />;
            })}
            {block.nodes.map((n) => {
              const bx = boxes[n.id];
              const isEvent = n.layer === "event";
              const lit = flash?.node === n.id;
              return (
                <g key={n.id + (lit ? flash?.nonce : "")} className={lit ? "flash" : undefined}>
                  <foreignObject x={bx.x} y={bx.y} width={bx.w} height={bx.h}>
                    <button
                      type="button"
                      onClick={() => openCanvas(n.id)}
                      title={`${n.label} — open on canvas`}
                      className={`flex h-full w-full items-center gap-1.5 overflow-hidden rounded-[3px] px-1.5 text-left font-sans leading-[1.05] text-text hover:bg-hover ${
                        isEvent ? "border-[1.5px] border-text bg-surface text-[17px] font-bold" : "text-[15.5px]"
                      } ${lit ? "ring-2 ring-accent" : ""}`}
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" className="shrink-0" aria-hidden>
                        <ShapeAt layer={n.layer} cx={6} cy={6} r={isEvent ? 5 : 4.5} />
                      </svg>
                      <span className="line-clamp-2">{n.label}</span>
                    </button>
                  </foreignObject>
                </g>
              );
            })}
          </svg>
        </div>
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px] text-muted">
        <button
          type="button"
          onClick={() => openCanvas()}
          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-rule bg-surface px-2.5 text-[12.5px] text-text hover:border-rule-strong"
        >
          <Icon.expand size={12} /> Open on canvas
        </button>
        <GraphLegend />
      </div>
    </div>
  );
}

export function GraphLegend() {
  return (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <span className="inline-flex items-center gap-1.5"><svg width="22" height="6"><line x1="0" x2="22" y1="3" y2="3" stroke="currentColor" strokeWidth="1.4" /></svg><ConfidenceDot c="E" /> established</span>
      <span className="inline-flex items-center gap-1.5"><svg width="22" height="6"><line x1="0" x2="22" y1="3" y2="3" stroke="currentColor" strokeWidth="1.4" strokeDasharray="5 4" /></svg><ConfidenceDot c="L" /> likely</span>
      <span className="inline-flex items-center gap-1.5"><svg width="22" height="8"><path d="M0,4 C5,1 8,7 12,3.5 S18,2 22,5" fill="none" stroke="currentColor" strokeWidth="1.4" /></svg><ConfidenceDot c="C" /> contested</span>
    </span>
  );
}

export { NODE_H, EVENT_H };
