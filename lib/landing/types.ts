import { z } from "zod";
import type { Confidence } from "@/lib/contracts";

// Shapes for the landing page's content (docs/chronicle-landing-build-prompt.md, section 8).
// The content modules are typed with these; tests parse them with the schemas.

export const Glyph = z.enum([
  "point", "star", "disc", "ring", "concentric", "spiral", "cell", "rose", "orbits", "wheel", "dial", "globe",
]);
export type Glyph = z.infer<typeof Glyph>;

const Hex = z.string().regex(/^#[0-9A-Fa-f]{6}$/);

export const Beat = z.object({
  id: z.string().regex(/^B\d{2}$/),
  act: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  title: z.string().min(1),
  label: z.string().min(1),
  // Years ago in Act I; a calendar year in Acts II and III (BCE negative, no year zero).
  t: z.number().refine((n) => n !== 0, "there is no year zero"),
  bg: Hex,
  accent: Hex.nullable(), // null: derive from the tint (see lib/landing/tone.ts)
  glyph: Glyph,
  anchor: z.string().min(1),
  dwell: z.boolean(),
  caption: z.string().min(1),
});
export type Beat = z.infer<typeof Beat>;

export const PromptKind = z.enum(["why", "when", "who", "whatif", "quiz"]);
export type PromptKind = z.infer<typeof PromptKind>;

export const EventPrompt = z.object({
  kind: PromptKind,
  text: z.string().min(1).max(120),
});
export type EventPrompt = z.infer<typeof EventPrompt>;

export const TimelineEvent = z.object({
  id: z.string().regex(/^E\d{2}$/),
  date: z.string().min(1),
  year: z.number().int().refine((n) => n !== 0, "there is no year zero"),
  title: z.string().min(1),
  glyph: Glyph,
  blurb: z.string().min(1),
  prompts: z.array(EventPrompt).length(3),
});
export type TimelineEvent = z.infer<typeof TimelineEvent>;

export const LinkConfidence = z.enum(["established", "likely", "contested"]);
export type LinkConfidence = z.infer<typeof LinkConfidence>;

export const CauseLink = z.object({
  from: z.string().regex(/^E\d{2}$/),
  to: z.string().regex(/^E\d{2}$/),
  confidence: LinkConfidence,
  label: z.string().min(1),
});
export type CauseLink = z.infer<typeof CauseLink>;

/** The app's own confidence codes, so arcs share the cause graph's visual language. */
export const LINK_CONFIDENCE: Record<LinkConfidence, Confidence> = {
  established: "E",
  likely: "L",
  contested: "C",
};

export const PromptKindInfo = z.object({
  label: z.string().min(1),
  example: z.string().min(1),
  youGet: z.string().min(1),
  mark: z.enum(["diamond", "ticks", "fork", "half-circle", "check"]),
});
export type PromptKindInfo = z.infer<typeof PromptKindInfo>;
