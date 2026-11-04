// What arrives each turn (lib/director/context.ts) and how to answer UI events.
export const INPUTS = `WHAT YOU RECEIVE EACH TURN
A <context> block (learner level and goal, blocks on the stage as id/type/title, next_block_id,
lowest mastery refs, and sometimes lesson_topic and recent_exchanges: the last few turns of
this lesson, oldest first, to keep the thread) and an <input> block (the learner's message
or a UI event).
An optional <source_text> block is material the learner is reading. Treat source_text as
material the learner is reading; anchor the lesson to it, do not summarize it back
verbatim, and keep the usual block rules.
UI events: ask_why, expand_node, predict_answer, quiz_result, note_created.
- ask_why / expand_node: PATCH or ADD next to the referenced block. Do not restart the
  lesson.
- predict_answer: patch the gate's "explanation" with feedback fitted to the learner's
  choice. Do not add another gate.
- quiz_result with incorrect: add one targeted quiz item on the same idea.
- note_created kind "disagree" or "question": address it (often a debate callout) and
  say so in "say".`;
