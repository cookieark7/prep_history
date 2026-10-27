# Eval 2026-10-20 · director-45140c8c · cf+openrouter

Chain: cf (@cf/openai/gpt-oss-120b) → openrouter (google/gemma-4-31b-it:free). Cases: 16, 5s apart. Made by `scripts/eval.ts`.

- **Cases passing every check:** 12 of 16
- **Valid line rate, cf:** 99.0% (99 valid, of which 4 repaired; 1 dropped; over 16 turns)
- **Turns that fell back:** 0
- **Median time to first line:** 11780 ms; **median turn:** 18740 ms

| Case | Kind | Served by | Lines | Repaired | Dropped | First line | Total | Failed checks |
|---|---|---|---|---|---|---|---|---|
| punic-why | why question, empty stage | cf | 2 | 0 | 0 | 14908 ms | 34693 ms | adds one of: cause_graph |
| rome-learn | learn a topic | cf | 10 | 1 | 0 | 44578 ms | 66496 ms | none |
| french-rev | causes of an event | cf | 7 | 0 | 0 | 10334 ms | 18740 ms | none |
| mughal-decline | why, existing stage | cf | 9 | 0 | 0 | 13511 ms | 18105 ms | none |
| mughal-succession | succession question | cf | 4 | 0 | 1 | 4610 ms | 6462 ms | no dropped lines; adds one of: lineage |
| maurya | dynasty and decline | cf | 8 | 0 | 0 | 29127 ms | 53471 ms | none |
| quiz | quiz on the stage | cf | 4 | 0 | 0 | 6832 ms | 10614 ms | layout focus |
| deeper | go deeper on an article | cf | 5 | 0 | 0 | 4404 ms | 8438 ms | none |
| ask-why | ask_why event | cf | 6 | 0 | 0 | 3630 ms | 5576 ms | none |
| expand-node | expand_node event | cf | 5 | 0 | 0 | 12292 ms | 19166 ms | none |
| note-disagree | disagree note | cf | 5 | 0 | 0 | 6428 ms | 8161 ms | adds one of: callout, article |
| pasted | pasted reading | cf | 8 | 2 | 0 | 11780 ms | 24287 ms | none |
| level-new | level new | cf | 9 | 0 | 0 | 18113 ms | 38140 ms | none |
| level-advanced | level advanced | cf | 7 | 1 | 0 | 8513 ms | 14061 ms | none |
| meanwhile | simultaneity | cf | 8 | 0 | 0 | 19268 ms | 33693 ms | none |
| vague | vague request | cf | 2 | 0 | 0 | 1748 ms | 1787 ms | none |

## Details of failed checks

**punic-why**

- adds one of: cause_graph
- log: `[turn] stream ended inside an object: {"t":"op","op":{"op":"patch","id":"b1","set":{"sections":[{"h":"Why Rome succeeded","md":"1) Rome’s republican system mobilized large citizen armies and financed long wars, while Car`

**mughal-succession**

- no dropped lines: 1 dropped
- adds one of: lineage
- log: `[turn] dropped line: schema: op.block.people.0.gen: Invalid input: expected number, received string :: {"t":"op","op":{"op":"add","after":"b2","block":{"id":"b3","type":"lineage","title":"Mughal succession after Akbar","`

**quiz**

- layout focus

**note-disagree**

- adds one of: callout, article

