import type { CauseGraphBlock, QuizBlock, QuizItem } from "@/lib/contracts";
import { seedOf } from "@/lib/rough";
import { reachable } from "@/lib/layout/cause-graph-layout";

/** Deterministic PRNG so a shuffle is stable per item id. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Seeded Fisher-Yates. Never returns the input order unchanged (when length > 1). */
export function seededShuffle<T>(items: T[], seed: string): T[] {
  const out = [...items];
  const rnd = mulberry32(seedOf(seed));
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  if (out.length > 1 && out.every((x, i) => x === items[i])) out.push(out.shift()!);
  return out;
}

/** Chronology is correct when years never decrease along the learner's order. */
export function checkChronology(order: string[], events: { id: string; year: number }[]): boolean {
  const year = (id: string) => events.find((e) => e.id === id)?.year ?? NaN;
  return order.length === events.length && order.every((id, i) => i === 0 || year(order[i - 1]) <= year(id));
}

/** The mastery key an item feeds: its source block, plus the node when there is one. */
export function refFor(item: QuizItem): string {
  return item.source_ref.node ? `${item.source_ref.block}:${item.source_ref.node}` : item.source_ref.block;
}

export const GRAPH_QUIZ_ID = "b0";

/**
 * Client-side quiz from a cause graph (no LLM):
 *  - "What led to X?" — the answer is a source of an incoming edge; distractors are nodes
 *    with no causal path to X at all, preferring other layers.
 *  - "Order these causes" — causes ordered by `when`.
 */
export function generateGraphQuiz(g: CauseGraphBlock, max = 5): QuizBlock | null {
  const items: QuizItem[] = [];
  const label = (id: string) => g.nodes.find((n) => n.id === id)!.label;

  const targets = seededShuffle(
    g.nodes.filter((n) => g.edges.some((e) => e.to === n.id)),
    `${g.id}-targets`,
  ).sort((a, b) => (a.layer === "event" ? -1 : b.layer === "event" ? 1 : 0));

  for (const t of targets) {
    if (items.length >= max - 1) break;
    const incoming = g.edges.filter((e) => e.to === t.id);
    const correct = incoming[0];
    const ancestors = reachable(t.id, g.edges, "back");
    const descendants = reachable(t.id, g.edges, "forward");
    const pool = g.nodes.filter(
      (n) => n.id !== t.id && !ancestors.has(n.id) && !descendants.has(n.id),
    );
    const source = g.nodes.find((n) => n.id === correct.from)!;
    const distractors = seededShuffle(pool, `${g.id}-${t.id}-d`)
      .sort((a, b) => Number(a.layer === source.layer) - Number(b.layer === source.layer))
      .slice(0, 3);
    if (distractors.length < 2) continue;
    const options = seededShuffle(
      [{ id: correct.from, text: label(correct.from) }, ...distractors.map((d) => ({ id: d.id, text: d.label }))],
      `${g.id}-${t.id}-o`,
    );
    items.push({
      kind: "mcq",
      id: `gq-${t.id}`,
      stem: t.layer === "consequence" ? `What led to “${t.label}”?` : `What helped bring about “${t.label}”?`,
      options,
      answer_id: correct.from,
      why: correct.why,
      source_ref: { block: g.id, node: t.id },
    });
  }

  const causes = g.nodes.filter((n) => n.when != null && n.layer !== "consequence");
  const distinct = [...new Map(causes.map((n) => [n.when, n])).values()];
  if (distinct.length >= 3) {
    const picked = seededShuffle(distinct, `${g.id}-chrono`).slice(0, 5);
    items.push({
      kind: "chronology",
      id: "gq-order",
      stem: "Order these causes, earliest first.",
      events: picked.map((n) => ({ id: n.id, label: n.label, year: n.when! })),
      source_ref: { block: g.id, node: null },
    });
  }

  if (!items.length) return null;
  return {
    id: GRAPH_QUIZ_ID,
    type: "quiz",
    title: `Graph quiz: ${g.title}`.slice(0, 80),
    because: "Built from the cause graph on your Stage",
    items: items.slice(0, 6),
  };
}
