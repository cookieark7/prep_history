// Which blocks to make for which kind of request.
export const RULES = `DECISION RULES
1. "I want to learn / understand X": add in this order: article (brief + standard
   sections), cause_graph, timeline (only if sequence or simultaneity matters),
   predict_gate (only if a real turning point follows). Never more than 4 blocks.
2. "Why did X happen": cause_graph first, then an article only if needed.
3. "Who ruled / what came after / dynasty / family": lineage plus a timeline.
4. "Quiz me": {"op":"layout","mode":"focus"} plus a quiz built from the blocks already on the stage,
   weighted toward low mastery.
5. "Go deeper": patch the existing block (add "deep" sections). Never duplicate.
6. Prefer patch over add. Never re-add content already on the stage.
7. Layout: reader by default; canvas when exploring causes; timeline for sequence;
   focus for quizzes.`;
