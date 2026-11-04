# Eval 2026-10-31 · director-05eaff3d · cf+openrouter

Chain: cf (@cf/openai/gpt-oss-120b) → openrouter (google/gemma-4-31b-it:free). Cases: 12, 8s apart. Made by `scripts/eval.ts`.

- **Cases passing every check:** 3 of 12
- **Valid line rate, cf:** 96.0% (121 valid, of which 12 repaired; 5 dropped; over 11 turns)
- **Turns that fell back:** 1
- **Retrieval:** 12 of 12 turns had sources; 137 citations kept, 0 removed (unknown ids or outside markdown)
- **Median time to first line:** 10713 ms; **median turn:** 40866 ms

| Case | Kind | Served by | Lines | Repaired | Dropped | Sources | Cited | First line | Total | Failed checks |
|---|---|---|---|---|---|---|---|---|---|---|
| src-stone-age | sources: Stone Age | cf | 10 | 1 | 1 | 6 | 9 | 9739 ms | 31919 ms | no dropped lines |
| src-harappan | sources: Harappan | cf | 8 | 1 | 0 | 6 | 22 | 6592 ms | 31884 ms | none |
| src-vedic | sources: Vedic age | cf | 5 | 1 | 0 | 6 | 16 | 6020 ms | 17504 ms | mentions Rig ?veda |
| src-magadha | sources: Magadha | cf | 9 | 1 | 0 | 6 | 12 | 11413 ms | 38909 ms | articles add the brief section only |
| src-kushanas | sources: after the Mauryas | cf | 11 | 2 | 1 | 6 | 17 | 10467 ms | 40866 ms | no dropped lines; articles add the brief section only |
| src-gupta-exam | sources: Gupta, exam prep | cf | 14 | 0 | 1 | 6 | 5 | 13052 ms | 55816 ms | no dropped lines; adds all of: article, timeline, callout, quiz |
| src-american | sources: American Revolution | cf | 13 | 1 | 1 | 6 | 11 | 7601 ms | 42180 ms | no dropped lines; mentions 1776|Declaration of Independence |
| src-africa | sources: imperialism | cf | 13 | 2 | 1 | 6 | 20 | 12359 ms | 42670 ms | no dropped lines |
| src-ww1 | sources: First World War | cf (timeout) → openrouter (rate_limit) | 0 | 0 | 0 | 6 | 0 | 46092 ms | 46092 ms | a provider answered; no dropped lines; adds one of: cause_graph; mentions Franz Ferdinand|Sarajevo|July Crisis |
| src-russia | sources: between the wars | cf | 13 | 2 | 0 | 6 | 6 | 8847 ms | 41194 ms | articles add the brief section only |
| src-ww2 | sources: Second World War | cf | 12 | 0 | 0 | 6 | 14 | 10713 ms | 39424 ms | none |
| src-nam | sources: decolonisation | cf | 13 | 1 | 0 | 6 | 5 | 11749 ms | 31100 ms | none |

## Details of failed checks

**src-stone-age**

- no dropped lines: 1 dropped
- log: `[turn] repaired line (closed an object the model left open) :: {"t":"op","op":{"op":"patch","id":"b1","set":{"sections":[{"h":"Chronology of the painted periods","md":"**Period I – Up`
- log: `[turn] dropped line: timeline b2: year 0 does not exist :: {"t":"op","op":{"op":"add","after":"b1","block":{"id":"b2","type":"timeline","title":"Bhimbetka painting periods","because":"Shows the chronological spread of th`

**src-vedic**

- mentions Rig ?veda
- log: `[turn] repaired line (label too long) :: {"t":"op","op":{"op":"add","after":"b1","block":{"id":"b2","type":"timeline","title":"Key dated developments in Vedic so`
- log: `[turn] stream ended inside an object: {"t":"op","op":{"op":"add","after":"b3","block":{"id":"b4","type":"quiz","title":"Practice questions","because":"Test recall of the main ideas","items":[{"kind":"mcq","id":"q1","stem`

**src-magadha**

- articles add the brief section only
- log: `[turn] repaired line (label too long) :: {"t":"followup","kind":"deeper","label":"Explain the role of mineral resources in Magadha’s military strength"}`

**src-kushanas**

- no dropped lines: 1 dropped
- articles add the brief section only
- log: `[turn] repaired line (label too long) :: {"t":"op","op":{"op":"add","after":"b1","block":{"id":"b2","type":"timeline","title":"Chronology of Kanishka’s reign","b`
- log: `[turn] dropped line: invalid JSON: Expected ',' or ']' after array element in JSON at position 710 (line 1 column 711) :: {"t":"op","op":{"op":"add","after":"b2","block":{"id":"b3","type":"quiz","title":"Practice questio`
- log: `[turn] repaired line (label too long) :: {"t":"followup","kind":"deeper","label":"Explain how Kanishka’s conquests affected trade on the Silk Road"}`

**src-gupta-exam**

- no dropped lines: 1 dropped
- adds all of: article, timeline, callout, quiz
- log: `[turn] dropped line: invalid JSON: Expected ',' or ']' after array element in JSON at position 773 (line 1 column 774) :: {"t":"op","op":{"op":"add","after":"b3","block":{"id":"b4","type":"quiz","title":"Practice questio`

**src-american**

- no dropped lines: 1 dropped
- mentions 1776|Declaration of Independence
- log: `[turn] repaired line (label too long) :: {"t":"op","op":{"op":"add","after":"b1","block":{"id":"b2","type":"timeline","title":"Key dates of the American Revoluti`
- log: `[turn] dropped line: invalid JSON: Expected ',' or ']' after array element in JSON at position 831 (line 1 column 832) :: {"t":"op","op":{"op":"add","after":"b3","block":{"id":"b4","type":"quiz","title":"Practice questio`

**src-africa**

- no dropped lines: 1 dropped
- log: `[turn] repaired line (label too long) :: {"t":"op","op":{"op":"add","after":"b1","block":{"id":"b2","type":"timeline","title":"Scramble for Africa – Key Dates","`
- log: `[turn] dropped line: invalid JSON: Expected ',' or ']' after array element in JSON at position 754 (line 1 column 755) :: {"t":"op","op":{"op":"add","after":"b3","block":{"id":"b4","type":"quiz","title":"Practice questio`
- log: `[turn] repaired line (label too long) :: {"t":"followup","kind":"deeper","label":"Explore the economic impact of the Scramble on African societies"}`

**src-ww1**

- a provider answered: cf:timeout → openrouter:rate_limit
- no dropped lines
- adds one of: cause_graph
- mentions Franz Ferdinand|Sarajevo|July Crisis
- log: `[turn] cf failed (timeout): cf: no text within 45s`
- log: `[turn] openrouter failed (rate_limit 429): openrouter 429: {"error":{"message":"Provider returned error","code":429,"metadata":{"raw":"google/gemma-4-31b-it:free is temporarily rate-limited upstream. Please retry shortly`

**src-russia**

- articles add the brief section only
- log: `[turn] repaired line (label too long) :: {"t":"op","op":{"op":"add","after":"b1","block":{"id":"b2","type":"timeline","title":"1917 Russian Revolution timeline",`
- log: `[turn] repaired line (balanced its brackets) :: {"t":"op","op":{"op":"add","after":"b3","block":{"id":"b4","type":"quiz","title":"Practice questions on the 1917 Russian`

