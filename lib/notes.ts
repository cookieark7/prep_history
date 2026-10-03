/** Drop the E/L/C letters that confidence tags contribute to a text selection. */
export function cleanQuote(q: string): string {
  return q
    .replace(/\s+[ELC](?=[\s.,;:)]|$)/g, "")
    .replace(/\s+/g, " ")
    .replace(/\s+([.,;:)])/g, "$1")
    .trim();
}

/**
 * Find `quote` inside `root`'s text, ignoring whitespace differences (selections add
 * newlines between paragraphs; the DOM may not). Returns a DOM Range or null.
 */
export function findTextRange(root: Element, quote: string): Range | null {
  const target = quote.replace(/\s+/g, "");
  if (target.length < 2) return null;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const map: { node: Text; off: number }[] = [];
  let flat = "";
  for (let n = walker.nextNode() as Text | null; n; n = walker.nextNode() as Text | null) {
    const t = n.data;
    for (let i = 0; i < t.length; i++) {
      if (/\s/.test(t[i])) continue;
      flat += t[i];
      map.push({ node: n, off: i });
    }
  }
  const at = flat.indexOf(target);
  if (at < 0) return null;
  const a = map[at];
  const z = map[at + target.length - 1];
  const r = document.createRange();
  r.setStart(a.node, a.off);
  r.setEnd(z.node, z.off + 1);
  return r;
}
