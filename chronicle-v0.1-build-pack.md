# Chronicle v0.1: Enhancement Guide for the Coding Agent

**Audience:** a coding agent that already has the Chronicle repo and the v0 build pack (`chronicle-v0-build-pack.md`) in context.
**Purpose:** upgrade the existing v0 UI with a small set of proven chat-product patterns, without rewriting anything that already works.
**Mode:** `plan+build` (default). If the user says `plan-only`, stop after Phase 1.

This guide is deliberately generic. It does not name files, because the repo is the source of truth for structure. Your first job is to discover the structure, then write your own spec that inherits both documents, then build.

---

## 0. The task in one paragraph

v0 already exists: a chat dock plus a Stage of typed blocks, streamed from a Director prompt as JSON lines. Do **not** rebuild it. Add the enhancements in section 3, only where the repo does not already do them well. Write a new spec file that inherits the v0 build pack and this guide, then implement it in the order given, one enhancement at a time.

## 1. Two worlds you inherit

**World A: the v0 build pack and the repo.** Principles (event is the atom, causation is the main axis, chat is a remote control and the Stage is the lesson, confidence is visible, calm and archival), the 7 block types, the 5 ops, the JSON-lines protocol, the design tokens, the milestone discipline.

**World B: this guide.** A short list of interaction patterns taken from a teardown of 15 AI chat products. They are hypotheses that fit our product, not requirements to copy.

**Precedence when they conflict:**
1. The user's latest instruction.
2. This guide, for what to build.
3. The v0 build pack, for intent and constraints.
4. The code, for what actually exists. If the docs say something exists and the code disagrees, the code wins as a fact, and you note the gap in your spec.

## 2. Hard rules

- **Do not break v0.** Existing tests must keep passing. Existing lessons in localStorage must still load; if you change a persisted shape, bump the storage version and migrate or discard cleanly.
- **No new block types, no new ops.** Contract changes are allowed only where section 3 explicitly names one, and each must be additive and optional.
- **No new dependencies unless unavoidable.** Prefer what the repo already uses. If you add one, justify it in the spec in one sentence.
- **Inherited design constraints apply:** use the existing tokens (paper, sepia, ink), no gradients, glassmorphism, emoji, card grids, confetti, streaks or badges. Radii 6px on controls, 0 to 2px on content. Motion 150 to 200ms ease-out. Respect `prefers-reduced-motion`.
- **Accessibility is part of done:** visible 2px focus ring, full keyboard operation, 44px touch targets, text scales to 200%, never color alone, an `aria-live` region for streamed announcements.
- **Prompt changes are code changes.** Any edit to the Director prompt must also update the fixtures and the calibration sample, and must be re-tested (section 6).
- **Out of scope for this guide (do not build):** auth, database, accounts, caching, fact-checking, evals, guardrails, exam modes, a thinking/reasoning block, a code block with copy, a full sidebar chat history, edit-and-branch, plan-then-run cards, projects and memory, image or file attachments, a Search/Think/model toggle row.

## 3. The enhancement set

Eight enhancements, in build order. For each, **audit first**: if v0 already does it well, mark it `verified` in your spec and move on. Only build or extend what is missing or weak.

### E1. Composer upgrade (rows: auto-grow, smart paste, Send to Stop)

Behavior:
- Auto-growing textarea: grows with content up to a maximum height (about 8 lines), then scrolls inside itself.
- Enter sends; Shift+Enter inserts a newline. **IME guard:** do not send while composing (`isComposing` or keyCode 229), so CJK and other IME input does not send early.
- Long paste: if pasted text exceeds a threshold (a named constant, about 1,200 characters), collapse it into a chip-like card ("Pasted text, N words") with expand and remove actions, instead of flooding the box. Short pastes insert normally.
- The Send button becomes **Stop** while a turn streams. Stop aborts the request; blocks already on the Stage stay; the chat shows a quiet "Stopped" row; the composer is immediately usable again. Esc also stops.
- Draft text survives a failed request.

Contract change (additive, optional): `TurnRequest.source_text?: string` (max about 8,000 characters), used when a long paste is attached. Director context gets a `<source_text>` block, and the Director prompt gets one rule: *treat source_text as material the learner is reading; anchor the lesson to it, do not summarize it back verbatim, and keep the usual block rules.*

Acceptance: growth and scroll behave at 1, 8 and 30 lines; IME composition does not send (unit test the key handler); a 5,000-character paste becomes a card and is sent as `source_text`; Stop mid-stream keeps existing blocks and re-enables the composer.

### E2. Status microcopy (rotating verbs while waiting)

Behavior:
- Between send and the first valid line, show a single status line in the reply row (no spinner, no typing dots) with a thin progress rule. Rotate short verbs about every 2 to 3 seconds, drawn from a small list that matches our content, for example: "Mapping causes", "Placing events in time", "Checking who came before whom", "Looking for the turning point".
- Once ops start arriving, switch to op-driven text: "Adding cause graph", "Adding timeline". When an op lands, it becomes "Cause graph added".
- On done or abort, clear the status.
- Reduced motion: swap text without animation.

Acceptance: status shows within 150ms of send; switches to op-driven text on the first op; clears on done, error and abort; a screen reader announces the change politely (not on every rotation, only on op-driven changes).

### E3. Lesson rail (rows: chat timeline rail, step trace)

A thin vertical rail on the right edge of the Stage with **one tick per block**.

Behavior:
- Hover or focus shows the block title in a small label. Click scrolls to the block and briefly highlights it.
- The active tick follows scroll (`IntersectionObserver`, with the block nearest the reading position active).
- Completion state: a tick fills once the block's interaction is done (predict gate answered or skipped, quiz finished). Blocks with no interaction fill when they have been in view for a short dwell time.
- Tick shape reflects the block type using the existing block-type icons or shapes (never color alone).
- Ticks appear as blocks land, with the same soft highlight used elsewhere.
- Relation to the time spine: the time spine on the left shows **history time**; this rail on the right shows **lesson structure**. Keep both thin and visually distinct.
- Mobile (under 768px): no rail. Replace it with a compact progress bar at the top and a "Jump to" bottom sheet listing blocks.
- Keyboard: the rail is a navigable list; arrow keys move between ticks, Enter jumps. It must not trap focus.

Step-trace tie-in: the chat reply's "landed" chips and the lesson-history log are the step trace. Make sure they share one data shape (op label, block id, status, timestamp) so the rail, the chips and the history drawer all read from the same entries rather than three parallel structures.

Acceptance: ticks match the block list exactly, including after undo and after reload; active tick follows scroll in both directions; completion survives reload; works with 1 block and with 12.

### E4. Scroll behavior (row: stick-to-bottom, adapted)

- **Stage: never auto-scroll.** The learner is reading near the top while blocks land below. When a block lands outside the viewport, show a small chip ("Cause graph added, below") near the bottom edge. Clicking it scrolls to and highlights the block. It dismisses itself when the block enters view or after a timeout. Several chips collapse into one ("3 blocks added, below").
- **Chat dock only: stick-to-bottom.** Auto-scroll the dock while the user is within about 80px of the bottom. If they scroll up, stop, and show a "Jump to latest" button.
- Never move the learner's scroll position on patch ops (a patched block grows in place).

Acceptance: with the viewport at the top of a long lesson, landing blocks never changes scroll position; the chip appears and works; the chat dock behaves as described in both directions.

### E5. Article patch-streaming (row: streaming render, adapted)

Problem: an article arrives as one complete JSON line, so a long article waits until the whole line is done.

Change (prompt plus fixtures, no schema change):
- The Director's `add` for an article carries **only the first ("brief") section**. Remaining sections arrive as separate `patch` ops, **one section per patch**, using the existing merge-by-heading behavior (same heading replaces, new heading appends).
- Order guidance in the Director prompt: emit the brief article first, then the other blocks (so the cause graph and others are not blocked behind article text), then the article's remaining sections as patches.
- Patches that target a block added earlier in the same turn must work. Verify in the reducer and in any server-side validation (server checks must not reject a patch just because the target was added in the same stream).
- A patched section appears in place with the existing "updated" marker, without moving the learner's scroll position (see E4).

Acceptance: first paint of an article is the brief section alone; later sections append without layout jumps; undo of one patch removes only that section; the calibration sample and mock-mode fixtures are updated to the new shape and still parse.

### E6. Block actions and a resizable dock (rows: side panel, message action bar)

- **Block menu** (already in the v0 header): make sure it offers Copy (E7), Fullscreen, Pin and Undo, with consistent order and shortcuts. On desktop it is visible on hover and focus; on mobile it is visible only on the block currently in view.
- **Resizable chat dock:** a drag handle between dock and Stage; min about 280px, max about 520px; width persisted; keyboard operable (the handle is a `separator` with arrow-key resizing and a visible focus state); the existing collapse shortcut still works; double-click the handle resets the width.
- **Canvas mode** remains the expanded form of the side panel. Do not build a second panel system.

Acceptance: resize by mouse, touch and keyboard; width persists across reload; the Stage reflows without horizontal scroll at the minimum and maximum widths.

### E7. Rich copy (row: rich clipboard copy)

- Copy on a block writes **both** `text/plain` (Markdown) and `text/html` using `ClipboardItem`, with a `writeText` fallback where `ClipboardItem` is unavailable. Button label flips to "Copied" for about 1.5 seconds.
- Write one serializer per block type in a single shared module (reuse the Markdown export module if v0 already has one, and keep a single source of truth):
  - article: headings and paragraphs; confidence tags rendered as short text such as "(established)", "(likely)", "(contested)".
  - cause_graph: a bullet list of "cause -> effect: why".
  - timeline: an ordered list or table of year, label, track.
  - lineage: a nested list by generation, with succession order noted.
  - predict_gate and quiz: prompt, options and answer with the explanation.
  - callout: a blockquote.
- "Copy lesson" at the top bar copies all blocks in order.

Acceptance: pasting into a rich editor keeps headings and lists; pasting into a plain editor gives clean Markdown; each serializer has a unit test with a fixture.

### E8. Audit and fill gaps (rows: follow-up chips, starter empty state, Cmd+K, keyboard layer)

These should already exist from the v0 pack. Verify and fill only gaps:
- Follow-up chips: up to three under the latest reply; one click sends them; they disappear or dim after use.
- Starter empty state: one line, a composer, era chips, a level selector, four example prompts, a "Continue" list. No illustration.
- Cmd+K palette: includes at least New lesson, Test me, Change level, Switch theme, Open canvas, Copy lesson, Toggle dock.
- Keyboard layer: new lesson, focus the composer (`/`), toggle the dock, next and previous block (`j` and `k`), fullscreen (`f`), exit (Esc), shortcut cheat sheet (`?`). Document the final list in the cheat sheet.

Acceptance: every shortcut works, none collides with typing in the composer, and the cheat sheet matches reality.

## 4. Explicitly skipped, with reasons (do not build)

| Skipped | Reason |
|---|---|
| Thinking block | Fights "chat is a remote control"; the one-line `say` covers it |
| Code block with copy | We have no code |
| Full sidebar history | The left dock is the conversation; lesson history lives on Home and in Cmd+K |
| Composer tool row (Search, Think, model picker) | We already have era chips, level and mode switches |
| Real citation cards | Wait for fact-checking; the confidence tags and entity cards cover v0.1 |
| Edit and branch, plan-then-run, projects and memory | Later; they need persistence or new block types first |

## 5. Process

### Phase 0: Orient (read only, no code)

1. Read `chronicle-v0-build-pack.md` and this guide completely.
2. Explore the repo: structure, state store, reducer, stream client, chat dock, Stage, block renderers, design tokens, tests, scripts, and the Director prompt and fixtures.
3. For each enhancement E1 to E8, decide `verified`, `extend` or `build`, with evidence (file paths, behaviors you observed). Run the existing tests and note the baseline.

### Phase 1: Write the inheriting spec

Create `docs/ENHANCEMENTS_v0.1.md` (or the repo's docs location) using this template exactly:

```text
# Chronicle v0.1 Enhancements (spec)

## 1. Inheritance map
- From the v0 build pack: (principles, contracts, protocol, tokens you rely on)
- From the enhancement guide: (the enhancements in scope)
- From the code: (facts that differ from the docs)

## 2. Current-state inventory
| ID | Enhancement | Status (verified / extend / build) | Evidence (paths, behavior) |

## 3. Delta
| ID | Action | Files to touch | Contract change? | Prompt change? | Tests to add |

## 4. Contract and prompt changes
(Exact diffs: the source_text field, the Director rule additions, fixture updates.)

## 5. Per-enhancement spec
(For each E-item you will build or extend: behavior, states, edge cases,
mobile behavior, accessibility notes, acceptance criteria, in the repo's own terms.)

## 6. Order and gates
(E1 -> E2 -> E4 -> E5 -> E3 -> E6 -> E7 -> E8, each with the check that must pass
before the next begins.)

## 7. Conflicts and open questions
(Anything the docs and the code disagree on, and your recommended resolution.)

## 8. Parked
(Everything in section 4 of the guide, plus anything you chose not to do and why.)
```

After writing it, print a summary of at most 10 lines: what is verified, what will be built, any contract or prompt change, and any open conflict. If the mode is `plan-only`, stop here.

### Phase 2: Build

- Build in this order: **E1, E2, E4, E5, E3, E6, E7, E8.** E4 comes before E3 because the rail and the landing chips share the "block landed" signal.
- One enhancement at a time, one commit (or one reviewable change set) each, with the enhancement ID in the message.
- Do not start the next enhancement until the current one meets its acceptance criteria, its tests pass, and the v0 tests still pass.
- Stop and ask the user only if: a persisted-shape change cannot be migrated cleanly, a contract change beyond the additive `source_text` seems necessary, or a v0 behavior would have to be removed to proceed. Otherwise decide, record the decision in section 7 of the spec, and continue.

## 6. Verification

- **Automated:** unit tests for the IME guard, paste threshold, serializers, reducer patches targeting same-turn blocks, rail-to-block mapping, and the scroll-chip logic; the existing test suite still passes.
- **Prompt re-test (required after E1 and E5):** run these three turns in mock mode and, if an API key is configured, in real mode. Outputs must still be valid JSON lines, patch instead of duplicate, and match the updated calibration sample's shape.
  1. `I want to understand the fall of the Western Roman Empire.`
  2. `Why did the Mughal empire decline?` (with an existing stage)
  3. A turn that includes a long pasted `source_text`.
- **Manual, desktop and mobile widths:** the golden path (type a topic, watch blocks land, answer a predict gate, run a quiz, copy a block, resize the dock, jump with the rail), with reduced motion on and off, keyboard-only, and at 200% text size.

## 7. Definition of done

- E1 to E8 are each `verified` or implemented, and recorded in the spec.
- The spec file exists and matches what was built.
- The Director prompt, calibration sample and fixtures agree with each other.
- No new block types or ops, no out-of-scope features, no regression in v0 tests.
- A short change log in the spec lists every contract, prompt and persisted-shape change.