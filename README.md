# Chronicle v0

A history learning workspace: say what you want to understand, and the lesson appears as an
interactive **Stage** (reading, cause graphs, timelines, lineage, predictions, quizzes) next to
a short conversation. Built from [`chronicle-v0-build-pack.md`](chronicle-v0-build-pack.md).

## Run it

```bash
npm install
npm run dev          # http://localhost:3000
```

With `MOCK_LLM=1` in `.env.local` the app runs on hand-written fixtures with no keys and no database.

### The full prototype (free tiers)

The working prototype ([`docs/PROTOTYPE_PLAN.md`](docs/PROTOTYPE_PLAN.md)) adds a free LLM chain, a Postgres knowledge base with citations, accounts on every device, and a spaced-repetition review loop. Every setting is described in [`.env.example`](.env.example).

```bash
docker compose up -d db          # Postgres 16 + pgvector on port 5433
cp .env.example .env.local       # then fill in the Cloudflare and OpenRouter keys and BETTER_AUTH_SECRET
npm run ingest                   # Wikipedia corpus → passages → embeddings (about 550 neurons, resumable)
npm run dev                      # migrations run at startup
```

- **LLM** (`lib/llm/`): `LLM_CHAIN` lists providers in order; any OpenAI-compatible API works. The default is Cloudflare Workers AI (`gpt-oss-120b`, free 10,000 neurons a day, about 250-350 a lesson), with OpenRouter's free models as the fallback. The fallback is used only while nothing has reached the learner.
- **Knowledge base** (`lib/rag/`): 43 Wikipedia articles (CC BY-SA), cut into about 2,500 passages and embedded with `bge-m3`. Each turn retrieves passages by vector plus keyword search. The Director cites them, and the reader shows each citation as a numbered link to its passage.
- **Accounts and sync** (`lib/auth/`, `lib/store/sync.ts`): everyone starts as a guest. Signing in with an email link (in development the link is printed in the server log), or with Google once configured, keeps the guest's lessons and cards and opens them on any device.
- **Retention** (`lib/review/`): each new lesson saves 3–6 cards: the Director's key ideas, plus ordering, quiz and cause-map cards. FSRS (`ts-fsrs`) schedules them. `/review` is the daily review, `/stats` shows the streak and how much is remembered by interval, and `/start` shows what is due.
- **Turn log**: `/admin/turns` lists every turn: provider, timings, sources, citations, and repaired or dropped lines.

The server refuses to start when the LLM chain is incomplete and names the missing variables.

### What mock mode knows

| Say | You get |
|---|---|
| anything mentioning Carthage / Punic / Hannibal (or anything, on an empty stage) | Second Punic War lesson (the pack's calibration sample) |
| fall of Rome / Western Roman Empire | article, cause graph, timeline, "meanwhile" callout |
| Mughal / Akbar / Aurangzeb | lineage, timeline, debate callout |
| "Why did the Mughal empire decline?" | article (brief, then section patches) + cause graph, added next to what's there |
| a long paste (over 1,200 characters) | routed by topic if it mentions one of the lessons; otherwise an honest "cannot read pasted text" |
| "quiz me" / "test me" (with a lesson on stage) | layout focus + a quiz for that lesson |
| "go deeper" / the deeper follow-up chip | a patch that adds a deep article section |
| a Disagree note on the Rome article | a debate callout next to it (M1 test turn 5) |
| `__broken__` | a fixture with a bad graph edge and a year-0 timeline; both lines are dropped and logged |

## Checks

```bash
npm test             # vitest: contracts, LLM layer, router, repair, prompt, database (PGlite), accounts, RAG, review, UI logic
npm run typecheck
npm run lint
npm run build && npm run e2e -- --shots docs/screens/prototype   # the demo script, mock Director, 2 devices, 24 screenshots
npm run eval                          # 16 golden turns through LLM_CHAIN with retrieval; report in docs/evals/
npx tsx scripts/m1-director-test.ts   # M1 turns + the v0.1 source_text turn, against Anthropic
npx tsx scripts/retest-mock.ts        # v0.1 prompt re-test (3 turns) against the running dev server
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

## v0.1 (UX enhancements)

Built from [`chronicle-v0.1-build-pack.md`](chronicle-v0.1-build-pack.md); the spec, decisions and
build record are in [`docs/ENHANCEMENTS_v0.1.md`](docs/ENHANCEMENTS_v0.1.md). One commit per item on
branch `chronicle-v0.1`.

- **E1 Composer:** grows to 8 lines; IME-safe Enter; long pastes become a "Pasted text" card sent as
  `source_text`; a failed send restores the draft.
- **E2 Status line:** rotating verbs until the first block lands, then "Cause graph added · …".
- **E3 Lesson rail:** one type-shaped tick per block on the right edge; fills when done; mobile gets a
  progress bar and a "Jump to" sheet. Chips, history drawer and rail share one step-trace shape
  (storage v2, migrated).
- **E4 Scroll:** the Stage never jumps; "3 blocks added, below" chip; the chat sticks to the bottom
  only when you are there.
- **E5 Patch-streaming:** articles arrive brief-first, then one patch per section.
- **E6 Actions + dock:** Copy / Fullscreen / Pin / Undo (c f p u); drag or keyboard-resize the dock.
- **E7 Rich copy:** blocks and the whole lesson copy as Markdown and HTML together.
- **E8 Audit:** follow-ups only under the latest reply; Cmd+K adds Copy lesson and Toggle dock;
  `N` new lesson; canvas `v`/`n`/`p`; the `?` sheet lists exactly what is wired.

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
