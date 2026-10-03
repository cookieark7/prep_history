import type { CauseGraphBlock, CauseNode } from "@/lib/contracts";
import { formatYear } from "@/lib/layout/years";
import { CONFIDENCE_LABEL } from "@/lib/confidence";

export { reachable } from "@/lib/layout/cause-graph-layout";

export function eventOf(b: CauseGraphBlock): CauseNode | undefined {
  return b.nodes.find((n) => n.layer === "event");
}

/** Absolute year for ordering: causes by `when`, consequences by event year + t_offset. */
export function nodeYear(b: CauseGraphBlock, n: CauseNode): number | null {
  if (n.when != null) return n.when;
  const ev = eventOf(b)?.when;
  if (n.t_offset != null && ev != null) return ev + n.t_offset;
  return null;
}

export function nodeTimeLabel(b: CauseGraphBlock, n: CauseNode): string {
  if (n.layer === "consequence" && n.t_offset != null) {
    const y = nodeYear(b, n);
    return `${n.t_offset} year${n.t_offset === 1 ? "" : "s"} later${y != null ? ` (${formatYear(y)})` : ""}`;
  }
  return n.when != null ? formatYear(n.when) : "date unknown";
}

export function incident(b: CauseGraphBlock, id: string) {
  return {
    incoming: b.edges.filter((e) => e.to === id),
    outgoing: b.edges.filter((e) => e.from === id),
  };
}

/** Descendants in the order they happened (for "Ripple forward"). */
export function rippleOrder(b: CauseGraphBlock, start: string, desc: Set<string>): string[] {
  return [...desc].sort((x, y) => {
    const nx = b.nodes.find((n) => n.id === x)!;
    const ny = b.nodes.find((n) => n.id === y)!;
    return (nodeYear(b, nx) ?? Infinity) - (nodeYear(b, ny) ?? Infinity) || x.localeCompare(y);
  });
}

/** Shortest path between two nodes: directed either way first, then ignoring direction. */
export function pathBetween(b: CauseGraphBlock, a: string, z: string): { nodes: string[]; edges: string[] } | null {
  const bfs = (adj: (id: string) => { next: string; edge: string }[]) => {
    const prev = new Map<string, { from: string; edge: string }>();
    const q = [a];
    const seen = new Set([a]);
    while (q.length) {
      const cur = q.shift()!;
      if (cur === z) break;
      for (const { next, edge } of adj(cur)) {
        if (seen.has(next)) continue;
        seen.add(next);
        prev.set(next, { from: cur, edge });
        q.push(next);
      }
    }
    if (!seen.has(z)) return null;
    const nodes = [z];
    const edges: string[] = [];
    let cur = z;
    while (cur !== a) {
      const p = prev.get(cur)!;
      edges.push(p.edge);
      nodes.push(p.from);
      cur = p.from;
    }
    return { nodes: nodes.reverse(), edges: edges.reverse() };
  };
  const key = (e: { from: string; to: string }) => `${e.from}->${e.to}`;
  const fwd = (id: string) => b.edges.filter((e) => e.from === id).map((e) => ({ next: e.to, edge: key(e) }));
  const back = (id: string) => b.edges.filter((e) => e.to === id).map((e) => ({ next: e.from, edge: key(e) }));
  const both = (id: string) => [...fwd(id), ...back(id)];
  return bfs(fwd) ?? bfs(back) ?? bfs(both);
}

export const edgeKey = (e: { from: string; to: string }) => `${e.from}->${e.to}`;

/** Text sent with expand_node so the Director sees the node's links. */
export function nodeDetail(b: CauseGraphBlock, id: string): string {
  const label = (x: string) => b.nodes.find((n) => n.id === x)?.label ?? x;
  const n = b.nodes.find((x) => x.id === id);
  const { incoming, outgoing } = incident(b, id);
  const lines = [
    `node ${id}: "${n?.label}" (${n?.layer}, ${n ? nodeTimeLabel(b, n) : ""}, ${n ? CONFIDENCE_LABEL[n.confidence] : ""})`,
    ...incoming.map((e) => `- caused by "${label(e.from)}" (${CONFIDENCE_LABEL[e.confidence]}): ${e.why}`),
    ...outgoing.map((e) => `- led to "${label(e.to)}" (${CONFIDENCE_LABEL[e.confidence]}): ${e.why}`),
  ];
  return lines.join("\n");
}

/** Nice "years later" ticks on a sqrt axis, at least `minGap` px apart. */
export function rulerTicks(maxOffset: number, toX: (t: number) => number, minGap = 44): number[] {
  const cands = [0, 1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 5000].filter((t) => t <= maxOffset);
  if (maxOffset > 0 && !cands.includes(maxOffset)) cands.push(maxOffset);
  const out: number[] = [];
  for (const t of cands) {
    if (!out.length || toX(t) - toX(out[out.length - 1]) >= minGap) out.push(t);
    else if (t === maxOffset) out[out.length - 1] = t;
  }
  return out;
}
