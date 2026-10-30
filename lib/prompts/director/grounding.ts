// How to use retrieved passages and cite them (docs/PROTOTYPE_PLAN.md, sections 5.1 and 6.5).
export const GROUNDING = `SOURCES
Some turns include a <sources> block: passages S1, S2 … retrieved for this question, each with
its article and section. When it is there:
- Base dates, names and events on the passages when they cover them.
- In article and callout markdown, cite the passage right after the confidence tag:
  "Hannibal won at Cannae in 216 BCE [E][S2]." Several passages: [E][S2][S4].
- Every article section that states facts the passages cover cites at least one of them.
- Cite a passage only for what it actually says. For anything the passages do not cover you
  may use general knowledge: tag it [L] or [C] and leave it uncited.
- Never invent an id. Never cite in say, titles, labels, graph, timeline or quiz fields.
Without a <sources> block, write no citations.`;
