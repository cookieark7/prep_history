import type { SourceItem, StreamLine } from "@/lib/contracts";
import type { Retrieved } from "./retrieve";

// Sources in, citations out (docs/PROTOTYPE_PLAN.md, sections 5.3 and 6.5).
// The Director sees passages as S1…Sn and cites them as [S2]. Before a line reaches the client,
// [S2] in article or callout markdown becomes [S:<chunk id>], stable across turns. A citation of
// a passage that wasn't given is removed, and so is any citation outside markdown (say, titles,
// labels, graph text). At the end the server sends one "sources" line with what was cited.

/** The <sources> block for the Director's context. */
export function formatSources(sources: Retrieved[]): string {
  if (!sources.length) return "";
  return [
    "<sources>",
    ...sources.flatMap((s) => [
      `[${s.sid}] ${s.heading}${s.period ? ` (years ${s.period[0]} to ${s.period[1]})` : ""}`,
      s.text.replace(/\s+/g, " ").trim(),
      "",
    ]),
    "</sources>",
  ].join("\n");
}

const MARK = /\[(S\d+(?:\s*[,;]\s*S\d+)*)\]/g;
/** markdown fields that the reader renders, where citations may stay */
const MD_KEYS = new Set(["md"]);

export interface CitationStats { cited: number; removed: number }

export class Citations {
  private bySid: Map<string, Retrieved>;
  private cited = new Map<number, Retrieved>();
  readonly stats: CitationStats = { cited: 0, removed: 0 };

  constructor(sources: Retrieved[]) {
    this.bySid = new Map(sources.map((s) => [s.sid, s]));
  }

  /** Rewrite one line's citations (a new object; the input is not changed). */
  line(l: StreamLine): StreamLine {
    if (l.t === "say") return { ...l, text: this.strip(l.text) };
    if (l.t === "followup") return { ...l, label: this.strip(l.label) };
    if (l.t === "card") {
      const cites = (l.card.cites ?? []).flatMap((sid) => { const s = this.bySid.get(sid); return s ? [String(s.chunkId)] : []; });
      return { ...l, card: { ...l.card, front: this.strip(l.card.front), back: this.strip(l.card.back), cites } };
    }
    if (l.t !== "op") return l;
    return { ...l, op: this.walk(l.op, "") as typeof l.op };
  }

  /** The closing "sources" line, or null when nothing was cited. */
  sourcesLine(): StreamLine | null {
    if (!this.cited.size) return null;
    const items: SourceItem[] = [...this.cited.values()].map((s) => ({
      id: String(s.chunkId), title: s.title, heading: s.heading, url: s.url, license: s.license,
      excerpt: s.text.length > 480 ? `${s.text.slice(0, 479).replace(/\s+\S*$/, "")}…` : s.text,
    }));
    return { t: "sources", items };
  }

  private walk(v: unknown, key: string): unknown {
    if (typeof v === "string") return MD_KEYS.has(key) ? this.cite(v) : this.strip(v);
    if (Array.isArray(v)) return v.map((x) => this.walk(x, key));
    if (v && typeof v === "object") {
      return Object.fromEntries(Object.entries(v as Record<string, unknown>).map(([k, x]) => [k, this.walk(x, k)]));
    }
    return v;
  }

  private cite(md: string): string {
    return md.replace(MARK, (_, inner: string) => inner.split(/\s*[,;]\s*/).map((sid) => {
      const s = this.bySid.get(sid);
      if (!s) { this.stats.removed++; return ""; }
      if (!this.cited.has(s.chunkId)) this.cited.set(s.chunkId, s);
      this.stats.cited++;
      return `[S:${s.chunkId}]`;
    }).join(""));
  }

  private strip(text: string): string {
    if (!/\[S\d/.test(text)) return text;
    return text.replace(MARK, () => { this.stats.removed++; return ""; }).replace(/\s+([.,;:!?])/g, "$1").replace(/ {2,}/g, " ").trimEnd();
  }
}

/** Lines through the citation rewrite, with the "sources" line just before "done". */
export async function* withCitations(lines: AsyncIterable<StreamLine>, citations: Citations): AsyncGenerator<StreamLine> {
  for await (const l of lines) {
    if (l.t === "done") {
      const s = citations.sourcesLine();
      if (s) yield s;
      yield l;
      return;
    }
    yield citations.line(l);
  }
}
