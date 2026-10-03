import type { Block, Confidence } from "@/lib/contracts";

export const CONFIDENCE_LABEL: Record<Confidence, string> = { E: "established", L: "likely", C: "contested" };

export function confidenceCounts(b: Block): Record<Confidence, number> {
  const c: Record<Confidence, number> = { E: 0, L: 0, C: 0 };
  const tally = (x: Confidence) => { c[x]++; };
  const fromText = (md: string) => {
    for (const m of md.matchAll(/\[(E|L|C)\]/g)) tally(m[1] as Confidence);
  };
  switch (b.type) {
    case "article": b.sections.forEach((s) => fromText(s.md)); break;
    case "callout": fromText(b.md); break;
    case "cause_graph": b.nodes.forEach((n) => tally(n.confidence)); b.edges.forEach((e) => tally(e.confidence)); break;
    case "timeline": b.events.forEach((e) => tally(e.confidence)); break;
    case "lineage": b.links.forEach((l) => tally(l.confidence)); break;
  }
  return c;
}

export function confidenceSummary(b: Block): string | null {
  const c = confidenceCounts(b);
  const parts = (["E", "L", "C"] as const).filter((k) => c[k]).map((k) => `${c[k]} ${CONFIDENCE_LABEL[k]}`);
  return parts.length ? parts.join(", ") : null;
}
