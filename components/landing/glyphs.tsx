"use client";

import { useId } from "react";
import type { Glyph as GlyphName } from "@/lib/landing/types";

// The 12 anchor glyphs (prompt 4.3). Drawn around (0, 0) in vmin units: `r` is the outer
// radius, 9 for the usual 18vmin anchor. Strokes are 1.5px at any size.

export interface GlyphProps {
  name: GlyphName;
  color: string;
  r?: number;
  /** Variants: a nucleus inside `cell`, an inner disc inside `ring` (the B20 coin). */
  variant?: "nucleus" | "coin";
}

const STROKE = { fill: "none", strokeWidth: 1.5, vectorEffect: "non-scaling-stroke" as const };

export function Glyph({ name, color, r = 9, variant }: GlyphProps) {
  const id = useId().replace(/:/g, "");
  const s = { ...STROKE, stroke: color };
  const fine = { ...STROKE, stroke: color, strokeWidth: 0.75 };
  switch (name) {
    case "point":
      return (
        <g>
          <circle r={r * 0.34} fill={color} opacity={0.12} />
          <circle r={r * 0.18} fill={color} opacity={0.18} />
          {rays(24, r * 0.3, r, (i) => (i % 2 ? 0.75 : 1)).map((d, i) => <path key={i} d={d} {...fine} opacity={0.7} />)}
          <circle r={r * 0.11} fill={color} />
        </g>
      );
    case "star":
      return (
        <g>
          {rays(10, r * 0.22, r, (i) => (i % 2 ? 0.6 : 1)).map((d, i) => <path key={i} d={d} {...fine} />)}
          <circle r={r * 0.16} fill={color} />
        </g>
      );
    case "disc":
      return (
        <g>
          <defs>
            <mask id={`${id}-shade`}>
              <circle r={r} fill="white" />
              <circle cx={-r * 0.32} cy={-r * 0.22} r={r * 0.92} fill="black" />
            </mask>
          </defs>
          <circle r={r} fill={color} opacity={0.14} />
          <g mask={`url(#${id}-shade)`}>
            {hatch(r, 0.9).map((d, i) => <path key={i} d={d} {...fine} />)}
          </g>
          <circle r={r} {...s} />
        </g>
      );
    case "ring":
      return (
        <g>
          <circle r={r} {...s} />
          {variant === "coin" && (
            <>
              <circle r={r * 0.66} fill={color} opacity={0.16} />
              <circle r={r * 0.66} {...fine} />
            </>
          )}
        </g>
      );
    case "concentric":
      return <g>{[1, 0.8, 0.6, 0.4, 0.2].map((k) => <circle key={k} r={r * k} {...s} />)}</g>;
    case "spiral":
      return <path d={spiral(r)} {...s} />;
    case "cell":
      return (
        <g>
          <circle r={r} {...s} />
          <circle r={r * 0.88} {...fine} opacity={0.5} />
          {[[-0.45, -0.3], [0.38, -0.42], [0.5, 0.28], [-0.3, 0.5], [0.05, 0.62], [-0.6, 0.12]].map(([x, y], i) => (
            <circle key={i} cx={x * r} cy={y * r} r={r * 0.05} fill={color} />
          ))}
          {variant === "nucleus" && (
            <>
              <circle cx={r * 0.08} cy={-r * 0.04} r={r * 0.3} fill={color} opacity={0.18} />
              <circle cx={r * 0.08} cy={-r * 0.04} r={r * 0.3} {...s} />
            </>
          )}
        </g>
      );
    case "rose":
      return (
        <g>
          <circle r={r * 0.62} {...fine} />
          <path d={rose(r)} {...s} strokeLinejoin="round" />
          <circle r={r * 0.1} fill={color} />
        </g>
      );
    case "orbits":
      return (
        <g transform="rotate(-18)">
          {[0.42, 0.7, 1].map((k) => <ellipse key={k} rx={r * k} ry={r * k * 0.42} {...s} />)}
          <circle cx={r * 0.42} cy={0} r={r * 0.05} fill={color} />
          <circle cx={-r * 0.5} cy={r * 0.22} r={r * 0.06} fill={color} />
          <circle cx={r * 0.62} cy={-r * 0.36} r={r * 0.07} fill={color} />
          <circle r={r * 0.17} fill={color} />
        </g>
      );
    case "wheel":
      return (
        <g>
          <circle r={r} {...s} />
          <circle r={r * 0.17} {...s} />
          {Array.from({ length: 8 }, (_, i) => {
            const a = (i * Math.PI) / 4;
            return <path key={i} d={line(a, r * 0.17, r)} {...s} />;
          })}
        </g>
      );
    case "dial":
      return (
        <g>
          <circle r={r} {...s} />
          {Array.from({ length: 12 }, (_, i) => <path key={i} d={line((i * Math.PI) / 6, r * (i % 3 ? 0.86 : 0.78), r * 0.96)} {...s} />)}
          <path d={line(-Math.PI / 2 + Math.PI / 3, 0, r * 0.66)} {...s} strokeLinecap="round" />
          <circle r={r * 0.07} fill={color} />
        </g>
      );
    case "globe":
      return (
        <g>
          <circle r={r} {...s} />
          <path d={`M0 ${-r}V${r}`} {...s} />
          {[0.34, 0.68].map((k) => <ellipse key={k} rx={r * k} ry={r} {...s} />)}
          {[-0.5, 0.5].map((k) => {
            const y = r * k;
            const w = Math.sqrt(r * r - y * y);
            return <path key={k} d={`M${-w} ${y}H${w}`} {...s} />;
          })}
        </g>
      );
  }
}

function polar(a: number, d: number): [number, number] {
  return [Math.cos(a) * d, Math.sin(a) * d];
}

function line(a: number, from: number, to: number): string {
  const [x1, y1] = polar(a, from);
  const [x2, y2] = polar(a, to);
  return `M${x1.toFixed(3)} ${y1.toFixed(3)}L${x2.toFixed(3)} ${y2.toFixed(3)}`;
}

function rays(n: number, from: number, to: number, len: (i: number) => number): string[] {
  return Array.from({ length: n }, (_, i) => line((i * 2 * Math.PI) / n - Math.PI / 2, from, from + (to - from) * len(i)));
}

/** Parallel diagonal hatching across a circle of radius r. */
function hatch(r: number, gap: number): string[] {
  const out: string[] = [];
  for (let k = -r * 1.5; k <= r * 1.5; k += gap) out.push(`M${(k - r).toFixed(3)} ${r}L${(k + r).toFixed(3)} ${-r}`);
  return out;
}

/** A logarithmic spiral from the center out to radius r. */
function spiral(r: number): string {
  const turns = 3.25;
  const b = Math.log(r / (r * 0.05)) / (turns * 2 * Math.PI);
  const a = r * 0.05;
  const pts: string[] = [];
  for (let t = 0; t <= turns * 2 * Math.PI; t += 0.08) {
    const d = a * Math.exp(b * t);
    pts.push(`${(Math.cos(t) * d).toFixed(3)} ${(Math.sin(t) * d).toFixed(3)}`);
  }
  return `M${pts.join("L")}`;
}

/** An eight-point compass rose: long cardinal points, short diagonals. */
function rose(r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 16; i++) {
    const a = (i * Math.PI) / 8 - Math.PI / 2;
    const d = i % 4 === 0 ? r : i % 2 === 0 ? r * 0.55 : r * 0.16;
    const [x, y] = polar(a, d);
    pts.push(`${x.toFixed(3)} ${y.toFixed(3)}`);
  }
  return `M${pts.join("L")}Z`;
}
