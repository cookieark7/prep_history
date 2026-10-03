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

export const StreamLine = z.discriminatedUnion("t", [
  z.object({ t: z.literal("say"), text: z.string().max(280) }),
  z.object({ t: z.literal("op"), op: Op }),
  z.object({ t: z.literal("followup"), kind: FollowupKind, label: z.string().max(60) }),
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
});
export type TurnRequest = z.infer<typeof TurnRequest>;
