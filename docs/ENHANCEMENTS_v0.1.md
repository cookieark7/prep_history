# Chronicle v0.1 Enhancements (spec)

Inherits `chronicle-v0-build-pack.md` (World A) and `chronicle-v0.1-build-pack.md` (World B).
Precedence: user's latest instruction > enhancement guide (what to build) > v0 pack (intent,
constraints) > code (what exists, as fact).

## 1. Inheritance map

- **From the v0 build pack:** principles (event is the atom, causation is the main axis, chat is a
  remote control and the Stage is the lesson, confidence visible, calm and archival); the 7 block
  types and 5 ops (`lib/contracts/*`); the JSON-lines protocol (`say`, `op`, `followup`, `done`);
  tokens paper / sepia / ink, oxblood accent, layer colours (`app/globals.css`); radii 6px controls,
  0-2px content; motion 150-200ms; the milestone discipline (one step works before the next).
- **From the enhancement guide:** E1 composer, E2 status microcopy, E3 lesson rail + one step-trace
  shape, E4 scroll behaviour, E5 article patch-streaming, E6 block actions + resizable dock,
  E7 rich copy, E8 audit of chips / empty state / Cmd+K / keyboard layer.
- **From the code (facts that differ from the docs):**
  - Undo is a serializable inverse op on each history entry, not a closure (`lib/store/reducer.ts`).
  - `TurnRequest.detail?` already exists (added in v0 for `expand_node` edges).
  - `quiz_result` is sent only for misses (v0 decision, README).
  - Mock mode renumbers fixture ids from `next_block_id` and resolves `{{title:…}}` placeholders
    (`lib/director/mock.ts`).
  - Persisted state lives under `chronicle:workspace`, storage version 1, with a zod shape check
    that discards bad saves (`lib/store/workspace.ts`).
  - The calibration sample lives in two places: the v0 pack text and `lib/fixtures/punic-wars.ndjson`.
    The fixture is the executable copy; this spec carries the updated sample (section 4).

## 2. Current-state inventory

| ID | Enhancement | Status | Evidence (paths, behaviour) |
|---|---|---|---|
| E1 | Composer upgrade | extend | `components/chat/Composer.tsx`: fixed `rows={2}` + `max-h-40` (no auto-grow); Enter/Shift+Enter with `isComposing` guard but no keyCode 229 check; no paste handling; Stop button + Esc exist; draft is cleared on submit and lost on error (Retry exists in chat). Home composer (`components/Home.tsx`) duplicates the key logic. |
| E2 | Status microcopy | build | `components/chat/ChatDock.tsx` shows only a `progress-rule` while streaming; no text. |
| E3 | Lesson rail + step trace | build | No rail. Time spine exists on the left (`components/stage/TimeSpine.tsx`). Step trace is split: `ChatEntry.landed: string[]` (chips) vs `HistoryEntry` (drawer) — two structures. No completion state. |
| E4 | Scroll behaviour | extend | Stage never auto-scrolls on landing (good), but there is no "added below" chip. Chat log calls `scrollIntoView` on every change, even when the learner has scrolled up; no "Jump to latest". Patches grow in place (browser scroll anchoring). |
| E5 | Article patch-streaming | build | Prompt and fixtures send whole articles in one `add`. Reducer already merges `sections` by heading and resolves same-turn ids (`TurnContext`); server validation (`lib/director/pipeline.ts`) only shape-checks patches, so same-stream patches pass. Undo of a patch restores the whole previous block (would also drop later sections). |
| E6 | Block actions + resizable dock | extend | Block menu (`components/stage/BlockFrame.tsx`) has Fullscreen, Pin, Undo; no Copy; menu fades on hover only (no mobile rule). Dock is fixed 340px (`ChatDock.tsx`, `Workspace.tsx`), collapse via Cmd+\. |
| E7 | Rich copy | build | `lib/export.ts` has a lesson-level Markdown exporter (download only), no per-block serializer, no HTML, no clipboard. |
| E8 | Audit: chips, empty state, Cmd+K, keys | extend | Follow-up chips render under every reply, never dim. Empty state (`components/Home.tsx`) matches. Cmd+K (`components/ui/dialogs.tsx`) lacks Copy lesson and Toggle dock. Keys: `/`, Cmd+\, j/k, f, Esc, ? exist; no "new lesson" key; canvas tool titles advertise v/n/p but no handlers. |

Baseline: 7 test files, 53 tests passing; typecheck and lint clean.
**After v0.1:** every item is implemented (none was already fully `verified`; the E8 empty
state was). 13 test files, 121 tests passing; typecheck, lint and production build clean.
See the build record below section 8.

## 3. Delta

| ID | Action | Files to touch | Contract change? | Prompt change? | Tests to add |
|---|---|---|---|---|---|
| E1 | auto-grow, IME guard (229), long-paste card, draft restore on error, `source_text` | `components/chat/Composer.tsx`, new `components/chat/useComposer.ts`, `components/Home.tsx`, `lib/stream-client.ts`, `lib/contracts/ops.ts`, `lib/director/context.ts`, `lib/director/system-prompt.ts`, `lib/director/mock.ts` | yes: `TurnRequest.source_text?` | yes: source_text rule | key handler (IME), paste threshold, context `<source_text>` |
| E2 | status line with rotating verbs, op-driven text | new `lib/status.ts`, `components/chat/ChatDock.tsx`, `components/stage/Mobile.tsx`, `components/chat/CommandBar.tsx` | no | no | status text derivation |
| E4 | landing chips on the Stage; stick-to-bottom chat | new `lib/landing.ts`, new `components/stage/LandingChips.tsx`, `components/chat/ChatDock.tsx`, `components/stage/Mobile.tsx` | no | no | chip classification + label |
| E5 | brief-first article, one patch per section; section-level undo; no "updated" marker for same-turn patches | `lib/director/system-prompt.ts`, all fixtures with articles, `lib/director/mock.ts`, `lib/store/reducer.ts`, `lib/store/workspace.ts`, `components/stage/BlockFrame.tsx` | no | yes: article + order rules | same-turn patch, section-level undo, fixture shape |
| E3 | rail with type-shaped ticks, completion, mobile progress + Jump to; one step-trace shape | new `lib/rail.ts`, new `components/stage/LessonRail.tsx`, `lib/store/reducer.ts`, `lib/store/workspace.ts` (v2 migration), `components/chat/ChatDock.tsx`, `components/ui/dialogs.tsx`, `components/stage/Mobile.tsx`, quiz/gate | no | no | rail mapping, migration v1→v2 |
| E6 | Copy in block menu, menu visibility, resizable dock | `components/stage/BlockFrame.tsx`, `components/chat/ChatDock.tsx`, `components/stage/Workspace.tsx`, store | no | no | width clamp |
| E7 | per-block Markdown + HTML serializers, ClipboardItem copy, Copy lesson | `lib/export.ts` (single source), new `lib/clipboard.ts`, `components/stage/BlockFrame.tsx`, `components/stage/TopBar.tsx` | no | no | one serializer test per block type |
| E8 | chips only under the latest reply; palette Copy lesson + Toggle dock; `N` new lesson; canvas v/n/p; cheat sheet | `components/chat/ChatDock.tsx`, `components/ui/dialogs.tsx`, `components/stage/useShortcuts.ts`, `components/canvas/CanvasView.tsx` | no | no | — (manual) |

## 4. Contract and prompt changes

**Contract (additive, optional):**

```ts
// lib/contracts/ops.ts — TurnRequest
source_text: z.string().max(8000).nullable().optional(),
```

**Context template:** when present, a block between `</context>` and `<input>`:

```text
<source_text>
{pasted text}
</source_text>
```

**Director prompt additions** (`lib/director/system-prompt.ts`):

- OUTPUT PROTOCOL, ordering: *"If you add an article, emit its add first (brief section only), then
  the other blocks, then the article's remaining sections as patches, one section per patch."*
- BLOCK TYPES / article: *"An add carries ONLY the brief section. Send every other section as its
  own patch on the same id: {"op":"patch","id":"bN","set":{"sections":[{one section}]}}. Patches
  merge by heading (same heading replaces, new heading appends)."*
- WHAT YOU RECEIVE: *"An optional <source_text> block is material the learner is reading. Anchor
  the lesson to it; do not summarize it back verbatim; keep the usual block rules."*

**Updated calibration sample (shape):** `lib/fixtures/punic-wars.ndjson` —
`say` → `add b1 article [brief]` → `add b2 cause_graph` → `add b3 predict_gate` →
`add b4 article [brief]` → `patch b1 "Why it started"` → `patch b1 "What it led to"` →
followups → `done`. Same content as v0, re-cut into patches. All other article fixtures follow suit.

## 5. Per-enhancement spec

**E1 Composer.** One hook (`useComposer`) shared by the dock, mobile sheet, command bars and Home.
Auto-grow to 8 lines (line-height 20px → max 176px incl. padding), then scroll inside. Key handler is
a pure function: Enter without Shift and not composing (`isComposing || keyCode === 229`) sends;
Esc while streaming stops. Paste over `PASTE_THRESHOLD = 1200` chars becomes one card ("Pasted
text, N words") with Expand (inline preview, scrollable) and Remove; text is capped at
`SOURCE_TEXT_MAX = 8000` (card says so). Sending with a card attaches `source_text`; an empty
message with a card sends "Help me understand what I'm reading." On error the draft (text +
card) is restored if the box is still empty. Stop keeps landed blocks; the chat shows "Stopped";
the box stays usable. Accessibility: card actions are buttons with labels; 44px targets on mobile.

**E2 Status.** Pure `statusText(entry, ops)`: before any op → rotating verb (2.5s) from a fixed list;
after ops → "<Type> added" for the latest op, followed by "· working on the next block" while still
streaming. Clears on done / error / abort. The line itself is `aria-hidden`; the polite announcement
comes from the existing `Announcer` (history labels), so rotations are never announced.
Reduced motion: text swaps without fade. *Deviation:* the guide's "Adding cause graph" (before the op
lands) is not knowable — the server forwards only complete, validated lines and the protocol has no
status line (adding one would be a new stream kind). Decision recorded in section 7.

**E4 Scroll.** Stage never auto-scrolls. When an `add` lands outside the viewport, a chip appears
above the composer area: "Cause graph added, below" (or "above"); several collapse to "3 blocks
added, below". Click → scroll to the first and flash it. Each pending block is dropped when it
enters view; the chip auto-dismisses after 8s. Chat dock and mobile sheet stick to bottom while
within 80px of it; otherwise a "Jump to latest" button appears. Patches never trigger chips or
scrolling.

**E5 Patch-streaming.** Prompt + fixtures as in section 4. Reducer: an article patch whose `set`
holds only `sections` records a section-level inverse (remove appended headings, restore replaced
sections) so undoing one patch removes only that section. A patch to a block added earlier in the
same turn re-triggers the soft arrival edge instead of the "updated / Undo" tag (that tag is kept
for patches to blocks from earlier turns). Mock renumbering maps patch ids too.

**E3 Rail.** One step-trace shape: `HistoryEntry { id, op, label, blockId, status: applied | skipped
| undone, at, turn, inverse }`. Landed chips = history entries of that turn (add/patch, applied,
de-duplicated by block). The drawer and rail read the same list / blocks. Rail: fixed on the right
edge (md+), one tick per Stage block in Stage order (pins first), tick = block-type icon in a 22px
square; filled when complete; active tick (follows scroll, same observer as the time spine) has an
accent ring. Hover / focus shows the title to the left. Roving tabindex: arrows move, Enter/Space
jump, Tab leaves. Completion (persisted `completed` map): gate answered or skipped; Director quiz
run finished; other blocks after 2.5s at least 40% in view. Mobile (<768px): hairline progress bar
under the top bar + "Jump to" sheet.

**E6 Actions + dock.** Menu order: Copy (c), Fullscreen (f), Pin (p), Undo (u); keys act on the
focused or topmost block. Desktop: menu button visible on hover/focus; mobile: visible only on
the block in view. Dock: separator on its right edge, 280-520px, arrows ±16 (Shift ±48),
Home/End to min/max, double-click resets to 340; width persisted; Cmd+\ still collapses.

**E7 Copy.** `lib/export.ts` owns `blockToMarkdown` and `blockToHtml` (one per type, as listed in the
guide; confidence tags become "(established)" / "(likely)" / "(contested)"). The lesson exporter
and Copy lesson reuse them. `lib/clipboard.ts` writes `text/plain` + `text/html` via `ClipboardItem`,
falling back to `writeText`. Buttons flip to "Copied" for 1.5s.

**E8 Audit.** Follow-up chips only under the latest Director reply (so used ones disappear). Palette
gains Copy lesson and Toggle dock. Keys: `N` new lesson, `c`/`p`/`u` block actions, canvas `v`/`n`/`p`
tools (canvas only). Cheat sheet lists exactly what is wired.

## 6. Order and gates

E1 → E2 → E4 → E5 → E3 → E6 → E7 → E8. Each gate: its unit tests pass, the full suite passes,
typecheck + lint clean, and a browser check of its acceptance list in mock mode. After E1 and E5:
the three prompt re-test turns in mock mode (Rome; Mughal decline on an existing stage; a long
pasted `source_text`). Real mode only if a key is configured (it is not, at time of writing).

## 7. Conflicts and open questions

1. **"Adding X" before the op lands (E2).** Not possible without a new stream line kind. Resolution:
   rotating verbs until the first op, then "<Type> added · working on the next block".
2. **"Updated" marker on patch-streamed sections (E5).** Showing "updated / Undo" on every brand-new
   article contradicts "calm" and would make every lesson look edited. Resolution: same-turn patches
   get the soft arrival edge; "updated / Undo" stays for patches to earlier-turn blocks. Undo for
   each section patch remains available in the history drawer.
3. **Mughal decline in mock mode.** The guide's re-test turn 2 needs a scripted answer that adds next
   to an existing Mughal stage. Resolution: a new fixture `mughal-decline.ndjson` (article brief +
   cause graph + section patches), routed when the message mentions decline and Mughal.
4. **Calibration sample location.** The v0 pack text is not edited; this spec and the fixture carry
   the updated sample.
5. **Quiz completion (E3).** Derived from the persisted quiz run (every item attempted) rather than
   a separate "finished" flag, so it needs no extra state and survives reload. Gates likewise
   derive from the persisted gate answer; only passive-block dwell is stored in `completed`.
6. **Top bar width (E6).** With the dock at 520px the Stage can be ~500px wide, which overflowed
   the top bar at `lg` viewports. The bar now uses a container query: the Mode switch shows when
   the bar itself is at least 700px wide (it stays reachable from Cmd+K and the mobile tab bar).
7. **`u` key (E6/E8).** Undo acts like the menu's "Undo last change": for a block whose only
   step is its add, that removes the block (recoverable only by asking again). Kept for
   consistency with the v0 menu; flagged here in case it should be limited to patches.
8. **Hidden composers (E1).** The dock composer is `display:none` on phones; auto-grow now skips
   hidden boxes instead of pinning them at 0px (found in the browser check).
9. **`quiz_result` and graph quizzes** keep their v0 behaviour (misses only; graph quizzes never
   call the Director).

## 8. Parked

Everything in section 4 of the guide: thinking block, code block with copy, full sidebar history,
composer tool row, real citation cards, edit-and-branch, plan-then-run, projects and memory.
Also parked: real-mode prompt re-test (no API key configured); multiple paste cards per message
(one card replaces the previous — simpler, and `source_text` is a single field).

## Build record

| ID | Commit | Verified (mock mode, browser + tests) |
|---|---|---|
| — | `868dbe2` | v0 baseline committed on branch `chronicle-v0.1` so each item is reviewable |
| — | `158bffb` | this spec |
| E1 | `db48864` | 1 / 8 / 30 lines → 52 / 170 / 170px (scrolls inside); 5,000-char paste → card, sent as `source_text`; Stop keeps landed blocks, "Stopped" row, composer usable; failed send restores the draft; IME guard unit-tested |
| E2 | `f37ad9c` | status at ~100ms, verbs rotate every 2.5s, switches to "Prediction added · …" on the first op, clears on done |
| E4 | `1e694b9` | scroll stays at 0 while 4 blocks land below; chip collapses to "4 blocks added, below", sits 20px above the bottom, click jumps + highlights; chat dock follows only near the bottom, "Jump to latest" otherwise |
| E5 | `e24361c` | article first paints with 1 section, grows to 4 in place, scroll unchanged, no "updated" tag; per-section history entries; undo of one patch removes only that section (unit); 3 re-test turns valid |
| E3 | `849cdae` | real v1 save (22 blocks) migrated to v2; 22 ticks; chips rebuilt from history; gate skip fills its tick; dwell fills passive ticks; active tick follows scroll; roving tabindex; mobile progress bar + "Jump to" sheet; completion survives reload |
| E6 | `8d22c95` | dock 280-520 by keyboard, pointer drag and Home/End; double-click resets; width persists; no horizontal scroll at min/max at 1024 and 1440 |
| E7 | `090b1d8` | Copy writes `text/plain` + `text/html`; label flips to "Copied" for 1.5s; Copy lesson writes all blocks; one serializer test per block type |
| E8 | `9312a8b` | no shortcut fires while typing; j/k, p, c, ?, ⌘K, N, canvas v/n/p work; chips only under the latest reply; palette complete; cheat sheet matches |

Prompt re-test (`npx tsx scripts/retest-mock.ts`, mock mode): Rome, Mughal decline on an existing
stage, and a long `source_text` — all valid JSON lines, brief-only article adds, section patches
after the other blocks, no restarts or duplicates. Real mode: not run (no API key configured);
`scripts/m1-director-test.ts` now also checks the E5 shape and a `source_text` turn.

Manual items not fully covered in this environment: screen-reader output (only the aria wiring was
checked), 200% text size, and reduced-motion visuals (the CSS and JS paths exist; the browser pane
could not emulate the media query).

## Change log

| Change | Type | Where |
|---|---|---|
| `TurnRequest.source_text?` (≤8000) | contract, additive | `lib/contracts/ops.ts` |
| `<source_text>` context block | prompt context | `lib/director/context.ts` |
| source_text rule; brief-first article + one patch per section; ordering | prompt | `lib/director/system-prompt.ts` |
| Article fixtures re-cut into brief add + section patches; new `mughal-decline.ndjson` | fixtures | `lib/fixtures/` |
| Storage v1 → v2: `HistoryEntry` gains `op`, `status`, `turn` (replaces `undone`); `ChatEntry.landed` removed (chips derive from history); new `completed`, `dockWidth` | persisted shape, migrated | `lib/store/workspace.ts`, `lib/store/migrate.ts` |
| Archived lessons (Continue list) migrate v1 → v2 on load | persisted shape | `lib/store/lessons.ts` |
| `ChatEntry.attachment?`, `ChatEntry.retry.sourceText?` (pasted-text chip, Retry keeps the paste) | persisted, additive optional | `lib/store/workspace.ts` |
| `Inverse` gains `{ kind: "sections" }` (undo one streamed section) | persisted, additive | `lib/store/reducer.ts` |
| `toast` | transient, not persisted | `lib/store/workspace.ts` |
| Markdown export: confidence tags now read "(established)" etc.; graph lines "cause → effect: why"; timeline as a table; lineage by generation | export format | `lib/export.ts` |
