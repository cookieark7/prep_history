# Eval 2026-11-16 · director-53f4b380 · cf+openrouter

Chain: cf (@cf/openai/gpt-oss-120b) → openrouter (google/gemma-4-31b-it:free). Cases: 5, 8s apart. Made by `scripts/eval.ts`.

- **Cases passing every check:** 1 of 5
- **Valid line rate, cf:** 90.9% (50 valid, of which 4 repaired; 5 dropped; over 5 turns)
- **Turns that fell back:** 0
- **Retrieval:** 5 of 5 turns had sources; 27 citations kept, 4 removed (unknown ids or outside markdown)
- **Median time to first line:** 9600 ms; **median turn:** 31306 ms

| Case | Kind | Served by | Lines | Repaired | Dropped | Sources | Cited | First line | Total | Failed checks |
|---|---|---|---|---|---|---|---|---|---|---|
| mughal-succession | succession question | cf | 10 | 0 | 0 | 6 | 0 | 18961 ms | 31758 ms | none |
| maurya | dynasty and decline | cf | 11 | 1 | 0 | 6 | 12 | 9324 ms | 31306 ms | articles add the brief section only |
| pasted | pasted reading | cf | 10 | 0 | 0 | 6 | 8 | 5647 ms | 14210 ms | articles add the brief section only |
| meanwhile | simultaneity | cf | 9 | 2 | 1 | 6 | 7 | 9600 ms | 16480 ms | no dropped lines |
| lens-people | people lens | cf | 10 | 1 | 4 | 6 | 0 | 11071 ms | 46020 ms | no dropped lines |

## Details of failed checks

**maurya**

- articles add the brief section only
- log: `[turn] repaired line (missing when/t_offset) :: {"t":"op","op":{"op":"add","after":null,"block":{"id":"b1","type":"cause_graph","title":"Causes of Maurya decline","beca`

**pasted**

- articles add the brief section only

**meanwhile**

- no dropped lines: 1 dropped
- log: `[turn] dropped line: schema: card.kind: Invalid option: expected one of "why"|"consequence"|"sequence"|"anchor"|"significance"|"fact"|"term" :: {"t":"card","card":{"id":"c4","kind":"compare","front":"How did the timing o`
- log: `[turn] repaired line (label too long) :: {"t":"followup","kind":"deeper","label":"Explain why the Qin dynasty collapsed so quickly after unification."}`
- log: `[turn] repaired line (label too long) :: {"t":"followup","kind":"zoom_out","label":"What was the broader Mediterranean context during these Chinese events?"}`

**lens-people**

- no dropped lines: 4 dropped
- log: `[turn] dropped line: invalid JSON: Expected ',' or ']' after array element in JSON at position 1578 (line 1 column 1579) :: {"t":"op","op":{"op":"add","after":null,"block":{"id":"b1","type":"article","title":"Key people `
- log: `[turn] dropped line: invalid JSON: Expected ',' or ']' after array element in JSON at position 709 (line 1 column 710) :: {"t":"op","op":{"op":"patch","id":"b1","set":{"sections":[{"h":"Rise and early consolidation","md"`
- log: `[turn] dropped line: invalid JSON: Expected ',' or ']' after array element in JSON at position 729 (line 1 column 730) :: {"t":"op","op":{"op":"patch","id":"b1","set":{"sections":[{"h":"Peshwa era and expansion","md":"[[`
- log: `[turn] dropped line: invalid JSON: Expected ',' or ']' after array element in JSON at position 435 (line 1 column 436) :: {"t":"op","op":{"op":"patch","id":"b1","set":{"sections":[{"h":"Decline and British domination","m`
- log: `[turn] repaired line (label too long) :: {"t":"followup","kind":"deeper","label":"Explain the role of the Scindia and Holkar families in the confederacy"}`

