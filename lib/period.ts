import type { Block } from "@/lib/contracts";

/**
 * The span of history a block covers, in historical years, or null if it has no
 * intrinsic period (quiz, callout, gate, or an article without dates in its graph).
 * Articles take their period from years written in the brief section.
 */
export function blockPeriod(b: Block): [number, number] | null {
  switch (b.type) {
    case "timeline":
      return [b.range.from, b.range.to];
    case "cause_graph": {
      const ev = b.nodes.find((n) => n.layer === "event");
      const whens = b.nodes.map((n) => n.when).filter((w): w is number => w != null);
      if (!whens.length) return null;
      const base = ev?.when ?? Math.max(...whens);
      const offsets = b.nodes.map((n) => n.t_offset ?? 0);
      return [Math.min(...whens), base + Math.max(0, ...offsets)];
    }
    case "lineage": {
      const ys = b.people.flatMap((p) => [p.start, p.end]).filter((y): y is number => y != null);
      return ys.length ? [Math.min(...ys), Math.max(...ys)] : null;
    }
    case "article":
      return yearsInText(b.sections[0]?.md ?? "");
    default:
      return null;
  }
}

/**
 * Years mentioned like "216 BCE", "(218-201 BCE)", "in 476", "1658". Rough by design. A year
 * with no era takes the text's: in a passage that marks BCE and never CE or AD, "in 264" is
 * 264 BCE, not 264 CE.
 */
export function yearsInText(text: string): [number, number] | null {
  // citation markers ([S:4446], or [S2] before the server maps them) are passage ids, not years
  const md = text.replace(/\[S:?\d+\]/g, " ");
  const years: number[] = [];
  const range = /(\d{2,4})\s*[-–]\s*(\d{2,4})\s*(BCE|BC|CE|AD)?/g;
  const single = /\b(\d{3,4})\s*(BCE|BC|CE|AD)?\b/g;
  const bceText = /\d\s*(BCE|BC)\b/.test(md) && !/\d\s*(CE|AD)\b|\bAD\s*\d/.test(md);
  const isBce = (era: string | undefined) => era === "BCE" || era === "BC" || (!era && bceText);
  for (const m of md.matchAll(range)) {
    const bce = isBce(m[3]);
    years.push(bce ? -Number(m[1]) : Number(m[1]), bce ? -Number(m[2]) : Number(m[2]));
  }
  for (const m of md.replace(range, " ").matchAll(single)) {
    const n = Number(m[1]);
    if (n < 100 && !m[2]) continue;
    years.push(isBce(m[2]) ? -n : n);
  }
  if (!years.length) return null;
  return [Math.min(...years), Math.max(...years)];
}

/** Each block's period; blocks without one borrow from the nearest neighbour that has one. */
export function periodsFor(blocks: Block[]): ([number, number] | null)[] {
  const own = blocks.map(blockPeriod);
  return own.map((p, i) => {
    if (p) return p;
    for (let d = 1; d < blocks.length; d++) {
      if (own[i + d]) return own[i + d];
      if (own[i - d]) return own[i - d];
    }
    return null;
  });
}

/** The whole lesson's span: earliest to latest year of the blocks that have a period. */
export function lessonSpan(blocks: Block[]): [number, number] | null {
  const known = blocks.map(blockPeriod).filter((p): p is [number, number] => !!p);
  return known.length ? [Math.min(...known.map((p) => p[0])), Math.max(...known.map((p) => p[1]))] : null;
}
