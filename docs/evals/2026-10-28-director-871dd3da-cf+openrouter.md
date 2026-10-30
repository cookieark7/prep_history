# Eval 2026-10-28 · director-871dd3da · cf+openrouter

Chain: cf (@cf/openai/gpt-oss-120b) → openrouter (google/gemma-4-31b-it:free). Cases: 8, 8s apart. Made by `scripts/eval.ts`.

- **Cases passing every check:** 2 of 8
- **Valid line rate, cf:** 94.5% (86 valid, of which 9 repaired; 5 dropped; over 8 turns)
- **Turns that fell back:** 0
- **Retrieval:** 8 of 8 turns had sources; 35 citations kept, 8 removed (unknown ids or outside markdown)
- **Median time to first line:** 6857 ms; **median turn:** 23770 ms

| Case | Kind | Served by | Lines | Repaired | Dropped | Sources | Cited | First line | Total | Failed checks |
|---|---|---|---|---|---|---|---|---|---|---|
| mughal-succession | succession question | cf | 8 | 1 | 0 | 6 | 2 | 6716 ms | 12434 ms | adds one of: lineage |
| maurya | dynasty and decline | cf | 12 | 1 | 1 | 6 | 9 | 9612 ms | 26031 ms | no dropped lines; articles add the brief section only |
| pasted | pasted reading | cf | 11 | 0 | 0 | 6 | 0 | 6857 ms | 23770 ms | cites the sources |
| level-advanced | level advanced | cf | 11 | 0 | 1 | 3 | 3 | 3193 ms | 9807 ms | no dropped lines |
| meanwhile | simultaneity | cf | 12 | 1 | 0 | 6 | 0 | 4498 ms | 12622 ms | cites the sources |
| lens-timeline | timeline lens | cf | 12 | 4 | 0 | 6 | 14 | 10646 ms | 25302 ms | none |
| lens-people | people lens | cf | 10 | 2 | 3 | 6 | 0 | 13249 ms | 61418 ms | no dropped lines; adds one of: lineage, article |
| prelims-fact | exam fact question | cf | 10 | 0 | 0 | 6 | 7 | 2698 ms | 11341 ms | none |

## Details of failed checks

**mughal-succession**

- adds one of: lineage
- log: `[turn] repaired line (label too long) :: {"t":"followup","kind":"deeper","label":"What were the main challenges Jahangir faced early in his reign?"}`

**maurya**

- no dropped lines: 1 dropped
- articles add the brief section only
- log: `[turn] repaired line (missing when/t_offset) :: {"t":"op","op":{"op":"add","after":"b1","block":{"id":"b2","type":"cause_graph","title":"Causes of the Maurya Empire’s c`
- log: `[turn] dropped line: schema: card.kind: Invalid option: expected one of "why"|"consequence"|"sequence"|"anchor"|"significance" :: {"t":"card","card":{"id":"c4","kind":"debate","front":"Did Ashoka’s pacifism significantly`

**pasted**

- cites the sources: 0 cited, 0 removed

**level-advanced**

- no dropped lines: 1 dropped
- log: `[turn] dropped line: invalid JSON: Expected ',' or ']' after array element in JSON at position 484 (line 1 column 485) :: {"t":"op","op":{"op":"add","after":null,"block":{"id":"b1","type":"article","title":"Why the Late `

**meanwhile**

- cites the sources: 0 cited, 0 removed
- log: `[turn] repaired line (label too long) :: {"t":"op","op":{"op":"add","after":"b1","block":{"id":"b2","type":"timeline","title":"Parallel timeline: Punic Wars and `

**lens-people**

- no dropped lines: 3 dropped
- adds one of: lineage, article
- log: `[turn] dropped line: invalid JSON: Expected ',' or '}' after property value in JSON at position 1073 (line 1 column 1074) :: {"t":"op","op":{"op":"add","after":null,"block":{"id":"b1","type":"article","title":"Maratha Em`
- log: `[turn] repaired line (closed an object the model left open) :: {"t":"op","op":{"op":"patch","id":"b1","set":{"sections":[{"h":"Details of the key figures","md":"* **Shivaji** – establ`
- log: `[turn] dropped line: invalid JSON: Expected ',' or '}' after property value in JSON at position 2041 (line 1 column 2042) :: {"t":"op","op":{"op":"add","after":"b1","block":{"id":"b2","type":"lineage","title":"Maratha Le`
- log: `[turn] dropped line: invalid JSON: Expected ',' or '}' after property value in JSON at position 1300 (line 1 column 1301) :: {"t":"op","op":{"op":"add","after":"b2","block":{"id":"b3","type":"timeline","title":"Key Marat`
- log: `[turn] repaired line (label too long) :: {"t":"followup","kind":"deeper","label":"More on the four Maratha houses (Scindia, Holkar, Gaekwad, Bhonsle)"}`

