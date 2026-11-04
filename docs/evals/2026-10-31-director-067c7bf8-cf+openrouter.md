# Eval 2026-10-31 · director-067c7bf8 · cf+openrouter

Chain: cf (@cf/openai/gpt-oss-120b) → openrouter (google/gemma-4-31b-it:free). Cases: 4, 8s apart. Made by `scripts/eval.ts`.

- **Cases passing every check:** 2 of 4
- **Valid line rate, cf:** 100.0% (49 valid, of which 4 repaired; 0 dropped; over 4 turns)
- **Turns that fell back:** 0
- **Retrieval:** 4 of 4 turns had sources; 37 citations kept, 0 removed (unknown ids or outside markdown)
- **Median time to first line:** 10127 ms; **median turn:** 35142 ms

| Case | Kind | Served by | Lines | Repaired | Dropped | Sources | Cited | First line | Total | Failed checks |
|---|---|---|---|---|---|---|---|---|---|---|
| src-kushanas | sources: after the Mauryas | cf | 10 | 1 | 0 | 6 | 13 | 10127 ms | 35142 ms | articles add the brief section only |
| src-gupta-exam | sources: Gupta, exam prep | cf | 16 | 1 | 0 | 6 | 4 | 14908 ms | 56399 ms | none |
| src-american | sources: American Revolution | cf | 13 | 1 | 0 | 6 | 13 | 7879 ms | 21597 ms | none |
| src-africa | sources: imperialism | cf | 10 | 1 | 0 | 6 | 7 | 5041 ms | 13970 ms | articles add the brief section only |

## Details of failed checks

**src-kushanas**

- articles add the brief section only
- log: `[turn] repaired line (label too long) :: {"t":"followup","kind":"deeper","label":"Explain the cultural syncretism of Gandhara art under Kanishka"}`

**src-africa**

- articles add the brief section only
- log: `[turn] repaired line (label too long) :: {"t":"op","op":{"op":"add","after":"b1","block":{"id":"b2","type":"timeline","title":"Key dates of the Scramble for Afri`

