# Eval 2026-10-20 · director-d731f1e8 · cf+openrouter

Chain: cf (@cf/openai/gpt-oss-120b) → openrouter (google/gemma-4-31b-it:free). Cases: 4, 5s apart. Made by `scripts/eval.ts`.

- **Cases passing every check:** 4 of 4
- **Valid line rate, cf:** 100.0% (22 valid, of which 2 repaired; 0 dropped; over 4 turns)
- **Turns that fell back:** 0
- **Median time to first line:** 10761 ms; **median turn:** 17719 ms

| Case | Kind | Served by | Lines | Repaired | Dropped | First line | Total | Failed checks |
|---|---|---|---|---|---|---|---|---|
| punic-why | why question, empty stage | cf | 6 | 1 | 0 | 10761 ms | 17719 ms | none |
| mughal-succession | succession question | cf | 7 | 1 | 0 | 42842 ms | 53808 ms | none |
| quiz | quiz on the stage | cf | 5 | 0 | 0 | 6328 ms | 8393 ms | none |
| note-disagree | disagree note | cf | 4 | 0 | 0 | 4338 ms | 5406 ms | none |

## Details of failed checks

