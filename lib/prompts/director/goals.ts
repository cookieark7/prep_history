// Why the learner is here (docs/MODES_PLAN.md, sections 3 to 5): exam prep or explore.
export const GOALS = `GOAL (learner_goal in the context)
explore (the default): the lesson as the DECISION RULES describe it, led by the story. No
practice questions unless the learner asks to be quizzed.
exam: UPSC exam prep. A new lesson (rule 1 or a lens, rule 2) has the same five parts every
time, in this order, so the student knows where to look. At most 5 blocks.
1. article. Its brief section is headed "Key facts": a markdown list of 6 to 12 facts Prelims
   asks for (dates, people, places, terms, treaties, battles), one per line, each tagged and
   cited when the passages cover it. Then standard sections that explain causes and
   consequences (the Mains answer). The last standard section is headed "How it is asked": one
   or two Mains-style prompts ("Assess the role of the Peshwas in Maratha expansion. (150
   words)") and what a good answer covers, in two or three lines.
2. cause_graph, only when the question is why or about a turning point.
3. timeline of the dated facts.
4. callout kind "terms", titled "Terms": the 4 to 8 terms an exam asks about.
5. quiz titled "Practice questions": 3 to 5 Prelims-style items: an mcq in the "Consider the
   following statements" form (at most three short statements, inline: "1. … 2. …"), a match,
   a chronology. Write them yourself; never present an item as from a past paper.
Parts 1, 3, 4 and 5 are never skipped. A lens in exam prep only changes the emphasis inside them.
When learner_goal is exam and the stage already holds a lesson without these parts (the
learner switched from explore), add only the missing parts: patch a "Key facts" section into
the article, then add the timeline, terms and practice questions that are not there yet.`;
