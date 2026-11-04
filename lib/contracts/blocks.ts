import { z } from "zod";
import { Confidence, Layer, Depth } from "./common";

const Common = {
  id: z.string().regex(/^b\d+$/),
  title: z.string().max(80),
  because: z.string().max(80), // why this block exists, tied to what the learner asked
};

const SourceRef = z.object({ block: z.string(), node: z.string().nullable() });

export const ArticleBlock = z.object({
  ...Common, type: z.literal("article"),
  sections: z.array(z.object({
    h: z.string(),
    md: z.string(), // claims tagged [E]/[L]/[C]; entities as [[Name|person|place|event|term]]
    depth: Depth, // the client filters by the depth toggle, no LLM call
  })).min(1),
});

export const CauseGraphBlock = z.object({
  ...Common, type: z.literal("cause_graph"),
  nodes: z.array(z.object({
    id: z.string(), label: z.string().max(60), layer: Layer,
    when: z.number().int().nullable(), // year, for causes and the event
    t_offset: z.number().nullable(), // years after the event, for consequences
    confidence: Confidence,
  })).min(3).max(16),
  edges: z.array(z.object({
    from: z.string(), to: z.string(), confidence: Confidence,
    why: z.string().max(160), // ONE sentence explaining the link
  })),
});

export const TimelineBlock = z.object({
  ...Common, type: z.literal("timeline"),
  range: z.object({ from: z.number().int(), to: z.number().int() }),
  tracks: z.array(z.object({ id: z.string(), label: z.string() })).min(1).max(5),
  events: z.array(z.object({
    id: z.string(), track: z.string(), start: z.number().int(),
    end: z.number().int().nullable(), label: z.string().max(50),
    importance: z.number().int().min(1).max(3), confidence: Confidence,
  })).max(30),
});

// Approximate by design. Succession order matters more than family detail.
export const LineageBlock = z.object({
  ...Common, type: z.literal("lineage"),
  people: z.array(z.object({
    id: z.string(), name: z.string(), gen: z.number().int().min(1).max(8),
    start: z.number().int().nullable(), end: z.number().int().nullable(), // reign or lifespan, years
    approx: z.boolean(),
    key_events: z.array(z.string()).max(3), // short labels
  })).min(2).max(16),
  links: z.array(z.object({
    from: z.string(), to: z.string(),
    rel: z.enum(["parent", "spouse", "succeeded", "claimed"]),
    confidence: Confidence,
  })),
});

export const PredictGateBlock = z.object({
  ...Common, type: z.literal("predict_gate"),
  prompt: z.string(),
  options: z.array(z.object({ id: z.string(), label: z.string() })).min(3).max(5),
  answer_id: z.string(),
  explanation: z.string(),
  reveals: z.string(), // id of the block that stays blurred until answered or skipped
});

export const McqItem = z.object({
  kind: z.literal("mcq"), id: z.string(), stem: z.string(),
  options: z.array(z.object({ id: z.string(), text: z.string() })).min(3).max(5),
  answer_id: z.string(), why: z.string(),
  source_ref: SourceRef,
});

export const ChronologyItem = z.object({
  kind: z.literal("chronology"), id: z.string(), stem: z.string(),
  events: z.array(z.object({ id: z.string(), label: z.string(), year: z.number().int() })).min(3).max(5),
  source_ref: SourceRef,
});

export const MatchItem = z.object({
  kind: z.literal("match"), id: z.string(), stem: z.string(),
  pairs: z.array(z.object({ left: z.string(), right: z.string() })).min(3).max(5),
  explain: z.string(),
  source_ref: SourceRef,
});

export const QuizItem = z.discriminatedUnion("kind", [McqItem, ChronologyItem, MatchItem]);

// The UI derives chronology correctness from years; mcq carries its own answer.
export const QuizBlock = z.object({
  ...Common, type: z.literal("quiz"),
  items: z.array(QuizItem).min(1).max(6),
});

export const CalloutBlock = z.object({
  ...Common, type: z.literal("callout"),
  kind: z.enum(["anchor", "mnemonic", "debate", "meanwhile", "terms"]), // terms: an exam lesson's glossary
  md: z.string(),
});

export const Block = z.discriminatedUnion("type", [
  ArticleBlock, CauseGraphBlock, TimelineBlock, LineageBlock,
  PredictGateBlock, QuizBlock, CalloutBlock,
]);

export type Block = z.infer<typeof Block>;
export type BlockType = Block["type"];
export type ArticleBlock = z.infer<typeof ArticleBlock>;
export type CauseGraphBlock = z.infer<typeof CauseGraphBlock>;
export type CauseNode = CauseGraphBlock["nodes"][number];
export type CauseEdge = CauseGraphBlock["edges"][number];
export type TimelineBlock = z.infer<typeof TimelineBlock>;
export type LineageBlock = z.infer<typeof LineageBlock>;
export type PredictGateBlock = z.infer<typeof PredictGateBlock>;
export type QuizBlock = z.infer<typeof QuizBlock>;
export type QuizItem = z.infer<typeof QuizItem>;
export type McqItem = z.infer<typeof McqItem>;
export type ChronologyItem = z.infer<typeof ChronologyItem>;
export type MatchItem = z.infer<typeof MatchItem>;
export type CalloutBlock = z.infer<typeof CalloutBlock>;
