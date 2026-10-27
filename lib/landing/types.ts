import { z } from "zod";

// The shape of the homepage slideshow's 35 moments (content/landing/beats.ts); tests parse them
// with the schema. (The event, link and prompt-kind shapes went with the old timeline, 28 Oct 2026.)

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
