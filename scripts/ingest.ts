/**
 * Build the knowledge base (docs/PROTOTYPE_PLAN.md, section 6.2): fetch the Wikipedia articles in
 * content/corpus/wikipedia.txt, cut them into passages, embed what is new or changed, and store
 * everything in Postgres. Re-running is cheap and resumes where it stopped.
 *
 *   npx tsx scripts/ingest.ts                     # the whole list
 *   npx tsx scripts/ingest.ts --limit 5           # the first five titles
 *   npx tsx scripts/ingest.ts --only "Fall of Constantinople"
 *   npx tsx scripts/ingest.ts --dry               # fetch and chunk, embed nothing
 *   npx tsx scripts/ingest.ts --max-tokens 400000 # stop before embedding more than this (free quotas)
 *   npx tsx scripts/ingest.ts --refresh           # fetch articles again even if already embedded
 *
 * Needs DATABASE_URL and the EMBED_* settings (.env.local).
 */
import { readFileSync } from "node:fs";
import { and, count, eq, gte, isNull, ne, or } from "drizzle-orm";
import { loadEnvConfig } from "@next/env";
import { getDb, migrateDb, schema } from "../lib/db/client";
import { chunkArticle, contentHash } from "../lib/rag/chunk";
import { getEmbedder } from "../lib/rag/embed";
import { attributionFor, fetchArticlePolitely, WIKIPEDIA_LICENSE } from "../lib/rag/wikipedia";
import { sleep } from "../lib/llm/sleep";

loadEnvConfig(process.cwd(), true, { info: () => {}, error: console.error });
const args = process.argv.slice(2);
const flag = (name: string) => args.includes(`--${name}`);
const value = (name: string) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : undefined; };

const NEURONS_PER_M = Number(process.env.EMBED_NEURONS_PER_M ?? 1075); // Cloudflare bge-m3

async function main() {
  const db = getDb();
  if (!db) throw new Error("Set DATABASE_URL (docker compose up -d db).");
  await migrateDb();
  const embedder = flag("dry") ? null : getEmbedder();
  if (!embedder && !flag("dry")) throw new Error("Set EMBED_BASE_URL, EMBED_API_KEY and EMBED_MODEL, or use --dry.");
  const maxTokens = Number(value("max-tokens") ?? Infinity);

  let titles = readFileSync("content/corpus/wikipedia.txt", "utf8").split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
  if (value("only")) titles = titles.filter((t) => t === value("only"));
  if (value("limit")) titles = titles.slice(0, Number(value("limit")));

  const totals = { docs: 0, missing: [] as string[], chunks: 0, embedded: 0, unchanged: 0, tokens: 0 };
  let fetched = 0;
  for (const title of titles) {
    if (!flag("refresh") && embedder && await alreadyDone(title, embedder.model)) {
      totals.docs++;
      console.log(`- ${title}: already embedded`);
      continue;
    }
    if (fetched++ > 0) await sleep(1500); // gently: Wikipedia rate-limits bursts
    const a = await fetchArticlePolitely(title);
    if (!a) { totals.missing.push(title); console.log(`- ${title}: not found`); continue; }

    await db.insert(schema.sourceDocs)
      .values({ id: a.id, kind: "wikipedia", title: a.title, url: a.url, license: WIKIPEDIA_LICENSE, attribution: attributionFor(a), revision: a.revision })
      .onConflictDoUpdate({ target: schema.sourceDocs.id, set: { title: a.title, url: a.url, revision: a.revision, attribution: attributionFor(a), fetchedAt: new Date() } });

    const chunks = chunkArticle(a.title, a.extract);
    const existing = new Map((await db.select({ ord: schema.chunks.ord, hash: schema.chunks.contentHash, model: schema.chunks.embeddingModel })
      .from(schema.chunks).where(eq(schema.chunks.docId, a.id))).map((r) => [r.ord, r]));
    const todo = chunks.filter((c) => { const e = existing.get(c.ord); return !e || e.hash !== contentHash(c.text) || e.model !== embedder?.model; });
    const todoTokens = todo.reduce((s, c) => s + c.tokens, 0);
    if (embedder && totals.tokens + todoTokens > maxTokens) {
      console.log(`- ${a.title}: stopping here, the token budget (${maxTokens}) would be passed. Re-run later to continue.`);
      break;
    }

    const vectors = embedder && todo.length ? await embedder.embed(todo.map((c) => `${c.headingPath}\n${c.text}`)) : [];
    for (const [j, c] of todo.entries()) {
      const row = {
        docId: a.id, ord: c.ord, headingPath: c.headingPath, text: c.text, tokens: c.tokens,
        periodFrom: c.period?.[0] ?? null, periodTo: c.period?.[1] ?? null, contentHash: contentHash(c.text),
        embedding: vectors[j] ?? null, embeddingModel: embedder?.model ?? null,
      };
      await db.insert(schema.chunks).values(row).onConflictDoUpdate({ target: [schema.chunks.docId, schema.chunks.ord], set: row });
    }
    await db.delete(schema.chunks).where(and(eq(schema.chunks.docId, a.id), gte(schema.chunks.ord, chunks.length)));

    totals.docs++;
    totals.chunks += chunks.length;
    totals.embedded += embedder ? todo.length : 0;
    totals.unchanged += chunks.length - todo.length;
    totals.tokens += embedder ? todoTokens : 0;
    console.log(`- ${a.title}: ${chunks.length} passages, ${embedder ? todo.length : 0} embedded (~${todoTokens} tokens)`);
  }

  console.log(`\n${totals.docs} articles, ${totals.chunks} passages: ${totals.embedded} embedded, ${totals.unchanged} unchanged.`);
  if (totals.tokens) console.log(`About ${totals.tokens} tokens embedded (~${Math.round((totals.tokens * NEURONS_PER_M) / 1e6)} Cloudflare neurons).`);
  if (totals.missing.length) console.log(`Not found: ${totals.missing.join(", ")}`);
  process.exit(0);
}

/** True when the article is stored and every passage has a vector from `model`. */
async function alreadyDone(title: string, model: string): Promise<boolean> {
  const db = getDb()!;
  const id = `wiki:${title.replace(/ /g, "_")}`;
  const [doc] = await db.select({ id: schema.sourceDocs.id }).from(schema.sourceDocs).where(eq(schema.sourceDocs.id, id));
  if (!doc) return false;
  const [stale] = await db.select({ n: count() }).from(schema.chunks)
    .where(and(eq(schema.chunks.docId, id), or(isNull(schema.chunks.embedding), ne(schema.chunks.embeddingModel, model), isNull(schema.chunks.embeddingModel))));
  const [all] = await db.select({ n: count() }).from(schema.chunks).where(eq(schema.chunks.docId, id));
  return all.n > 0 && stale.n === 0;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
