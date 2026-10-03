import type { CauseNode, Layer } from "@/lib/contracts";

export const NODE_W = 168;
export const NODE_H = 64;
export const EVENT_W = 196;
export const EVENT_H = 84;
const GAP_X = 28;
const LANE_H = 112;

/** Lanes top to bottom. The event sits on the middle line (the trigger lane). */
export const LANES: Exclude<Layer, "event">[] = [
  "structural", "enabling", "trigger", "contingency", "consequence",
];
const EVENT_LANE = 2;

export interface PositionedNode {
  id: string;
  /** top-left corner */
  x: number;
  y: number;
  w: number;
  h: number;
  lane: number;
}

export interface CauseGraphLayout {
  nodes: PositionedNode[];
  byId: Record<string, PositionedNode>;
  width: number;
  height: number;
  /** centre x of the event node */
  eventX: number;
  /** maps years-after-the-event to an x coordinate (for the "years later" ruler) */
  offsetToX: (t: number) => number;
  /** largest t_offset among consequences (0 if none) */
  maxOffset: number;
  laneY: (lane: number) => number;
}

/**
 * Deterministic layout:
 *   x: causes by `when` ascending, left of the event; consequences right by sqrt(t_offset).
 *   y: one lane per layer; nodes in a lane never overlap (pushed right in order).
 */
export function layoutCauseGraph(nodes: CauseNode[]): CauseGraphLayout {
  const laneY = (lane: number) => lane * LANE_H + (LANE_H - NODE_H) / 2;
  const laneOf = (n: CauseNode) => (n.layer === "event" ? EVENT_LANE : LANES.indexOf(n.layer));
  const byIdStable = (a: CauseNode, b: CauseNode) => a.id.localeCompare(b.id, "en", { numeric: true });

  const event = nodes.find((n) => n.layer === "event");
  const causes = nodes.filter((n) => n.layer !== "event" && n.layer !== "consequence");
  const consequences = nodes.filter((n) => n.layer === "consequence");

  // --- causes: proportional to time, then de-overlapped within each lane
  const known = causes.map((n) => n.when).filter((w): w is number => w != null);
  const tMin = known.length ? Math.min(...known) : 0;
  const tMax = Math.max(known.length ? Math.max(...known) : 0, event?.when ?? -Infinity);
  const causeSpan = Math.max(causes.length * NODE_W * 0.7, 480);
  const timeToX = (w: number | null) =>
    w == null || tMax === tMin ? 0 : ((w - tMin) / (tMax - tMin)) * causeSpan;

  const out: PositionedNode[] = [];
  let causesRight = 0;
  for (let lane = 0; lane < EVENT_LANE + 2; lane++) {
    const inLane = causes
      .filter((n) => laneOf(n) === lane)
      .sort((a, b) => (a.when ?? -Infinity) - (b.when ?? -Infinity) || byIdStable(a, b));
    let cursor = -Infinity;
    for (const n of inLane) {
      const x = Math.max(timeToX(n.when), cursor);
      out.push({ id: n.id, x, y: laneY(lane), w: NODE_W, h: NODE_H, lane });
      cursor = x + NODE_W + GAP_X;
      causesRight = Math.max(causesRight, x + NODE_W);
    }
  }

  // --- event: right of every cause, on the middle line
  const eventLeft = causes.length ? causesRight + GAP_X * 2 : 0;
  const eventX = eventLeft + EVENT_W / 2;
  if (event) {
    out.push({
      id: event.id, x: eventLeft, y: laneY(EVENT_LANE) - (EVENT_H - NODE_H) / 2,
      w: EVENT_W, h: EVENT_H, lane: EVENT_LANE,
    });
  }

  // --- consequences: right of the event by sqrt(t_offset), de-overlapped
  const offsets = consequences.map((n) => Math.max(0, n.t_offset ?? 0));
  const maxOffset = offsets.length ? Math.max(...offsets) : 0;
  const consLeft = eventLeft + EVENT_W + GAP_X;
  const consSpan = Math.max(consequences.length * (NODE_W + GAP_X), 420);
  const offsetToX = (t: number) =>
    consLeft + (maxOffset > 0 ? (Math.sqrt(Math.max(0, t)) / Math.sqrt(maxOffset)) * (consSpan - NODE_W) : 0);

  const consLane = LANES.indexOf("consequence");
  const sortedCons = [...consequences].sort(
    (a, b) => (a.t_offset ?? 0) - (b.t_offset ?? 0) || byIdStable(a, b),
  );
  let cursor = -Infinity;
  for (const n of sortedCons) {
    const x = Math.max(offsetToX(n.t_offset ?? 0), cursor);
    out.push({ id: n.id, x, y: laneY(consLane), w: NODE_W, h: NODE_H, lane: consLane });
    cursor = x + NODE_W + GAP_X;
  }

  const width = Math.max(...out.map((p) => p.x + p.w), EVENT_W);
  const height = LANES.length * LANE_H;
  const byId = Object.fromEntries(out.map((p) => [p.id, p]));
  return { nodes: out, byId, width, height, eventX, offsetToX, maxOffset, laneY };
}

export function overlaps(a: PositionedNode, b: PositionedNode): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

/** Ancestors (trace back) and descendants (ripple forward) over the edge list. */
export function reachable(
  start: string,
  edges: { from: string; to: string }[],
  direction: "back" | "forward",
): Set<string> {
  const seen = new Set<string>();
  const stack = [start];
  while (stack.length) {
    const cur = stack.pop()!;
    for (const e of edges) {
      const [here, next] = direction === "back" ? [e.to, e.from] : [e.from, e.to];
      if (here === cur && !seen.has(next) && next !== start) {
        seen.add(next);
        stack.push(next);
      }
    }
  }
  return seen;
}
