// Turn a plain-text article into passages (docs/PROTOTYPE_PLAN.md, section 6.2): split by
// section, then pack paragraphs into chunks of about 250 words (never more than 380), carrying
// one sentence over between neighbours so a fact cut at a boundary is still findable.

export interface Chunk {
  ord: number;
  headingPath: string;
  text: string;
  tokens: number;
  period: [number, number] | null;
}

const TARGET_WORDS = 250;
const MAX_WORDS = 380;
const MIN_WORDS = 40;
/** Wikipedia sections that are lists of links or references, not prose. */
const SKIP = /^(see also|references|notes|footnotes|citations|sources|bibliography|further reading|external links|works cited|primary sources|secondary sources|explanatory notes|gallery)$/i;

const words = (s: string) => s.split(/\s+/).filter(Boolean).length;
export const estimateTokens = (s: string) => Math.ceil(words(s) * 1.35);

/**
 * Sections of a MediaWiki plain-text extract ("== Heading ==" lines, deeper levels with more "=").
 * Returns [heading path, paragraphs] pairs; skipped sections drop their subsections too.
 */
export function sections(title: string, extract: string): [string, string[]][] {
  const out: [string, string[]][] = [];
  const path: string[] = [];
  let skipLevel = 0;
  let paras: string[] = [];
  const flush = () => {
    if (paras.length && !skipLevel) out.push([[title, ...path].join(" › "), paras]);
    paras = [];
  };
  for (const raw of extract.split("\n")) {
    const line = raw.trim();
    const h = /^(={2,6})\s*(.+?)\s*\1$/.exec(line);
    if (h) {
      flush();
      const level = h[1].length - 1; // "==" is level 1
      path.length = level - 1;
      path[level - 1] = h[2];
      if (skipLevel && level <= skipLevel) skipLevel = 0;
      if (!skipLevel && SKIP.test(h[2])) skipLevel = level;
      continue;
    }
    if (line) paras.push(line);
  }
  flush();
  return out;
}

export function chunkArticle(title: string, extract: string): Chunk[] {
  const chunks: Chunk[] = [];
  for (const [headingPath, paras] of sections(title, extract)) {
    let cur: string[] = [];
    let carry = "";
    const emit = () => {
      const body = cur.join("\n\n").trim();
      if (words(body) >= MIN_WORDS || (body && !chunks.length)) {
        const text = carry ? `${carry} ${body}` : body;
        chunks.push({ ord: chunks.length, headingPath, text, tokens: estimateTokens(text), period: textPeriod(text) });
        carry = lastSentence(body);
      }
      cur = [];
    };
    for (const p of splitLong(paras)) {
      if (words(cur.join(" ")) + words(p) > TARGET_WORDS && cur.length) emit();
      cur.push(p);
    }
    if (cur.length) emit();
  }
  return chunks;
}

/** Paragraphs longer than MAX_WORDS, cut at sentence ends. */
function splitLong(paras: string[]): string[] {
  const out: string[] = [];
  for (const p of paras) {
    if (words(p) <= MAX_WORDS) { out.push(p); continue; }
    let cur = "";
    for (const s of sentences(p)) {
      if (words(cur) + words(s) > TARGET_WORDS && cur) { out.push(cur.trim()); cur = ""; }
      cur += `${s} `;
    }
    if (cur.trim()) out.push(cur.trim());
  }
  return out;
}

const sentences = (p: string) => p.match(/[^.!?]+[.!?]+["')\]]*\s*|[^.!?]+$/g) ?? [p];
const lastSentence = (p: string) => {
  const s = sentences(p).at(-1)?.trim() ?? "";
  return words(s) <= 40 ? s : "";
};

/**
 * The span of years a passage talks about. Stricter than lib/period's yearsInText, because
 * encyclopedia text is full of other numbers: only years with an era ("218 BC", "AD 476")
 * and four-digit years from 1000 to 2099 count.
 */
export function textPeriod(text: string): [number, number] | null {
  const years: number[] = [];
  for (const m of text.matchAll(/\b(\d{1,4})(?:\s*[-–]\s*(\d{1,4}))?\s*(BCE|BC|CE|AD)\b/g)) {
    const bce = /^B/.test(m[3]);
    for (const y of [m[1], m[2]]) if (y) years.push(bce ? -Number(y) : Number(y));
  }
  for (const m of text.matchAll(/\bAD\s*(\d{1,4})\b/g)) years.push(Number(m[1]));
  for (const m of text.replace(/\b\d{1,4}(?:\s*[-–]\s*\d{1,4})?\s*(BCE|BC|CE|AD)\b/g, " ").matchAll(/(?<![\d,.])\b(1\d{3}|20\d{2})\b(?![\d,])/g)) {
    years.push(Number(m[1]));
  }
  const ok = years.filter((y) => y !== 0);
  return ok.length ? [Math.min(...ok), Math.max(...ok)] : null;
}

/** Stable short hash of a chunk's text, to skip re-embedding unchanged passages. */
export function contentHash(s: string): string {
  let h1 = 0x811c9dc5, h2 = 0x01000193;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193);
    h2 = Math.imul(h2 ^ c, 0x5bd1e995);
  }
  return (h1 >>> 0).toString(16).padStart(8, "0") + (h2 >>> 0).toString(16).padStart(8, "0");
}
