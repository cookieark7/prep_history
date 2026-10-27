import { createEmptyCard, fsrs, generatorParameters, Rating, type Card, type Grade } from "ts-fsrs";

// FSRS scheduling (docs/PROTOTYPE_PLAN.md, section 7.3) via ts-fsrs: default weights, aiming
// for a 90% chance of remembering a card when it comes due. Fuzz spreads due dates a little so
// cards learned together don't all return on the same day.

const scheduler = fsrs(generatorParameters({ request_retention: 0.9, enable_fuzz: true }));

/** The FSRS columns of the cards table. */
export interface FsrsColumns {
  due: Date;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  learningSteps: number;
  reps: number;
  lapses: number;
  state: number;
  lastReview: Date | null;
}

export const GRADES = [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy] as const;
export const isGrade = (n: number): n is Grade => n >= 1 && n <= 4 && Number.isInteger(n);

export function newCardColumns(now: Date): FsrsColumns {
  return fromCard(createEmptyCard(now));
}

function toCard(c: FsrsColumns): Card {
  return {
    due: c.due, stability: c.stability, difficulty: c.difficulty, elapsed_days: c.elapsedDays,
    scheduled_days: c.scheduledDays, learning_steps: c.learningSteps, reps: c.reps, lapses: c.lapses,
    state: c.state, last_review: c.lastReview ?? undefined,
  };
}

function fromCard(c: Card): FsrsColumns {
  return {
    due: c.due, stability: c.stability, difficulty: c.difficulty, elapsedDays: c.elapsed_days,
    scheduledDays: c.scheduled_days, learningSteps: c.learning_steps, reps: c.reps, lapses: c.lapses,
    state: c.state, lastReview: c.last_review ?? null,
  };
}

/** The card after one review, and the facts for the review log. */
export function schedule(c: FsrsColumns, grade: Grade, now: Date) {
  const { card, log } = scheduler.next(toCard(c), now, grade);
  return { next: fromCard(card), log: { state: log.state as number, elapsedDays: log.elapsed_days, scheduledDays: card.scheduled_days } };
}

/** When the card would come back for each answer: { 1: "1 min", 2: "8 min", 3: "1 day", 4: "4 days" }. */
export function preview(c: FsrsColumns, now: Date): Record<Grade, string> {
  const out = {} as Record<Grade, string>;
  for (const g of GRADES) out[g] = intervalLabel(now, scheduler.next(toCard(c), now, g).card.due);
  return out;
}

export function intervalLabel(from: Date, to: Date): string {
  const min = Math.max(1, Math.round((to.getTime() - from.getTime()) / 60_000));
  if (min < 60) return `${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} h`;
  const d = Math.round(h / 24);
  if (d < 31) return d === 1 ? "1 day" : `${d} days`;
  const m = Math.round(d / 30);
  if (m < 12) return m === 1 ? "1 month" : `${m} months`;
  const y = Math.round(d / 365);
  return y === 1 ? "1 year" : `${y} years`;
}
