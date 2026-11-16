# Eval 2026-11-16 · director-d67d1642 · cf+openrouter

Chain: cf (@cf/openai/gpt-oss-120b) → openrouter (google/gemma-4-31b-it:free). Cases: 7, 8s apart. Made by `scripts/eval.ts`.

- **Cases passing every check:** 1 of 7
- **Valid line rate, cf:** 98.8% (79 valid, of which 7 repaired; 1 dropped; over 7 turns)
- **Turns that fell back:** 0
- **Retrieval:** 7 of 7 turns had sources; 57 citations kept, 2 removed (unknown ids or outside markdown)
- **Median time to first line:** 12117 ms; **median turn:** 37168 ms

| Case | Kind | Served by | Lines | Repaired | Dropped | Sources | Cited | First line | Total | Failed checks |
|---|---|---|---|---|---|---|---|---|---|---|
| mughal-succession | succession question | cf | 8 | 0 | 0 | 6 | 2 | 5208 ms | 9618 ms | adds one of: lineage |
| maurya | dynasty and decline | cf | 14 | 0 | 1 | 6 | 6 | 33284 ms | 70628 ms | no dropped lines; adds one of: lineage, cause_graph |
| pasted | pasted reading | cf | 14 | 2 | 0 | 6 | 12 | 6816 ms | 39218 ms | articles add the brief section only |
| meanwhile | simultaneity | cf | 11 | 0 | 0 | 6 | 0 | 7561 ms | 30273 ms | cites the sources |
| lens-timeline | timeline lens | cf | 11 | 2 | 0 | 6 | 11 | 21113 ms | 37168 ms | none |
| lens-people | people lens | cf | 10 | 2 | 0 | 6 | 17 | 12117 ms | 50463 ms | articles add the brief section only |
| src-stone-age | sources: Stone Age | cf | 11 | 1 | 0 | 6 | 9 | 17418 ms | 31434 ms | articles add the brief section only |

## Details of failed checks

**mughal-succession**

- adds one of: lineage

**maurya**

- no dropped lines: 1 dropped
- adds one of: lineage, cause_graph
- log: `[turn] dropped line: schema: op.block.nodes.1: Invalid input: expected object, received string :: {"t":"op","op":{"op":"add","after":"b1","block":{"id":"b2","type":"cause_graph","title":"Why the Mauryan Empire fell","bec`

**pasted**

- articles add the brief section only
- log: `[turn] repaired line (label too long) :: {"t":"op","op":{"op":"add","after":"b1","block":{"id":"b2","type":"timeline","title":"Key events of Hannibal’s Italian c`
- log: `[turn] repaired line (balanced its brackets) :: {"t":"op","op":{"op":"add","after":"b3","block":{"id":"b4","type":"quiz","title":"Practice questions","because":"Test yo`

**meanwhile**

- cites the sources: 0 cited, 0 removed

**lens-people**

- articles add the brief section only
- log: `[turn] repaired line (closed an object the model left open, balanced its brackets) :: {"t":"op","op":{"op":"add","after":null,"block":{"id":"b1","type":"article","title":"Key people of the Maratha Empire (1`
- log: `[turn] repaired line (closed an object the model left open, balanced its brackets) :: {"t":"op","op":{"op":"add","after":"b1","block":{"id":"b2","type":"timeline","title":"Timeline of major Maratha leaders"`

**src-stone-age**

- articles add the brief section only
- log: `[turn] repaired line (label too long) :: {"t":"op","op":{"op":"add","after":"b1","block":{"id":"b2","type":"timeline","title":"Bhimbetka painting periods","becau`

