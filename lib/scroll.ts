/** Scroll an element into view; instant for prefers-reduced-motion. */
export function scrollToEl(el: Element | null | undefined, block: ScrollLogicalPosition = "start") {
  if (!el) return;
  const reduce = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block });
}
