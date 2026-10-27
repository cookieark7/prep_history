import type { Beat } from "@/lib/landing/types";

// The opening as pure data (storyboard v1, approved 2026-10-17; plays on a clock since
// 2026-10-18). Positions are in opening units: the whole opening is `total` units long and plays
// in `playSeconds`. Nothing here touches the DOM.

export type Act = "arrival" | "deep" | "history" | "landing";

export interface OpeningConfig {
  /** Act boundaries in screens. */
  arrivalEnd: number;
  deepEnd: number; // Act I: continuous zoom through deep time
  historyEnd: number; // Act II: fast cuts
  total: number; // Act III ends here
  /** A key moment gets this many times a normal plate's scroll (Act II). */
  keyWeight: number;
  /**
   * Act I scroll shares. B01 holds the arrival; B02, B03 and B04 cover the nested zoom's five levels
   * (universe + galaxy, solar system, Earth + clouds), so 2:1:2 keeps the ruler's dates on them.
   */
  deepWeights: Record<string, number>;
  /** The beats that slow down and show their cause caption (7, storyboard decision 3). */
  keys: string[];
  /** Beats zoomed through in Act I. */
  deepBeats: string[];
  /** The white-out between the acts, centred on deepEnd. */
  whiteout: number;
  /** Act III: when the paper arrives, when the ruler starts zooming out, when the copy appears. */
  landing: { paperFrom: number; paperTo: number; zoomOutFrom: number; copyFrom: number };
  /** Autoplay bloom of the first point of light, in ms (storyboard decision 1). */
  bloomMs: number;
  /**
   * How long each act plays, in seconds (after the bloom). Act II sets the pace of the cuts: about
   * 1.2 s on a normal plate and 3.7 s on a key one, so a cut reads as a cut and not a flicker.
   */
  actSeconds: { deep: number; history: number; landing: number };
  /** Every crossfade in Act II takes this long, in seconds, however long its plate is. */
  fadeSeconds: number;
}

export const OPENING_CONFIG: OpeningConfig = {
  arrivalEnd: 0.5,
  deepEnd: 3.5,
  historyEnd: 11.5,
  total: 13,
  keyWeight: 3,
  deepWeights: { B01: 1.4, B02: 2, B03: 1, B04: 2 },
  keys: ["B01", "B11", "B17", "B24", "B29", "B31", "B33"],
  deepBeats: ["B01", "B02", "B03", "B04"],
  whiteout: 0.35,
  landing: { paperFrom: 11.5, paperTo: 12.1, zoomOutFrom: 12.0, copyFrom: 12.3 },
  bloomMs: 2000,
  actSeconds: { deep: 7, history: 52, landing: 1.8 },
  fadeSeconds: 0.5,
};

/** Opening units per second in each act (the acts play at different speeds). */
export function unitsPerSecond(cfg: OpeningConfig = OPENING_CONFIG) {
  return {
    deep: cfg.deepEnd / cfg.actSeconds.deep,
    history: (cfg.historyEnd - cfg.deepEnd) / cfg.actSeconds.history,
    landing: (cfg.total - cfg.historyEnd) / cfg.actSeconds.landing,
  };
}

export interface OpeningSlot {
  id: string;
  index: number; // position in the plan (and on the ruler)
  act: Exclude<Act, "arrival">;
  start: number; // screens
  end: number;
  key: boolean;
}

export interface OpeningPlan {
  slots: OpeningSlot[];
  total: number;
  cfg: OpeningConfig;
}

/**
 * Lays the beats along the scroll. `available` lists beats that have an image; others are
 * skipped (B35 until it's generated). The last beat (Now) belongs to the landing.
 */
export function buildOpeningPlan(beats: Beat[], available: readonly string[], cfg: OpeningConfig = OPENING_CONFIG): OpeningPlan {
  const have = new Set(available);
  const playable = beats.filter((b) => have.has(b.id) || b.act === 3);
  const deep = playable.filter((b) => cfg.deepBeats.includes(b.id));
  const now = playable.filter((b) => b.act === 3);
  const history = playable.filter((b) => !cfg.deepBeats.includes(b.id) && b.act !== 3);

  const slots: OpeningSlot[] = [];
  const lay = (list: Beat[], act: OpeningSlot["act"], from: number, to: number, weighted: boolean) => {
    const w = list.map((b) =>
      act === "deep" ? cfg.deepWeights[b.id] ?? 1 : weighted && cfg.keys.includes(b.id) ? cfg.keyWeight : 1);
    const unit = (to - from) / w.reduce((a, b) => a + b, 0);
    let at = from;
    list.forEach((b, i) => {
      const end = i === list.length - 1 ? to : at + w[i] * unit;
      slots.push({ id: b.id, index: slots.length, act, start: at, end, key: cfg.keys.includes(b.id) });
      at = end;
    });
  };
  // Act I: B01 also covers the arrival, so it gets a slightly longer share.
  lay(deep, "deep", 0, cfg.deepEnd, true);
  lay(history, "history", cfg.deepEnd, cfg.historyEnd, true);
  lay(now, "landing", cfg.historyEnd, cfg.total, false);
  return { slots, total: cfg.total, cfg };
}

/** The slot on screen at scroll position `p` (screens). */
export function slotIndexAt(plan: OpeningPlan, p: number): number {
  const { slots } = plan;
  if (p <= 0) return 0;
  const i = slots.findIndex((s) => p < s.end);
  return i === -1 ? slots.length - 1 : i;
}

/** Progress (0 to 1) through slot `i` at position `p`. */
export function slotProgress(plan: OpeningPlan, i: number, p: number): number {
  const s = plan.slots[i];
  return Math.min(1, Math.max(0, (p - s.start) / (s.end - s.start)));
}

/**
 * Where the ruler's needle sits, as a continuous slot index: 0 at the first beat, n - 1 at Now.
 * It moves steadily through each slot, so key moments (longer slots) pass more slowly. It
 * arrives at Now as history ends (the last history beat is a key moment, so it slows on the way)
 * and stays there through the landing.
 */
export function rulerIndexAt(plan: OpeningPlan, p: number): number {
  const last = plan.slots.length - 1;
  if (p >= plan.cfg.historyEnd) return last;
  const i = slotIndexAt(plan, p);
  return Math.min(last, i + slotProgress(plan, i, p));
}

/** The ruler's tick label: "13.8 bn yrs", "540 m yrs", "11,000 yrs", "3500 BCE", "1347", "Now". */
export function shortLabel(b: Beat): string {
  if (b.act === 3) return "Now";
  if (b.act === 1) {
    if (b.t >= 1e9) return `${Number((b.t / 1e9).toFixed(1))} bn yrs`;
    if (b.t >= 1e6) return `${Number((b.t / 1e6).toFixed(1))} m yrs`;
    return `${Math.round(b.t).toLocaleString("en-US")} yrs`;
  }
  return b.t < 0 ? `${-b.t} BCE` : String(b.t);
}

/**
 * Where a calendar year sits on the ruler, as a fractional slot index (for placing the
 * Starting points events on it at the landing). Years outside recorded history clamp.
 */
export function yearIndex(plan: OpeningPlan, beatsById: Map<string, Beat>, year: number): number {
  const dated = plan.slots
    .map((s) => ({ s, b: beatsById.get(s.id)! }))
    .filter(({ b }) => b.act !== 1);
  if (year <= dated[0].b.t) return dated[0].s.index;
  for (let i = 1; i < dated.length; i++) {
    const a = dated[i - 1];
    const z = dated[i];
    if (year <= z.b.t) return a.s.index + (year - a.b.t) / (z.b.t - a.b.t);
  }
  return dated[dated.length - 1].s.index;
}

/** 0 to 1 over [from, to], clamped. */
export function span(p: number, from: number, to: number): number {
  return Math.min(1, Math.max(0, (p - from) / (to - from)));
}
