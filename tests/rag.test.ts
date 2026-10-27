import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { StreamLine } from "@/lib/contracts";
import type { Db } from "@/lib/db/client";
import * as schema from "@/lib/db/schema";
import { chunkArticle, contentHash, sections, textPeriod } from "@/lib/rag/chunk";
import { Citations, formatSources, withCitations } from "@/lib/rag/citations";
import { fakeEmbedder } from "@/lib/rag/embed";
import { keywordTerms, retrieve, type Retrieved } from "@/lib/rag/retrieve";
import { testDb } from "./helpers/db";

const para = (topic: string, n = 60) => `${topic} ${"word ".repeat(n)}ended.`;
const EXTRACT = [
  "The Second Punic War (218 to 201 BC) was fought between Carthage and Rome.",
  "",
  "== Background ==",
  para("Hamilcar Barca built Carthaginian power in Iberia after 241 BC."),
  "",
  "=== Saguntum ===",
  para("The siege of Saguntum in 219 BC gave Rome its cause for war."),
  "",
  "== Cannae ==",
  para("At Cannae in 216 BC Hannibal encircled a much larger Roman army.", 200),
  para("Rome refused to make peace and kept raising legions.", 200),
  "",
  "== See also ==",
  "First Punic War",
  "=== Lists ===",
  "List of wars",
  "",
  "== Legacy ==",
  para("The war made Rome dominant in the western Mediterranean by 1500 accounts."),
].join("\n");

describe("chunking", () => {
  it("splits by section with heading paths and skips link sections and their subsections", () => {
    const s = sections("Second Punic War", EXTRACT).map(([h]) => h);
    expect(s).toEqual([
      "Second Punic War", "Second Punic War › Background", "Second Punic War › Background › Saguntum",
      "Second Punic War › Cannae", "Second Punic War › Legacy",
    ]);
  });

  it("packs paragraphs into ~250-word chunks", () => {
    const chunks = chunkArticle("Second Punic War", EXTRACT);
    const cannae = chunks.filter((c) => c.headingPath.endsWith("Cannae"));
    expect(cannae).toHaveLength(2);
    expect(cannae[1].text.startsWith("Rome refused")).toBe(true); // a 200-word sentence is too long to carry
    expect(chunks.map((c) => c.ord)).toEqual(chunks.map((_, i) => i));
    expect(Math.max(...chunks.map((c) => c.tokens))).toBeLessThan(600);
  });

  it("carries the last short sentence of a chunk into the next one", () => {
    const short = (tag: string) => Array.from({ length: 16 }, (_, i) => `${tag} sentence ${i} has a few words in it.`).join(" ");
    const chunks = chunkArticle("T", ["== S ==", short("Alpha"), short("Beta"), short("Gamma")].join("\n"));
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[1].text.startsWith("Alpha sentence 15 has a few words in it.")).toBe(true);
  });

  it("reads only real years: eras and four-digit years, not other numbers", () => {
    expect(textPeriod("From 218 to 201 BC, then AD 476.")).toEqual([-201, 476]); // "218" alone has no era here
    expect(textPeriod("In 216 BC Hannibal had 40,000 men and 1,200 horses.")).toEqual([-216, -216]);
    expect(textPeriod("The fall of Constantinople in 1453 ended it.")).toEqual([1453, 1453]);
    expect(textPeriod("No years at all, only 300 ships.")).toBeNull();
  });

  it("hashes text stably", () => {
    expect(contentHash("abc")).toBe(contentHash("abc"));
    expect(contentHash("abc")).not.toBe(contentHash("abd"));
  });
});

describe("retrieval", () => {
  let db: Db;
  let close: () => Promise<void>;
  const embedder = fakeEmbedder();
  const docs: [string, string, [number, number] | null][] = [
    ["Hannibal crossed the Alps with elephants and won at Cannae against Rome.", "Second Punic War › Cannae", [-216, -216]],
    ["Rome raised new legions after Cannae; the Italian allies mostly stayed loyal to Rome.", "Second Punic War › Allies", [-216, -210]],
    ["Scipio invaded Africa and defeated Hannibal at Zama, ending the war with Carthage.", "Second Punic War › Zama", [-202, -202]],
    ["Mehmed II besieged Constantinople with great cannon in 1453.", "Fall of Constantinople › Siege", [1453, 1453]],
    ["Akbar expanded the Mughal Empire and reformed its administration.", "Akbar › Reign", [1556, 1605]],
  ];
  beforeAll(async () => {
    ({ db, close } = await testDb());
    await db.insert(schema.sourceDocs).values([
      { id: "wiki:Second_Punic_War", kind: "wikipedia", title: "Second Punic War", url: "https://en.wikipedia.org/wiki/Second_Punic_War", license: "CC BY-SA 4.0", attribution: "x" },
      { id: "wiki:Other", kind: "wikipedia", title: "Other", url: "https://en.wikipedia.org/wiki/Other", license: "CC BY-SA 4.0", attribution: "x" },
    ]);
    const vecs = await embedder.embed(docs.map((d) => d[0]));
    await db.insert(schema.chunks).values(docs.map(([text, heading, p], i) => ({
      docId: i < 3 ? "wiki:Second_Punic_War" : "wiki:Other", ord: i, headingPath: heading, text, tokens: 30,
      periodFrom: p?.[0] ?? null, periodTo: p?.[1] ?? null, contentHash: contentHash(text), embedding: vecs[i], embeddingModel: embedder.model,
    })));
  }, 30_000);
  afterAll(() => close());

  it("finds the passages about the question, at most two per article, numbered S1…", async () => {
    const r = await retrieve(db, embedder, { query: "Why did Rome win after Cannae against Hannibal?", k: 4 });
    expect(r[0].text).toMatch(/Cannae/);
    expect(r.map((x) => x.sid)).toEqual(r.map((_, i) => `S${i + 1}`));
    expect(r.filter((x) => x.docId === "wiki:Second_Punic_War").length).toBeLessThanOrEqual(2);
    expect(r[0]).toMatchObject({ title: "Second Punic War", license: "CC BY-SA 4.0" });
  });

  it("keeps to the token budget but always returns at least one passage", async () => {
    expect(await retrieve(db, embedder, { query: "Constantinople cannon siege", tokenBudget: 40 })).toHaveLength(1);
  });

  it("only compares vectors from the current embedding model", async () => {
    const other = { ...fakeEmbedder(), model: "another-model" };
    expect(await retrieve(db, other, { query: "Cannae" })).toEqual([]);
  });

  it("builds an OR keyword query from the question", () => {
    expect(keywordTerms("Why did Rome beat Carthage?")).toBe("why | did | rome | beat | carthage");
    expect(keywordTerms("?!")).toBeNull();
  });
});

describe("citations", () => {
  const src = (sid: string, chunkId: number): Retrieved => ({
    sid, chunkId, docId: "wiki:X", title: "Second Punic War", heading: "Second Punic War › Cannae",
    url: "https://en.wikipedia.org/wiki/Second_Punic_War", license: "CC BY-SA 4.0", text: "At Cannae Hannibal won.", tokens: 6, period: [-216, -216], score: 1,
  });
  const article: StreamLine = { t: "op", op: { op: "add", after: null, block: {
    id: "b1", type: "article", title: "Why Rome won [S1]", because: "x",
    sections: [{ h: "In brief", md: "Hannibal won at Cannae in 216 BCE [E][S1]. Rome kept fighting [L][S2, S9].", depth: "brief" }],
  } } };

  it("turns [S#] into stable chunk markers in markdown, removes unknown ids and citations elsewhere", () => {
    const c = new Citations([src("S1", 101), src("S2", 102)]);
    const out = c.line(article) as Extract<StreamLine, { t: "op" }>;
    const block = (out.op as { block: { title: string; sections: { md: string }[] } }).block;
    expect(block.sections[0].md).toBe("Hannibal won at Cannae in 216 BCE [E][S:101]. Rome kept fighting [L][S:102].");
    expect(block.title).toBe("Why Rome won");
    expect(c.stats).toEqual({ cited: 2, removed: 2 });
    expect(c.line({ t: "say", text: "Focused on Cannae [S1]." })).toEqual({ t: "say", text: "Focused on Cannae." });
  });

  it("sends the cited sources just before done, and nothing when nothing was cited", async () => {
    async function* lines(): AsyncGenerator<StreamLine> { yield { t: "say", text: "hi" }; yield article; yield { t: "done" }; }
    const out: StreamLine[] = [];
    for await (const l of withCitations(lines(), new Citations([src("S1", 101), src("S2", 102)]))) out.push(l);
    expect(out.map((l) => l.t)).toEqual(["say", "op", "sources", "done"]);
    expect(out[2]).toMatchObject({ t: "sources", items: [{ id: "101", title: "Second Punic War" }, { id: "102" }] });

    const none = new Citations([]);
    expect(none.sourcesLine()).toBeNull();
  });

  it("formats the sources block for the Director", () => {
    expect(formatSources([src("S1", 101)])).toBe("<sources>\n[S1] Second Punic War › Cannae (years -216 to -216)\nAt Cannae Hannibal won.\n\n</sources>");
    expect(formatSources([])).toBe("");
  });
});
