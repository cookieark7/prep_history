# Eval 2026-10-20 · director-d8f22664 · cf+openrouter

Chain: cf (@cf/openai/gpt-oss-120b) → openrouter (google/gemma-4-31b-it:free). Cases: 3, 5s apart. Made by `scripts/eval.ts`.

- **Cases passing every check:** 2 of 3
- **Valid line rate, cf:** 96.8% (30 valid, of which 4 repaired; 1 dropped; over 3 turns)
- **Turns that fell back:** 0
- **Retrieval:** 3 of 3 turns had sources; 13 citations kept, 0 removed (unknown ids or outside markdown)
- **Median time to first line:** 10654 ms; **median turn:** 28412 ms

| Case | Kind | Served by | Lines | Repaired | Dropped | Sources | Cited | First line | Total | Failed checks |
|---|---|---|---|---|---|---|---|---|---|---|
| punic-why | why question, empty stage | cf | 11 | 4 | 0 | 6 | 6 | 10654 ms | 33519 ms | none |
| french-rev | causes of an event | cf | 12 | 0 | 0 | 6 | 7 | 8074 ms | 28412 ms | none |
| mughal-succession | succession question | cf | 7 | 0 | 1 | 6 | 0 | 22434 ms | 26818 ms | no dropped lines; adds one of: lineage |

## Details of failed checks

**mughal-succession**

- no dropped lines: 1 dropped
- adds one of: lineage
- log: `[turn] dropped line: schema: op.block.people.0.gen: Invalid input: expected number, received string :: {"t":"op","op":{"op":"add","after":"b2","block":{"id":"b3","type":"lineage","title":"Mughal succession from Akbar to `

