import { and, cosineDistance, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { schema, type Db } from "@/lib/db/client";
import type { Embedder } from "./embed";

// Hybrid retrieval (docs/PROTOTYPE_PLAN.md, section 6.4): the nearest passages by embedding and
// the best keyword matches, merged with reciprocal rank fusion (k = 60), nudged towards the
// lesson's period, at most two passages per article, cut to a token budget.

export interface Retrieved {
  /** S1, S2 … as the Director sees them this turn */
  sid: string;
  chunkId: number;
  docId: string;
  title: string;
  heading: string;
  url: string;
  license: string;
  text: string;
  tokens: number;
  period: [number, number] | null;
  score: number;
}

export interface RetrieveOptions {
  query: string;
  /** the lesson's span of years, if known: overlapping passages rank a little higher */
  period?: [number, number] | null;
  k?: number;
  tokenBudget?: number;
  perDoc?: number;
  signal?: AbortSignal;
}

const CANDIDATES = 24;
const RRF_K = 60;
const PERIOD_BOOST = 0.004; // about a quarter of a top rank's RRF score

export async function retrieve(db: Db, embedder: Embedder, o: RetrieveOptions): Promise<Retrieved[]> {
  const k = o.k ?? 6;
  const budget = o.tokenBudget ?? 2200;
  const perDoc = o.perDoc ?? 2;
  const c = schema.chunks;

  const [qv] = await embedder.embed([o.query], o.signal);
  const byVector = await db.select({ id: c.id }).from(c)
    .where(and(eq(c.embeddingModel, embedder.model), isNotNull(c.embedding)))
    .orderBy(cosineDistance(c.embedding, qv))
    .limit(CANDIDATES);

  const terms = keywordTerms(o.query);
  const byKeyword = terms
    ? await db.select({ id: c.id }).from(c)
      .where(and(eq(c.embeddingModel, embedder.model), sql`${c.tsv} @@ to_tsquery('english', ${terms})`))
      .orderBy(sql`ts_rank_cd(${c.tsv}, to_tsquery('english', ${terms})) desc`)
      .limit(CANDIDATES)
    : [];

  const score = new Map<number, number>();
  for (const list of [byVector, byKeyword]) {
    list.forEach((r, rank) => score.set(r.id, (score.get(r.id) ?? 0) + 1 / (RRF_K + rank + 1)));
  }
  if (!score.size) return [];

  const rows = await db
    .select({
      id: c.id, docId: c.docId, heading: c.headingPath, text: c.text, tokens: c.tokens,
      periodFrom: c.periodFrom, periodTo: c.periodTo,
      title: schema.sourceDocs.title, url: schema.sourceDocs.url, license: schema.sourceDocs.license,
    })
    .from(c)
    .innerJoin(schema.sourceDocs, eq(schema.sourceDocs.id, c.docId))
    .where(inArray(c.id, [...score.keys()]));

  const ranked = rows
    .map((r) => {
      const period: [number, number] | null = r.periodFrom !== null && r.periodTo !== null ? [r.periodFrom, r.periodTo] : null;
      const overlap = !!(o.period && period && period[0] <= o.period[1] && period[1] >= o.period[0]);
      return { ...r, period, score: (score.get(r.id) ?? 0) + (overlap ? PERIOD_BOOST : 0) };
    })
    .sort((a, b) => b.score - a.score);

  const out: Retrieved[] = [];
  const fromDoc = new Map<string, number>();
  let used = 0;
  for (const r of ranked) {
    if (out.length >= k) break;
    if ((fromDoc.get(r.docId) ?? 0) >= perDoc) continue;
    if (used + r.tokens > budget && out.length) continue;
    fromDoc.set(r.docId, (fromDoc.get(r.docId) ?? 0) + 1);
    used += r.tokens;
    out.push({
      sid: `S${out.length + 1}`, chunkId: r.id, docId: r.docId, title: r.title, heading: r.heading,
      url: r.url, license: r.license, text: r.text, tokens: r.tokens, period: r.period, score: r.score,
    });
  }
  return out;
}

/** The query's words as an OR tsquery ("rome | beat | carthage"), so one missing word doesn't empty the list. */
export function keywordTerms(query: string): string | null {
  const words = [...new Set(query.toLowerCase().match(/[a-z][a-z0-9]{2,}/g) ?? [])].slice(0, 12);
  return words.length ? words.join(" | ") : null;
}
