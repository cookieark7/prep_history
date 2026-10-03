import { z } from "zod";

export const Confidence = z.enum(["E", "L", "C"]); // established, likely, contested
export type Confidence = z.infer<typeof Confidence>;

export const Layer = z.enum([
  "structural", "enabling", "trigger", "contingency", "event", "consequence",
]);
export type Layer = z.infer<typeof Layer>;

export const Depth = z.enum(["brief", "standard", "deep"]);
export type Depth = z.infer<typeof Depth>;

// Years are integers. BCE is negative. There is no year zero (1 BCE = -1, 1 CE = 1).
