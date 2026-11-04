# Eval 2026-10-31 · director-05eaff3d · cf+openrouter

Chain: cf (@cf/openai/gpt-oss-120b) → openrouter (google/gemma-4-31b-it:free). Cases: 1, 8s apart. Made by `scripts/eval.ts`.

- **Cases passing every check:** 0 of 1
- **Valid line rate, cf:** 92.3% (12 valid, of which 2 repaired; 1 dropped; over 1 turns)
- **Turns that fell back:** 0
- **Retrieval:** 1 of 1 turns had sources; 6 citations kept, 3 removed (unknown ids or outside markdown)
- **Median time to first line:** 8319 ms; **median turn:** 38158 ms

| Case | Kind | Served by | Lines | Repaired | Dropped | Sources | Cited | First line | Total | Failed checks |
|---|---|---|---|---|---|---|---|---|---|---|
| exam-khaljis | exam prep, new sources | cf | 12 | 2 | 1 | 6 | 6 | 8319 ms | 38158 ms | no dropped lines; adds all of: article, timeline, callout, quiz |

## Details of failed checks

**exam-khaljis**

- no dropped lines: 1 dropped
- adds all of: article, timeline, callout, quiz
- log: `[turn] dropped line: schema: op.block.sections.0.depth: Invalid option: expected one of "brief"|"standard"|"deep" :: {"t":"op","op":{"op":"add","after":null,"block":{"id":"b1","type":"article","title":"Khalji dynasty (12`
- log: `[turn] repaired line (label too long) :: {"t":"op","op":{"op":"add","after":"b1","block":{"id":"b2","type":"timeline","title":"Khalji dynasty timeline","because"`
- log: `[turn] repaired line (balanced its brackets) :: {"t":"op","op":{"op":"add","after":"b3","block":{"id":"b4","type":"quiz","title":"Practice questions – Khalji dynasty","`

