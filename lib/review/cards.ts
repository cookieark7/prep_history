import type { Block, CauseGraphBlock, ChronologyItem, QuizItem, StreamLine, TimelineBlock } from "@/lib/contracts";
import { contentHash } from "@/lib/rag/chunk";

// Where review cards come from (docs/PROTOTYPE_PLAN.md, section 7.2):
// 1. the Director's card lines: the key ideas of a new lesson;
// 2. without an extra model call: a timeline with 3+ events gives one ordering card, and each
//    quiz item becomes a card of the same kind (both checked automatically);
// 3. if the Director sent no cards for a new cause map, its strongest links become "how did A
//    lead to B?" cards, answered by the link's own "why".

export interface NewCard {
  kind: string;
  front: string;
  back: string;
  payload?: unknown;
  sourceRef: { block: string; node: string | null } | null;
  cites: string[];
  origin: "model" | "timeline" | "quiz" | "graph" | "note";
}

/** Normalised question text: the same idea asked twice is one card. */
export const frontHash = (front: string) => contentHash(front.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim());

export function cardsFromTurn(lines: StreamLine[]): NewCard[] {
  const out: NewCard[] = [];
  const added = lines.flatMap((l) => (l.t === "op" && l.op.op === "add" ? [l.op.block] : []));

  for (const l of lines) {
    if (l.t !== "card") continue;
    out.push({ kind: l.card.kind, front: l.card.front, back: l.card.back, sourceRef: l.card.source_ref, cites: l.card.cites ?? [], origin: "model" });
  }
  for (const b of added) {
    if (b.type === "timeline") { const c = timelineCard(b); if (c) out.push(c); }
    if (b.type === "quiz") out.push(...b.items.map((it) => quizCard(it)));
  }
  if (!out.some((c) => c.origin === "model")) {
    for (const b of added) if (b.type === "cause_graph") out.push(...graphCards(b));
  }

  const seen = new Set<string>();
  return out.filter((c) => { const h = frontHash(c.front); if (seen.has(h)) return false; seen.add(h); return true; });
}

/** Up to five of the most important events, to put in order. */
export function timelineCard(b: TimelineBlock): NewCard | null {
  const events = [...b.events].sort((x, y) => y.importance - x.importance || x.start - y.start).slice(0, 5);
  if (events.length < 3) return null;
  const item: ChronologyItem = {
    kind: "chronology", id: `${b.id}-order`, stem: `Put these in order: ${b.title}`,
    events: events.map((e) => ({ id: e.id, label: e.label, year: e.start })),
    source_ref: { block: b.id, node: null },
  };
  const ordered = [...events].sort((x, y) => x.start - y.start).map((e) => e.label);
  return { kind: "chronology", front: item.stem, back: ordered.join(" → "), payload: item, sourceRef: item.source_ref, cites: [], origin: "timeline" };
}

export function quizCard(it: QuizItem): NewCard {
  const back =
    it.kind === "mcq" ? `${it.options.find((o) => o.id === it.answer_id)?.text ?? ""}. ${it.why}` :
    it.kind === "chronology" ? [...it.events].sort((x, y) => x.year - y.year).map((e) => e.label).join(" → ") :
    it.explain;
  return { kind: it.kind, front: it.stem, back: back.trim(), payload: it, sourceRef: it.source_ref, cites: [], origin: "quiz" };
}

/**
 * A node label inside a question, with the article it needs: "The fall of Rome" reads as "the fall
 * of Rome", and named events take "the" ("the Siege of Saguntum", "the Second Punic War"). Other
 * labels are left as they are rather than guessed at.
 */
const NEEDS_THE = /^(First|Second|Third|Fourth|Fifth|Siege|Battle|Treaty|Fall|Rise|Revolt|Partition|Sack|Collapse|Conquest|Death|Spread|Growth|Decline|Expansion|Loss|Defeat|Victory)\b/;
const inSentence = (l: string) => (/^(The|A|An) /.test(l) ? l[0].toLowerCase() + l.slice(1) : NEEDS_THE.test(l) ? `the ${l}` : l);

/** The strongest links into and out of the event: established or likely, at most four. */
export function graphCards(b: CauseGraphBlock): NewCard[] {
  const label = new Map(b.nodes.map((n) => [n.id, n.label]));
  const event = b.nodes.find((n) => n.layer === "event")?.id;
  const rank = (e: CauseGraphBlock["edges"][number]) => (e.to === event || e.from === event ? 0 : 1) + (e.confidence === "E" ? 0 : 0.5);
  return b.edges
    .filter((e) => e.confidence !== "C" && label.has(e.from) && label.has(e.to) && e.why.length > 8)
    .sort((x, y) => rank(x) - rank(y))
    .slice(0, 4)
    .map((e) => ({
      kind: e.from === event ? "consequence" : "why",
      // asked the way a student would: what came of the event, or what part a cause played in it
      front: e.from === event
        ? `What did ${inSentence(label.get(e.from)!)} lead to?`
        : `What part did ${inSentence(label.get(e.from)!)} play in ${inSentence(label.get(e.to)!)}?`,
      back: e.from === event ? `${label.get(e.to)}. ${e.why}` : e.why,
      sourceRef: { block: b.id, node: e.to === event ? e.from : e.to },
      cites: [],
      origin: "graph" as const,
    }));
}

export type { Block };
