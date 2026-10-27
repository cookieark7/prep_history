import { BLOCKS } from "./blocks";
import { EXAMPLE } from "./example";
import { GROUNDING } from "./grounding";
import { HONESTY } from "./honesty";
import { INPUTS } from "./inputs";
import { LEVELS } from "./levels";
import { PEDAGOGY } from "./pedagogy";
import { PROTOCOL } from "./protocol";
import { ROLE } from "./role";
import { RULES } from "./rules";
import { STYLE } from "./style";

// The Director's system prompt, assembled from modules (docs/PROTOTYPE_PLAN.md, section 5.1).
// It is one static string so providers can cache it; everything that changes per turn goes in
// the user message (lib/director/context.ts). Each turn logs PROMPT_VERSION, so a prompt change
// shows up in the logs and the eval reports.

export const DIRECTOR_MODULES = { ROLE, PROTOCOL, BLOCKS, INPUTS, RULES, PEDAGOGY, HONESTY, GROUNDING, LEVELS, STYLE, EXAMPLE };

export const DIRECTOR_SYSTEM_PROMPT = Object.values(DIRECTOR_MODULES).join("\n\n");

export const PROMPT_VERSION = `director-${fnv1a(DIRECTOR_SYSTEM_PROMPT)}`;

/** 32-bit FNV-1a as 8 hex digits: a stable, dependency-free fingerprint (not for security). */
export function fnv1a(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}
