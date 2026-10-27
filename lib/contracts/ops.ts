import { z } from "zod";
import { Block } from "./blocks";

export const Mode = z.enum(["reader", "canvas", "timeline", "focus"]);
export type Mode = z.infer<typeof Mode>;

export const Op = z.discriminatedUnion("op", [
  z.object({ op: z.literal("add"), after: z.string().nullable(), block: Block }),
  z.object({ op: z.literal("patch"), id: z.string(), set: z.record(z.string(), z.unknown()) }), // re-validated after merge
  z.object({ op: z.literal("remove"), id: z.string() }),
  z.object({ op: z.literal("layout"), mode: Mode }),
  z.object({ op: z.literal("focus"), id: z.string(), fullscreen: z.boolean() }),
]);
export type Op = z.infer<typeof Op>;

export const FollowupKind = z.enum(["deeper", "test", "zoom_out"]);
export type FollowupKind = z.infer<typeof FollowupKind>;

/** A cited passage (docs/PROTOTYPE_PLAN.md, 5.3). `id` is the chunk id used in [S:id] markers. */
export const SourceItem = z.object({
  id: z.string().max(32),
  title: z.string().max(200),
  heading: z.string().max(400),
  url: z.string().max(600),
  license: z.string().max(60),
  excerpt: z.string().max(600),
});
export type SourceItem = z.infer<typeof SourceItem>;

/** Memory cards (docs/PROTOTYPE_PLAN.md, section 7.2): the ideas from a lesson worth remembering. */
export const CardKind = z.enum(["why", "consequence", "sequence", "anchor", "significance"]);
export type CardKind = z.infer<typeof CardKind>;
export const MemoryCard = z.object({
  id: z.string().max(16),
  kind: CardKind,
  front: z.string().min(8).max(160), // a question that needs reasoning
  back: z.string().min(2).max(280), // the answer, at most two sentences
  source_ref: z.object({ block: z.string(), node: z.string().nullable() }),
  cites: z.array(z.string().max(16)).max(4).optional(), // S1… from <sources>; the server maps them
});
export type MemoryCard = z.infer<typeof MemoryCard>;

export const StreamLine = z.discriminatedUnion("t", [
  z.object({ t: z.literal("say"), text: z.string().max(280) }),
  z.object({ t: z.literal("op"), op: Op }),
  z.object({ t: z.literal("followup"), kind: FollowupKind, label: z.string().max(60) }),
  z.object({ t: z.literal("card"), card: MemoryCard }),
  // sent by the server after retrieval, never by the model (the pipeline drops model copies)
  z.object({ t: z.literal("sources"), items: z.array(SourceItem).max(20) }),
  z.object({ t: z.literal("done") }),
]);
export type StreamLine = z.infer<typeof StreamLine>;

export const NoteKind = z.enum(["remember", "question", "disagree"]);
export type NoteKind = z.infer<typeof NoteKind>;

// Events the UI sends back to the Director
export const UiEvent = z.discriminatedUnion("event", [
  z.object({ event: z.literal("ask_why"), block_id: z.string(), selection: z.string() }),
  z.object({ event: z.literal("expand_node"), block_id: z.string(), node_id: z.string(), label: z.string() }),
  z.object({ event: z.literal("predict_answer"), block_id: z.string(), answer_id: z.string(), correct: z.boolean() }),
  z.object({ event: z.literal("quiz_result"), ref: z.string(), correct: z.boolean() }),
  z.object({ event: z.literal("note_created"), block_id: z.string(), kind: NoteKind, text: z.string(), quote: z.string() }),
]);
export type UiEvent = z.infer<typeof UiEvent>;

export const Level = z.enum(["new", "some", "advanced"]);
export type Level = z.infer<typeof Level>;

export const TurnRequest = z.object({
  message: z.string().max(1000).nullable(),
  event: UiEvent.nullable(),
  workspace: z.object({
    blocks: z.array(z.object({ id: z.string(), type: z.string(), title: z.string() })),
    level: Level,
    mastery: z.array(z.object({ ref: z.string(), strength: z.number().min(0).max(1) })).max(20),
  }),
  // Extra context for ask_why / expand_node (e.g. the node's incident edges). Not in the
  // original pack's contract; Part 4 asks for it, so it travels here.
  detail: z.string().max(2000).nullable().optional(),
  // v0.1 (E1): long pasted text the learner is reading. Additive, optional.
  source_text: z.string().max(8000).nullable().optional(),
  // prototype (docs/PROTOTYPE_PLAN.md, 5.3): which lesson, a unique id per turn (double-submit
  // guard and the turn log), and the lesson's topic. Additive, optional.
  lesson_id: z.string().max(64).nullable().optional(),
  turn_id: z.string().max(64).nullable().optional(),
  topic: z.string().max(400).nullable().optional(),
});
export type TurnRequest = z.infer<typeof TurnRequest>;
