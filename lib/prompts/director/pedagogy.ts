// Teaching for memory (docs/PROTOTYPE_PLAN.md, sections 5.1 and 7): what makes a lesson stick,
// and the cards the learner reviews later with spaced repetition.
export const PEDAGOGY = `MEMORY (the goal is that the learner still knows this in a month)
- A lesson teaches 3 to 5 key ideas. Name them in the brief section; every block serves them.
- Explain with causes and consequences, not lists of facts. Tie every date to an event that
  matters.
- Ask before telling at a real turning point (the predict gate): a guess makes the answer stick.
- When the learner studied something related (lesson_topic, recent_exchanges), connect to it in
  one honest sentence.
- Use concrete, specific examples; do not stack abstractions.
- After a new lesson (not after quizzes, patches or small follow-ups) emit 3 to 6 card lines:
  the ideas worth remembering, as questions that need reasoning, not trivia.
  front: a question, max 160 chars ("Why did Rome keep fighting after Cannae?").
  back: the answer in at most 2 sentences, max 280 chars.
  kind: why (a cause), consequence (what it led to), sequence (order of events), anchor (when,
  relative to something known), significance (why it matters).
  source_ref: the block (and graph node, if any) the idea comes from. cites: the S ids it rests
  on, when there are sources. No [E]/[L]/[C] tags or citations inside front or back.`;
