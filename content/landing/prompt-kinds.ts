// Verbatim from docs/chronicle-landing-build-prompt.md, section 8.3. Edit the prompt's
// content there first; this file must match it ("use the content exactly").
// Hide a kind the app can't render yet by removing it from SUPPORTED_KINDS.

export const PROMPT_KINDS = {
  why:    { label:"Why",     example:"Why did Rome beat Carthage?",           youGet:"a cause map: what led to it, and what it led to", mark:"diamond" },
  when:   { label:"When",    example:"Put the French Revolution in order.",   youGet:"a timeline you can zoom into",                    mark:"ticks" },
  who:    { label:"Who",     example:"Map the Mughal succession.",            youGet:"a family and succession tree",                    mark:"fork" },
  whatif: { label:"What if", example:"What if Hannibal had marched on Rome?", youGet:"you predict first, then see what historians think", mark:"half-circle" },
  quiz:   { label:"Test me", example:"Quiz me on the Black Death.",           youGet:"a short quiz built from the lesson",              mark:"check" },
} as const;
export const SUPPORTED_KINDS: (keyof typeof PROMPT_KINDS)[] = ["why","when","who","whatif","quiz"];
