import type { Block } from "@/lib/contracts";
import { formatRange, formatYear } from "@/lib/layout/years";

export type EntityType = "person" | "place" | "event" | "term";

export interface Mention {
  blockId: string;
  node: string | null;
  where: string; // "Cause graph", "Timeline", ...
  label: string;
  when?: string;
}

const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N} ]/gu, "").trim();

/** Where else this entity shows up in the lesson (graph nodes, timeline events, lineage people). */
export function findMentions(blocks: Block[], name: string): Mention[] {
  const key = norm(name);
  if (key.length < 3) return [];
  const hit = (s: string) => norm(s).includes(key);
  const out: Mention[] = [];
  for (const b of blocks) {
    if (b.type === "cause_graph") {
      for (const n of b.nodes) if (hit(n.label)) out.push({
        blockId: b.id, node: n.id, where: "Cause graph", label: n.label,
        when: n.when != null ? formatYear(n.when) : n.t_offset != null ? `+${n.t_offset} years` : undefined,
      });
    } else if (b.type === "timeline") {
      for (const e of b.events) if (hit(e.label)) out.push({
        blockId: b.id, node: e.id, where: "Timeline", label: e.label, when: formatRange(e.start, e.end),
      });
    } else if (b.type === "lineage") {
      for (const p of b.people) if (hit(p.name)) out.push({
        blockId: b.id, node: p.id, where: "Lineage", label: p.name, when: formatRange(p.start, p.end, p.approx),
      });
    }
  }
  return out.slice(0, 4);
}

/** Article markdown -> markdown where tags/entities are links with custom schemes. */
export function preprocessMarkdown(md: string): string {
  return md
    .replace(/\[\[([^\]|]+)\|(person|place|event|term)\]\]/g, (_, name: string, type: string) => `[${name}](entity:${type})`)
    .replace(/\[\[([^\]|]+)\]\]/g, (_, name: string) => `[${name}](entity:term)`)
    .replace(/\[(E|L|C)\](?!\()/g, (_, c: string) => `[${c}](conf:${c})`);
}

/** Plain text version of article markdown (for exports and note matching). */
export function plainText(md: string): string {
  return md
    .replace(/\[\[([^\]|]+)\|[a-z]+\]\]/g, "$1")
    .replace(/\s?\[(E|L|C)\]/g, "")
    .replace(/[*_`]/g, "");
}
