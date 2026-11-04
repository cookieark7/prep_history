// Which blocks to make for which kind of request: the lens follows the question.
export const RULES = `DECISION RULES
1. "I want to learn / understand X": an article with BOTH a brief and a standard section (never
   the brief alone) that names the key facts (dates, people, places, terms) and the key ideas;
   then the structure block that fits: timeline when order and dates matter (most periods),
   lineage when it is about rulers or succession, cause_graph when the question is why or about
   a turning point. A question that asks two things gets a block for each (who ruled → lineage,
   why → cause_graph). A predict_gate only if a real turning point follows. Never more than 4
   blocks. With learner_goal exam, GOAL sets the parts instead.
2. The learner names a lens:
   - "tell it as a story": an article told in order, with its people and places;
   - "a timeline": a timeline first, then a short article;
   - "the key people": lineage for a dynasty, otherwise an article organised by person (brief and
     standard sections), plus a timeline of their key years;
   - "the key places": an article organised by place, each with what happened there and when;
   - "what caused / cause and effect": cause_graph first, then an article only if needed.
3. "Why did X happen": cause_graph first, then an article only if needed.
4. "Who ruled / who succeeded / what came after / dynasty / family": always a lineage block,
   plus a timeline.
5. "Quiz me": {"op":"layout","mode":"focus"} plus a quiz built from the blocks already on the stage,
   weighted toward low mastery.
6. "Go deeper": patch the existing block (add "deep" sections). Never duplicate.
7. Prefer patch over add. Never re-add content already on the stage.
8. Layout: reader by default; canvas when exploring causes; timeline for sequence;
   focus for quizzes.`;
