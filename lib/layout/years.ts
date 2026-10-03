// Historical years: integers, BCE negative, no year zero (1 BCE = -1, 1 CE = 1).
// Internally we convert to astronomical numbering (1 BCE = 0) so arithmetic is continuous.

export function toAstro(year: number): number {
  return year > 0 ? year : year + 1;
}

export function fromAstro(astro: number): number {
  return astro > 0 ? astro : astro - 1;
}

/** Signed number of years from a to b, accounting for the missing year zero. */
export function yearSpan(a: number, b: number): number {
  return toAstro(b) - toAstro(a);
}

/** "216 BCE", "476 CE"; with `era: false` CE years print bare ("1605"). */
export function formatYear(year: number, opts: { era?: boolean; approx?: boolean } = {}): string {
  const era = opts.era ?? year < 0;
  const prefix = opts.approx ? "c. " : "";
  if (year < 0) return `${prefix}${-year} BCE`;
  return era ? `${prefix}${year} CE` : `${prefix}${year}`;
}

export function formatRange(start: number | null, end: number | null, approx = false): string {
  if (start == null && end == null) return "";
  const era = (start ?? 0) < 0 || (end ?? 0) < 0;
  if (start != null && end != null && start !== end) {
    // "218-201 BCE" when both BCE, otherwise full forms
    if (start < 0 && end < 0) return `${approx ? "c. " : ""}${-start}-${-end} BCE`;
    return `${formatYear(start, { era, approx })}-${formatYear(end, { era })}`;
  }
  return formatYear((start ?? end)!, { era, approx });
}
