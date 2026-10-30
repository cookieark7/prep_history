# Eval 2026-10-28 · director-bd172ef5 · cf+openrouter

Chain: cf (@cf/openai/gpt-oss-120b) → openrouter (google/gemma-4-31b-it:free). Cases: 20, 8s apart. Made by `scripts/eval.ts`.

- **Cases passing every check:** 10 of 20
- **Valid line rate, cf:** 98.2% (166 valid, of which 8 repaired; 3 dropped; over 19 turns)
- **Turns that fell back:** 1
- **Retrieval:** 19 of 20 turns had sources; 45 citations kept, 0 removed (unknown ids or outside markdown)
- **Median time to first line:** 8184 ms; **median turn:** 19413 ms

| Case | Kind | Served by | Lines | Repaired | Dropped | Sources | Cited | First line | Total | Failed checks |
|---|---|---|---|---|---|---|---|---|---|---|
| punic-why | why question, empty stage | cf | 8 | 2 | 2 | 6 | 0 | 9825 ms | 23618 ms | no dropped lines |
| rome-learn | learn a topic | cf | 13 | 2 | 0 | 6 | 9 | 10552 ms | 24724 ms | none |
| french-rev | causes of an event | cf | 11 | 1 | 0 | 6 | 3 | 8042 ms | 16968 ms | none |
| mughal-decline | why, existing stage | cf | 11 | 2 | 0 | 6 | 2 | 5302 ms | 19413 ms | none |
| mughal-succession | succession question | cf | 9 | 0 | 0 | 6 | 2 | 6563 ms | 12613 ms | adds one of: lineage |
| maurya | dynasty and decline | cf | 3 | 0 | 0 | 6 | 3 | 8911 ms | 23636 ms | adds one of: lineage, cause_graph |
| quiz | quiz on the stage | cf | 5 | 0 | 1 | 0 | 0 | 4946 ms | 12056 ms | no dropped lines; adds one of: quiz |
| deeper | go deeper on an article | cf | 5 | 0 | 0 | 6 | 0 | 4132 ms | 8702 ms | none |
| ask-why | ask_why event | cf | 6 | 0 | 0 | 6 | 0 | 4677 ms | 6373 ms | none |
| expand-node | expand_node event | cf | 10 | 0 | 0 | 6 | 0 | 14589 ms | 18847 ms | none |
| note-disagree | disagree note | cf | 3 | 0 | 0 | 6 | 0 | 12932 ms | 14758 ms | none |
| pasted | pasted reading | cf | 10 | 0 | 0 | 6 | 0 | 5728 ms | 19370 ms | cites the sources |
| level-new | level new | cf | 13 | 0 | 0 | 6 | 2 | 13286 ms | 26997 ms | none |
| level-advanced | level advanced | cf | 11 | 0 | 0 | 3 | 10 | 24432 ms | 39562 ms | articles add the brief section only |
| meanwhile | simultaneity | cf | 12 | 0 | 0 | 6 | 0 | 8184 ms | 21926 ms | cites the sources |
| vague | vague request | cf | 1 | 0 | 0 | 6 | 0 | 3018 ms | 3019 ms | none |
| marathas-learn | learn a syllabus period | cf | 12 | 0 | 0 | 6 | 8 | 9642 ms | 21259 ms | none |
| lens-timeline | timeline lens | cf | 12 | 1 | 0 | 6 | 0 | 7902 ms | 24934 ms | cites the sources |
| lens-people | people lens | cf | 11 | 0 | 0 | 6 | 6 | 7592 ms | 18871 ms | articles add the brief section only |
| prelims-fact | exam fact question | cf (timeout) → openrouter (rate_limit) | 0 | 0 | 0 | 6 | 0 | 46000 ms | 46000 ms | a provider answered; no dropped lines; adds one of: article, callout; mentions one[- ]fourth|25|quarter |

## Details of failed checks

**punic-why**

- no dropped lines: 2 dropped
- log: `[turn] dropped line: invalid JSON: Expected ',' or ']' after array element in JSON at position 668 (line 1 column 669) :: {"t":"op","op":{"op":"add","after":null,"block":{"id":"b1","type":"article","title":"Why Rome beat`
- log: `[turn] repaired line (label too long) :: {"t":"op","op":{"op":"add","after":"b1","block":{"id":"b2","type":"cause_graph","title":"Causes of Rome’s victory over C`
- log: `[turn] dropped line: invalid JSON: Expected ',' or ']' after array element in JSON at position 1306 (line 1 column 1307) :: {"t":"op","op":{"op":"patch","id":"b1","set":{"sections":[{"h":"Why Rome prevailed","md":"After `
- log: `[turn] repaired line (label too long) :: {"t":"followup","kind":"deeper","label":"How did Roman politics shape the decision to destroy Carthage?"}`

**mughal-succession**

- adds one of: lineage

**maurya**

- adds one of: lineage, cause_graph
- log: `[turn] stream ended inside an object: {"t":"op","op":{"op":"add","after":"b1","block":{"id":"b2","type":"cause_graph","title":"Why the Mauryan Empire collapsed","because":"You asked why the empire fell apart","nodes":[{"`

**quiz**

- no dropped lines: 1 dropped
- adds one of: quiz
- log: `[turn] dropped line: invalid JSON: Expected ',' or ']' after array element in JSON at position 624 (line 1 column 625) :: {"t":"op","op":{"op":"add","after":"b2","block":{"id":"b3","type":"quiz","title":"Second Punic War`

**pasted**

- cites the sources: 0 cited, 0 removed

**level-advanced**

- articles add the brief section only

**meanwhile**

- cites the sources: 0 cited, 0 removed

**lens-timeline**

- cites the sources: 0 cited, 0 removed
- log: `[turn] repaired line (label too long) :: {"t":"op","op":{"op":"add","after":"b1","block":{"id":"b2","type":"timeline","title":"Maratha Empire timeline 1674‑1818"`

**lens-people**

- articles add the brief section only

**prelims-fact**

- a provider answered: cf:timeout → openrouter:rate_limit
- no dropped lines
- adds one of: article, callout
- mentions one[- ]fourth|25|quarter
- log: `[turn] cf failed (timeout): cf: no text within 45s`
- log: `[turn] openrouter failed (rate_limit 429): openrouter 429: {"error":{"message":"Provider returned error","code":429,"metadata":{"raw":"google/gemma-4-31b-it:free is temporarily rate-limited upstream. Please retry shortly`

