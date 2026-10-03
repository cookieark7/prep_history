# Chronicle v0

A history learning workspace: say what you want to understand, and the lesson appears as an
interactive **Stage** (reading, cause graphs, timelines, lineage, predictions, quizzes) next to
a short conversation. Built from [`chronicle-v0-build-pack.md`](chronicle-v0-build-pack.md).

## Run it

```bash
npm install
npm run dev          # http://localhost:3000
```

`.env.local` ships with `MOCK_LLM=1`, so the app runs on hand-written fixtures with no API key.
For the real Director, set (see `.env.example`):

```
ANTHROPIC_API_KEY=...
CHRONICLE_MODEL=claude-sonnet-5
MOCK_LLM=0
```

The server refuses to start in real mode without both variables.

### What mock mode knows

| Say | You get |
|---|---|
| anything mentioning Carthage / Punic / Hannibal (or anything, on an empty stage) | Second Punic War lesson (the pack's calibration sample) |
| fall of Rome / Western Roman Empire | article, cause graph, timeline, "meanwhile" callout |
| Mughal / Akbar / Aurangzeb | lineage, timeline, debate callout |
| "quiz me" / "test me" (with a lesson on stage) | layout focus + a quiz for that lesson |
| "go deeper" / the deeper follow-up chip | a patch that adds a deep article section |
| a Disagree note on the Rome article | a debate callout next to it (M1 test turn 5) |
| `__broken__` | a fixture with a bad graph edge and a year-0 timeline; both lines are dropped and logged |

## Checks

```bash
npm test             # vitest: contracts, fixtures, layout, parser, pipeline, mock, reducer, stream client, quiz, export
npm run typecheck
npm run lint
npx tsx scripts/m1-director-test.ts   # M1: the five Director test turns against the real model
```

## Milestones

| # | Status | Notes |
|---|---|---|
| M0 | done | Contracts in `lib/contracts`, 3 topic fixtures, layout functions handle all 3 (tested) |
| M1 | **needs an API key** | Prompt is in `lib/director/system-prompt.ts` (verbatim from the pack). `scripts/m1-director-test.ts` runs the five test turns and checks them; outputs land in `scripts/m1-output/` |
| M2 | done (mock) | `POST /api/turn` streams validated NDJSON; acceptance list passes in mock mode. Real mode is wired but untested without a key |
| M3 | done | Store, reducer, stream client, chat dock, article block; reload restores the lesson |
| M4 | done | Cause graph preview + canvas (trace back, ripple forward, highlight path, note tool, years-later ruler), timeline (d3-zoom, no year 0, label reflow, simultaneity, minimap), lineage |
| M5 | done | Predict gate (blur/reveal), quiz (mcq, chronology checked from years, match), graph quiz, focus mode, mastery |
| M6 | done | Notes (selection toolbar, margin notes, inline rows on narrow screens, slide-over), fullscreen reading, history + undo, Markdown export |

## Small deviations from the pack

- **`TurnRequest.detail`** (optional string): Part 4 asks that `expand_node` turns include the
  node's edges, but the contract had nowhere to put them.
- **Undo is data, not closures**: history entries store a serializable inverse op so undo survives
  a reload (closures can't go in localStorage).
- **Mock mode renumbers fixture ids** from `next_block_id` and resolves `{{title:…}}` placeholders,
  so second lessons and quizzes line up with what is already on the Stage.
- **`quiz_result` is sent only for misses.** The Director's rule acts only on incorrect answers;
  sending every correct answer would cost a model call per question. Graph quizzes never call the model.
- **Note underlines use the CSS Custom Highlight API** (exact DOM ranges) rather than rewriting the
  markdown, so a quote that spans an entity link or confidence tag still underlines correctly.

## Layout

```
app/            page.tsx (home), study/page.tsx (workspace), api/turn/route.ts
lib/contracts   zod schemas + semantic checks (single source of truth)
lib/director    system prompt, context builder, stream parser, pipeline, mock
lib/store       zustand workspace store, pure ops reducer, recent lessons
lib/layout      cause-graph, lineage, timeline scale, years (no year 0)
lib/fixtures    topic fixtures + mock/ (quiz, deeper, disagree, broken)
components/     stage, blocks, chat, canvas, quiz, notes, ui
```
