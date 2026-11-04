# Eval 2026-10-31 · director-ebfdf374 · cf+openrouter

Chain: cf (@cf/openai/gpt-oss-120b) → openrouter (google/gemma-4-31b-it:free). Cases: 2, 8s apart. Made by `scripts/eval.ts`.

- **Cases passing every check:** 0 of 2
- **Valid line rate, cf:** 90.9% (30 valid, of which 4 repaired; 3 dropped; over 2 turns)
- **Turns that fell back:** 0
- **Retrieval:** 2 of 2 turns had sources; 36 citations kept, 0 removed (unknown ids or outside markdown)
- **Median time to first line:** 7441 ms; **median turn:** 33416 ms

| Case | Kind | Served by | Lines | Repaired | Dropped | Sources | Cited | First line | Total | Failed checks |
|---|---|---|---|---|---|---|---|---|---|---|
| exam-marathas | exam prep, a series part | cf | 14 | 1 | 0 | 6 | 10 | 7278 ms | 29735 ms | articles add the brief section only |
| exam-khaljis | exam prep, new sources | cf | 16 | 3 | 3 | 6 | 26 | 7441 ms | 33416 ms | no dropped lines; adds all of: article, timeline, callout, quiz; mentions Alauddin |

## Details of failed checks

**exam-marathas**

- articles add the brief section only
- log: `[turn] repaired line (balanced its brackets) :: {"t":"op","op":{"op":"add","after":"b3","block":{"id":"b4","type":"quiz","title":"Practice questions","because":"Test yo`

**exam-khaljis**

- no dropped lines: 3 dropped
- adds all of: article, timeline, callout, quiz
- mentions Alauddin
- log: `[turn] repaired line (closed an object the model left open) :: {"t":"op","op":{"op":"patch","id":"b1","set":{"sections":[{"h":"Rise to power and origins","md":"The Khaljis, originally`
- log: `[turn] repaired line (closed an object the model left open) :: {"t":"op","op":{"op":"patch","id":"b1","set":{"sections":[{"h":"Administration, reforms and expansion","md":"Ala‑ud‑din `
- log: `[turn] dropped line: invalid JSON: Expected ',' or '}' after property value in JSON at position 652 (line 1 column 653) :: {"t":"op","op":{"op":"patch","id":"b1","set":{"sections":[{"h":"Decline and fall","md":"Ala‑ud‑di`
- log: `[turn] dropped line: invalid JSON: Expected ',' or '}' after property value in JSON at position 622 (line 1 column 623) :: {"t":"op","op":{"op":"patch","id":"b1","set":{"sections":[{"h":"How it is asked (Mains)","md":"*A`
- log: `[turn] repaired line (label too long) :: {"t":"op","op":{"op":"add","after":"b1","block":{"id":"b2","type":"timeline","title":"Khalji dynasty timeline","because"`

