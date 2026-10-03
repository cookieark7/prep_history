import rough from "roughjs";
import type { Confidence } from "@/lib/contracts";

const gen = rough.generator();

/** Stable 31-bit hash so a hand-drawn stroke never jitters between renders. */
export function seedOf(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % 2147483646 + 1;
}

const cache = new Map<string, string[]>();

/** A wobbly, hand-drawn version of an SVG path, seeded by id. Returns path `d` strings. */
export function roughPath(d: string, id: string, roughness = 1.4): string[] {
  const key = `${id}|${roughness}|${d}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const drawable = gen.path(d, { seed: seedOf(id), roughness, bowing: 1.6, disableMultiStroke: true, preserveVertices: true });
  const paths = gen.toPaths(drawable).map((p) => p.d);
  if (cache.size > 500) cache.clear();
  cache.set(key, paths);
  return paths;
}

/** Stroke dash per confidence: established solid, likely dashed (contested is drawn rough). */
export function dashFor(c: Confidence): string | undefined {
  return c === "L" ? "6 5" : undefined;
}

export interface Box { x: number; y: number; w: number; h: number }

/** Cubic path between two boxes: right->left when the target is ahead, else vertical. */
export function linkPath(a: Box, b: Box): { d: string; mid: [number, number] } {
  let sx: number, sy: number, tx: number, ty: number, d: string;
  if (b.x >= a.x + a.w - 8) {
    sx = a.x + a.w; sy = a.y + a.h / 2; tx = b.x; ty = b.y + b.h / 2;
    const k = Math.max(30, (tx - sx) * 0.45);
    d = `M${sx},${sy} C${sx + k},${sy} ${tx - k},${ty} ${tx},${ty}`;
  } else if (b.x + b.w <= a.x + 8) {
    sx = a.x; sy = a.y + a.h / 2; tx = b.x + b.w; ty = b.y + b.h / 2;
    const k = Math.max(30, (sx - tx) * 0.45);
    d = `M${sx},${sy} C${sx - k},${sy} ${tx + k},${ty} ${tx},${ty}`;
  } else {
    const down = b.y > a.y;
    sx = a.x + a.w / 2; sy = down ? a.y + a.h : a.y; tx = b.x + b.w / 2; ty = down ? b.y : b.y + b.h;
    const k = Math.max(24, Math.abs(ty - sy) * 0.45) * (down ? 1 : -1);
    d = `M${sx},${sy} C${sx},${sy + k} ${tx},${ty - k} ${tx},${ty}`;
  }
  return { d, mid: [(sx + tx) / 2, (sy + ty) / 2] };
}
