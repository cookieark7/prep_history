import { and, cosineDistance, eq, gte, inArray, isNotNull, lte, sql } from "drizzle-orm";
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
  /** only passages whose years overlap this span (passages without years are left out) */
  within?: [number, number] | null;
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

  const inSpan = o.within ? and(lte(c.periodFrom, o.within[1]), gte(c.periodTo, o.within[0])) : undefined;
  const [qv] = await embedder.embed([o.query], o.signal);
  const byVector = await db.select({ id: c.id }).from(c)
    .where(and(eq(c.embeddingModel, embedder.model), isNotNull(c.embedding), inSpan))
    .orderBy(cosineDistance(c.embedding, qv))
    .limit(CANDIDATES);

  const terms = keywordTerms(o.query);
  const byKeyword = terms
    ? await db.select({ id: c.id }).from(c)
      .where(and(eq(c.embeddingModel, embedder.model), sql`${c.tsv} @@ to_tsquery('english', ${terms})`, inSpan))
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

/**
 * "What was happening in China while Rome fought Carthage?": the subject (China) and the clock
 * (Rome against Carthage). Only when the first half names something, so "What happened while I
 * was away" or "Why did Rome win when…" are left as one question. Null when it isn't this shape.
 */
export function meanwhileParts(query: string): { subject: string; anchor: string } | null {
  const m = /^(.+?)[,\s]+\b(while|at the same time as|in the same years as|meanwhile|during the time when|during the time that)\b[,\s]+(.+)$/i.exec(query.trim());
  if (!m) return null;
  const subject = m[1].trim();
  const anchor = m[3].trim();
  // the subject names a place, people or thing: a capitalised word after its first word
  if (!/\s[A-Z][\p{L}'’-]+/u.test(subject) || anchor.length < 3) return null;
  return { subject, anchor };
}

/**
 * Passages for a "meanwhile" question: the clock's own passages give its span of years, and the
 * subject is searched within that span; half each, subject first, renumbered S1… Without a
 * dated clock passage, or with nothing for the subject in that span, a plain search instead.
 */
export async function retrieveMeanwhile(
  db: Db, embedder: Embedder, parts: { subject: string; anchor: string }, o: Omit<RetrieveOptions, "query" | "within">,
): Promise<Retrieved[]> {
  const k = o.k ?? 6;
  const half = Math.max(2, Math.ceil(k / 2));
  const budget = (o.tokenBudget ?? 2200) / 2;
  const anchor = await retrieve(db, embedder, { ...o, query: parts.anchor, k: half, tokenBudget: budget });
  const span = spanOf(anchor);
  const subject = span ? await retrieve(db, embedder, { ...o, query: parts.subject, within: span, k: half, tokenBudget: budget }) : [];
  if (!subject.length) return retrieve(db, embedder, { ...o, query: `${parts.subject} ${parts.anchor}`, k });
  const seen = new Set<number>();
  return [...subject, ...anchor]
    .filter((r) => (seen.has(r.chunkId) ? false : (seen.add(r.chunkId), true)))
    .slice(0, k)
    .map((r, i) => ({ ...r, sid: `S${i + 1}` }));
}

/** The years the clock's passages cover; spans over 300 years (a passage that ranges widely) don't count. */
function spanOf(rs: Retrieved[]): [number, number] | null {
  const dated = rs.flatMap((r) => (r.period && r.period[1] - r.period[0] <= 300 ? [r.period] : []));
  if (!dated.length) return null;
  return [Math.min(...dated.map((p) => p[0])), Math.max(...dated.map((p) => p[1]))];
}

/** The query's words as an OR tsquery ("rome | beat | carthage"), so one missing word doesn't empty the list. */
export function keywordTerms(query: string): string | null {
  const words = [...new Set(query.toLowerCase().match(/[a-z][a-z0-9]{2,}/g) ?? [])].slice(0, 12);
  return words.length ? words.join(" | ") : null;
}
