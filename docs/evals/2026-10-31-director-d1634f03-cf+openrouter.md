# Eval 2026-10-31 · director-d1634f03 · cf+openrouter

Chain: cf (@cf/openai/gpt-oss-120b) → openrouter (google/gemma-4-31b-it:free). Cases: 2, 8s apart. Made by `scripts/eval.ts`.

- **Cases passing every check:** 0 of 2
- **Valid line rate, cf:** 93.5% (29 valid, of which 3 repaired; 2 dropped; over 2 turns)
- **Turns that fell back:** 0
- **Retrieval:** 2 of 2 turns had sources; 29 citations kept, 0 removed (unknown ids or outside markdown)
- **Median time to first line:** 17428 ms; **median turn:** 43883 ms

| Case | Kind | Served by | Lines | Repaired | Dropped | Sources | Cited | First line | Total | Failed checks |
|---|---|---|---|---|---|---|---|---|---|---|
| exam-marathas | exam prep, a series part | cf | 14 | 2 | 1 | 6 | 11 | 17428 ms | 43883 ms | no dropped lines; adds all of: article, timeline, callout, quiz |
| exam-khaljis | exam prep, new sources | cf | 15 | 1 | 1 | 6 | 18 | 12030 ms | 34181 ms | no dropped lines; adds all of: article, timeline, callout, quiz; mentions Alauddin |

## Details of failed checks

**exam-marathas**

- no dropped lines: 1 dropped
- adds all of: article, timeline, callout, quiz
- log: `[turn] dropped line: invalid JSON: Expected ',' or ']' after array element in JSON at position 676 (line 1 column 677) :: {"t":"op","op":{"op":"add","after":"b3","block":{"id":"b4","type":"quiz","title":"Practice questio`
- log: `[turn] repaired line (label too long) :: {"t":"followup","kind":"deeper","label":"Explain Shivaji’s diplomatic relations with the Deccan sultanates"}`
- log: `[turn] repaired line (label too long) :: {"t":"followup","kind":"zoom_out","label":"How did Shivaji’s state lead to the later Maratha Confederacy"}`

**exam-khaljis**

- no dropped lines: 1 dropped
- adds all of: article, timeline, callout, quiz
- mentions Alauddin
- log: `[turn] repaired line (label too long) :: {"t":"op","op":{"op":"add","after":"b1","block":{"id":"b2","type":"timeline","title":"Khalji dynasty timeline","because"`
- log: `[turn] dropped line: invalid JSON: Expected ',' or ']' after array element in JSON at position 642 (line 1 column 643) :: {"t":"op","op":{"op":"add","after":"b3","block":{"id":"b4","type":"quiz","title":"Practice questio`

