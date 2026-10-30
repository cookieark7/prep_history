// How a syllabus station reads on Progress: where you are (yellow), overdue cards (red), every idea
// settled (green), started (ink), or not yet (open). One state each, in that order of precedence.

export type StationState = "here" | "overdue" | "settled" | "started" | "open";

export interface StationTally { lessons: number; cards: number; learned: number; overdue: number }

export function stationState(isHere: boolean, t: StationTally): StationState {
  if (isHere) return "here";
  if (t.overdue > 0) return "overdue";
  if (t.cards > 0 && t.learned === t.cards) return "settled";
  if (t.lessons > 0) return "started";
  return "open";
}
