// Light repair before validation (docs/PROTOTYPE_PLAN.md, section 5.4). Smaller and free models
// make a few slips that have exactly one sensible fix; fixing them saves the whole block instead
// of dropping it. Only these are touched: confidence words, over-long short fields, a callout
// without a title, years written as text, importance out of range, and cause-graph nodes that
// leave out "when" or "t_offset" (both mean "unknown" when null), an article section without a
// depth (the first of a new article is brief, any other standard), and, in text that does not
// parse, a stray quote between two items and brackets that do not match (mendJson). Everything else is left for validation to
// accept or drop. Every fix is reported, so evals show how much a model needs this.

type Obj = Record<string, unknown>;

const CONFIDENCE: Record<string, "E" | "L" | "C"> = {
  e: "E", established: "E", high: "E", certain: "E", strong: "E", confirmed: "E",
  l: "L", likely: "L", medium: "L", moderate: "L", probable: "L", plausible: "L",
  c: "C", contested: "C", low: "C", disputed: "C", debated: "C", uncertain: "C", weak: "C",
};
const CALLOUT_TITLE: Record<string, string> = {
  anchor: "Remember this", mnemonic: "Mnemonic", debate: "Live debate", meanwhile: "Meanwhile", terms: "Terms",
};

export interface Repaired { value: unknown; fixes: string[] }

const DEPTHS = new Set(["brief", "standard", "deep"]);

/**
 * JSON text that doesn't parse, mended for the two slips free models make in long quiz lines: a
 * stray `"},` between two items (`…}},"},{"kind"…`), and brackets that don't match. Null when
 * neither applies.
 */
export function mendJson(text: string): { text: string; fixes: string[] } | null {
  const fixes: string[] = [];
  let t = text.replace(/\}(\s*),(\s*)"\}(\s*),(\s*)\{/g, "},{");
  if (t !== text) fixes.push("removed a stray quote between items");
  try {
    JSON.parse(t);
  } catch {
    const balanced = rebalanceJson(t);
    if (balanced !== null) { t = balanced; fixes.push("balanced its brackets"); }
  }
  return fixes.length ? { text: t, fixes } : null;
}

/**
 * JSON whose brackets don't match, as free models write long quiz lines: a closing bracket that
 * doesn't close the innermost open one is dropped ("null}}},{" with one brace too many), and
 * whatever is still open at the end is closed. Null when nothing needed changing.
 */
export function rebalanceJson(text: string): string | null {
  const open: string[] = [];
  let out = "", changed = false, inString = false, escaped = false;
  for (const ch of text) {
    if (inString) {
      out += ch;
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{" || ch === "[") open.push(ch === "{" ? "}" : "]");
    else if (ch === "}" || ch === "]") {
      if (open.at(-1) !== ch) { changed = true; continue; }
      open.pop();
    }
    out += ch;
  }
  if (inString || (!changed && !open.length)) return null;
  return out + open.reverse().join("");
}

export function repairLine(input: unknown): Repaired {
  const fixes: string[] = [];
  if (!isObj(input)) return { value: input, fixes };
  const line = structuredClone(input);
  const fix = (what: string) => { if (!fixes.includes(what)) fixes.push(what); };

  if (line.t === "say") clipField(line, "text", 280, fix);
  if (line.t === "followup") clipField(line, "label", 60, fix);
  if (line.t === "card" && isObj(line.card)) {
    clipField(line.card, "front", 160, fix);
    clipField(line.card, "back", 280, fix);
    if (isObj(line.card.source_ref) && !("node" in line.card.source_ref)) { line.card.source_ref.node = null; fix("card node"); }
  }
  if (line.t === "op" && isObj(line.op)) {
    const op = line.op;
    if (op.op === "add" && isObj(op.block)) repairBlock(op.block, true, fix);
    if (op.op === "patch" && isObj(op.set)) repairBlock(op.set, false, fix);
  }
  return { value: line, fixes };
}

/** A whole block (add) or the changed fields of one (patch). */
function repairBlock(b: Obj, whole: boolean, fix: (what: string) => void) {
  if (whole && b.type === "callout" && typeof b.title !== "string" && typeof b.kind === "string" && CALLOUT_TITLE[b.kind]) {
    b.title = CALLOUT_TITLE[b.kind];
    fix("callout title");
  }
  if (whole && typeof b.because !== "string" && typeof b.title === "string") {
    b.because = "";
    fix("missing because");
  }
  clipField(b, "title", 80, fix);
  clipField(b, "because", 80, fix);

  for (const [i, s] of objs(b.sections).entries()) {
    const d = typeof s.depth === "string" ? s.depth.trim().toLowerCase() : "";
    if (d === s.depth && DEPTHS.has(d)) continue;
    s.depth = DEPTHS.has(d) ? d : whole && i === 0 ? "brief" : "standard";
    fix("section depth");
  }

  for (const n of objs(b.nodes)) {
    if (whole) {
      for (const k of ["when", "t_offset"]) if (!(k in n)) { n[k] = null; fix("missing when/t_offset"); }
    }
    confidence(n, fix);
    clipField(n, "label", 60, fix);
    year(n, "when", fix);
    year(n, "t_offset", fix);
  }
  for (const e of objs(b.edges)) {
    confidence(e, fix);
    clipField(e, "why", 160, fix);
  }
  for (const ev of objs(b.events)) {
    confidence(ev, fix);
    clipField(ev, "label", 50, fix);
    year(ev, "start", fix);
    year(ev, "end", fix);
    if (typeof ev.importance === "number" && (ev.importance < 1 || ev.importance > 3 || !Number.isInteger(ev.importance))) {
      ev.importance = Math.min(3, Math.max(1, Math.round(ev.importance)));
      fix("importance");
    }
  }
  for (const l of objs(b.links)) confidence(l, fix);
  for (const p of objs(b.people)) { year(p, "start", fix); year(p, "end", fix); year(p, "gen", fix); }
  if (whole && b.type === "lineage") generations(b, fix);
  for (const item of objs(b.items)) for (const ev of objs(item.events)) year(ev, "year", fix);
  if (isObj(b.range)) { year(b.range, "from", fix); year(b.range, "to", fix); }
}

/**
 * Lineage people need a generation number. When some are missing or not numbers ("M"), work them
 * out from the parent links: people with no parent shown are generation 1, their children 2, …
 */
function generations(b: Obj, fix: (what: string) => void) {
  const people = objs(b.people);
  if (!people.length || people.every((p) => Number.isInteger(p.gen) && (p.gen as number) >= 1 && (p.gen as number) <= 8)) return;
  const parents = new Map<string, string[]>();
  for (const l of objs(b.links)) {
    if (l.rel === "parent" && typeof l.from === "string" && typeof l.to === "string") parents.set(l.to, [...(parents.get(l.to) ?? []), l.from]);
  }
  const depth = (id: string, seen: Set<string>): number => {
    if (seen.has(id)) return 1;
    seen.add(id);
    const ps = parents.get(id) ?? [];
    return ps.length ? 1 + Math.max(...ps.map((p) => depth(p, seen))) : 1;
  };
  for (const p of people) if (typeof p.id === "string") p.gen = Math.min(8, depth(p.id, new Set()));
  fix("lineage generations");
}

function confidence(o: Obj, fix: (what: string) => void) {
  const v = o.confidence;
  if (typeof v !== "string" || v === "E" || v === "L" || v === "C") return;
  const mapped = CONFIDENCE[v.trim().toLowerCase()];
  if (mapped) { o.confidence = mapped; fix("confidence words"); }
}

/** "-218", "218 BCE", "218 BC", "1453 CE", "2" → integers. Ranges and prose are left alone. */
function year(o: Obj, key: string, fix: (what: string) => void) {
  const v = o[key];
  if (typeof v !== "string") return;
  const m = /^\s*(-?\d+)\s*(BCE|BC|CE|AD)?\s*$/i.exec(v);
  if (!m) return;
  const n = Number(m[1]);
  o[key] = m[2] && /^B/i.test(m[2]) ? -Math.abs(n) : n;
  fix("years as text");
}

function clipField(o: Obj, key: string, max: number, fix: (what: string) => void) {
  const v = o[key];
  if (typeof v !== "string" || v.length <= max) return;
  o[key] = clip(v, max);
  fix(`${key} too long`);
}

/** Cut to `max` characters at a word boundary, ending with an ellipsis. */
export function clip(s: string, max: number): string {
  if (s.length <= max) return s;
  const cut = s.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,;:.–-]+$/, "")}…`;
}

const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const objs = (v: unknown): Obj[] => (Array.isArray(v) ? v.filter(isObj) : []);
