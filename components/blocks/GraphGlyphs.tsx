"use client";

import type { CauseEdge, Confidence, Layer } from "@/lib/contracts";
import { layerColor } from "@/components/ui/marks";
import { dashFor, linkPath, roughPath, type Box } from "@/lib/rough";

/** Layer shape drawn in SVG user space, centred at (cx, cy). */
export function ShapeAt({ layer, cx, cy, r = 6 }: { layer: Layer; cx: number; cy: number; r?: number }) {
  const col = layerColor(layer);
  switch (layer) {
    case "structural": return <rect x={cx - r} y={cy - r} width={r * 2} height={r * 2} fill={col} />;
    case "enabling": return <path d={`M${cx},${cy - r * 1.1} L${cx + r * 1.05},${cy + r * 0.85} L${cx - r * 1.05},${cy + r * 0.85}Z`} fill={col} />;
    case "trigger": return <path d={`M${cx},${cy - r * 1.15} L${cx + r * 1.15},${cy} L${cx},${cy + r * 1.15} L${cx - r * 1.15},${cy}Z`} fill={col} />;
    case "contingency": return <circle cx={cx} cy={cy} r={r * 0.9} fill="none" stroke={col} strokeWidth={2} />;
    case "consequence": return <circle cx={cx} cy={cy} r={r} fill={col} />;
    case "event": return <rect x={cx - r} y={cy - r} width={r * 2} height={r * 2} rx={r * 0.5} fill={col} />;
  }
}

/** One causal link with the confidence line style; contested links are hand-drawn with a debate marker. */
export function EdgeStroke({
  edge, a, b, state = "normal", strokeWidth = 1.4,
}: { edge: CauseEdge; a: Box; b: Box; state?: "normal" | "lit" | "dim"; strokeWidth?: number }) {
  const { d, mid } = linkPath(a, b);
  const id = `${edge.from}->${edge.to}`;
  const color = state === "lit" ? "var(--accent)" : "var(--muted)";
  const opacity = state === "dim" ? 0.18 : state === "lit" ? 1 : 0.75;
  const sw = state === "lit" ? strokeWidth + 0.8 : strokeWidth;
  return (
    <g opacity={opacity} style={{ transition: "opacity 200ms" }}>
      <title>{edge.why}</title>
      {edge.confidence === "C" ? (
        roughPath(d, id).map((p, i) => <path key={i} d={p} fill="none" stroke={color} strokeWidth={sw} markerEnd={i === 0 ? "url(#cg-arrow)" : undefined} />)
      ) : (
        <path d={d} fill="none" stroke={color} strokeWidth={sw} strokeDasharray={dashFor(edge.confidence)} markerEnd="url(#cg-arrow)" />
      )}
      {edge.confidence === "C" && <DebateMarker x={mid[0]} y={mid[1]} />}
    </g>
  );
}

export function DebateMarker({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x},${y})`} aria-label="contested">
      <circle r={7} fill="var(--surface)" stroke="var(--violet)" strokeWidth={1.2} />
      <text textAnchor="middle" dy="3.5" fontSize={10} fontFamily="var(--font-mono)" fill="var(--violet)">?</text>
    </g>
  );
}

export function ArrowDefs() {
  return (
    <defs>
      <marker id="cg-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M0,1 L9,5 L0,9" fill="none" stroke="var(--muted)" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
      </marker>
    </defs>
  );
}

export function confidenceStrokeLabel(c: Confidence) {
  return c === "E" ? "solid line" : c === "L" ? "dashed line" : "hand-drawn line";
}
