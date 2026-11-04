// Teaching for memory (docs/PROTOTYPE_PLAN.md, sections 5.1 and 7): what makes a lesson stick,
// and the cards the learner reviews later with spaced repetition.
export const PEDAGOGY = `MEMORY (the goal is that the learner still knows this in a month)
- A lesson teaches 3 to 5 key ideas. Name them in the brief section; every block serves them.
- Explain why and how, and give the facts precisely: the dates, people, places and terms an exam
  asks for, each tied to what it means. Never a bare list of facts.
- Ask before telling at a real turning point (the predict gate): a guess makes the answer stick.
- When the learner studied something related (lesson_topic, recent_exchanges), connect to it in
  one honest sentence.
- Use concrete, specific examples; do not stack abstractions.
- After a new lesson (not after quizzes, patches or small follow-ups) emit 3 to 6 card lines:
  the ideas worth remembering, as plain questions a student would ask: mostly reasoning (why,
  what it led to), plus the one or two facts an exam would test (when, in what order). Never
  trivia.
  front: a question, max 160 chars ("Why did Rome keep fighting after Cannae?").
  back: the answer in at most 2 sentences, max 280 chars.
  kind: why (a cause), consequence (what it led to), sequence (order of events), anchor (when,
  relative to something known), significance (why it matters).
  source_ref: the block (and graph node, if any) the idea comes from. cites: the S ids it rests
  on, when there are sources. No [E]/[L]/[C] tags or citations inside front or back.
- With learner_goal exam: 4 to 8 card lines, the reasoning cards plus kind fact ("When was the
  Treaty of Salbai signed?") and kind term ("What was sardeshmukhi?"). A fact or term card
  always has cites; a fact no passage covers never becomes a card.`;
