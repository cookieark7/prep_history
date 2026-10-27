# Chronicle Landing Page: Build Prompt for Claude Code (v0)

Paste this whole file into Claude Code at the repo root, or save it as `docs/prompts/landing-build-prompt.md` and tell the agent: "Follow docs/prompts/landing-build-prompt.md."

---

## 0. Your job (read this first)

You are building the public landing page for **Chronicle**, a history-learning workspace. In the app, the learner types what they want to understand and the lesson appears as an interactive Stage: cause graphs, timelines, family trees, predict-and-reveal and quizzes, next to a short chat.

Work in this order:

1. **Orient (no code).** Read the repo: routes, `/lib/contracts`, design tokens, the store, any existing `/study` workspace, and any existing `/api/turn` mock mode. Then write `docs/LANDING.md`. It inherits this prompt and records how it maps onto the real repo: what already exists, conflicts and how you resolved them, the final file plan, and the placeholder table (section 3). If a conflict would change the plan materially (for example, `/` already holds real product UI you would have to delete), stop and ask. Otherwise continue.
2. **Build milestone by milestone** (section 11). Check each milestone's acceptance list before moving on.
3. **Finish with the report** described in section 13.

Rules:

- **Do not run `git commit`** or any other git write. The owner commits himself.
- **Do not change existing contracts** (`TurnRequest`, Director lines, block schemas). The landing page hands off a question as plain text only.
- **Nothing on this page calls an LLM.** Inference, auth and images are placeholders behind small interfaces (section 3). Every fake piece is tagged `TODO(inference)`, `TODO(auth)`, `TODO(plates)` or `TODO(legal)` so `grep TODO\(` finds all of them.
- **Use the content in section 8 exactly.** Don't invent history, dates or captions. If something looks wrong, flag it in the report instead of rewriting it.
- **Add only the dependencies named here:** `gsap` and `@gsap/react` (GSAP is free for commercial use, all plugins included), plus `sharp` as a dev dependency for the import script in L5. Everything else uses what the repo already has (Next.js App Router, TypeScript strict, Tailwind with CSS-variable tokens, Radix, Zod, Zustand).

---

## 1. What we're building

```text
┌───────────────────────────────────────────────────────────┐
│ Chronicle                                       Sign in   │  header (over the film)
│                                                           │
│  ┌──────────┐                                             │
│  │ placard  │                ( anchor )                   │  A. THE FILM: 100vh, autoplays
│  └──────────┘                                             │     about 65 s, Big Bang to now
│  13.8 billion years ago                  Pause    Skip ›  │
│ ───────────────────────────────────────────────────────── │  progress hairline
├───────────────────────────────────────────────────────────┤
│ STARTING POINTS                                           │  C. THE TIMELINE
│ Pick a moment. Ask the question you actually have.        │
│ How to ask:  Why · When · Who · What if · Test me         │  the prompt guide
│ ──●─────●─────●───≈───●─────●─────●─────●─────●───── ›    │
│         └─ card: date · title · line · 3 prompt chips     │
│ Or ask your own: [_____________________________________]  │
├───────────────────────────────────────────────────────────┤
│ footer                                                    │
└───────────────────────────────────────────────────────────┘

B. THE LOGIN CARD: a calm modal card over a slowly drifting wall of plates.
   Opened by "Sign in", by submitting the composer, or by any prompt chip.
```

1. **A. The film.** On load, a sequence of 35 antique-style plates plays by itself, from the Big Bang to now. Each plate has one round object (the **anchor**) at the exact center, and every transition passes through that anchor, so it reads as one continuous shot. It ends on a paper-white plate whose empty ring becomes the question box.
2. **B. The login card.** A clean white card with a serif headline floats over a slow wall of the same plates. The layout idea comes from a model-launch card we liked; we take the idea, not anyone's assets, wording or branding. Sign-in is a placeholder for now.
3. **C. Starting points.** A horizontal timeline of 20 major events. Each event opens a small card with three example questions of different kinds (Why, When, Who, What if, Test me). Clicking one carries the question into the app. This section is both a showcase and **a guide to what you can ask**.

---

## 2. Decisions already made (don't relitigate)

- The film **autoplays**. It is not scroll-driven. Scrolling the page past it is normal scrolling. No scroll-jacking and no smooth-scroll library.
- The film **plays once per visitor**. Returning visitors land on the final frame with a "Replay film" link.
- **The page never waits for images.** Every beat renders a drawn stand-in plate until a real image exists (section 4.3).
- Transitions go **through the anchor** (the "iris"). There is **one page turn**, at the switch from deep time to recorded history (B15 → B16).
- Most beats **pass** quickly (title and time only). Seven beats **dwell** long enough to read a cause caption. Pausing at any beat shows that beat's caption plus an "Ask about this" link.
- Prompt chips **prefill** the app's composer. They never auto-send. The learner presses Enter, which teaches them how to ask.
- Plates are **illustrations**, not artifacts. Once any real AI-generated plate is shown, the film carries a small "AI-generated illustrations" label.

---

## 3. Placeholders (fake on purpose)

| Piece | Interface | v0 placeholder | Tag | How it gets swapped later |
|---|---|---|---|---|
| Inference | `lib/inference/types.ts`: `InferenceClient.startTurn(req, {signal}) → AsyncIterable<DirectorLine>` | `lib/inference/placeholder.ts` streams one `say` line ("The lesson engine isn't connected yet. Your question is saved.") then `done` | `TODO(inference)` | Add `live.ts` using the real Director; pick the client in `getInferenceClient()` by `NEXT_PUBLIC_INFERENCE_MODE` = `placeholder` (default), `mock` (the existing `/api/turn` with `MOCK_LLM=1`, if the repo has it), or `live` |
| Auth | `lib/auth/types.ts`: `AuthClient` with `getSession`, `signInWithGoogle`, `signInWithEmail(email)`, `signOut`, `subscribe` | `lib/auth/placeholder.ts`: a fake session in localStorage, about 400 ms delay, email signs in immediately (no email is sent) | `TODO(auth)` | Replace with Auth.js, Keycloak or similar behind the same interface |
| Plates | `content/landing/plates.generated.json` (may be empty) | Drawn stand-in plates (section 4.3) | `TODO(plates)` | Run `scripts/import-plates.mjs` on the chosen images (L5) |
| Weekly-note toggle | stored on the placeholder session as `prefs.weeklyNote` | stored, never used | `TODO(auth)` | Wire to real email preferences |
| Terms and Privacy | plain text, no links | "Terms and Privacy Policy (coming soon)" | `TODO(legal)` | Real pages |

Rules for placeholders:

- **If the repo already has these pieces** (for example, `DirectorLine` in `/lib/contracts`, or a `MOCK_LLM` mode on `/api/turn`), import and reuse them. Don't duplicate.
- **If `/study` doesn't exist yet,** create a minimal stub page: the composer, plus an area that renders the placeholder inference reply. Tag it `TODO(workspace)`.
- In development only, show a tiny fixed badge in a corner: `inference: placeholder · auth: placeholder`.

---

## 4. Part A: The film

### 4.1 Timing

| Beat type | Hold | Transition | What shows |
|---|---|---|---|
| Act I pass (deep time) | 500 ms | iris 700 ms | title and ticker |
| Act II pass (recorded history) | 800 ms | iris 750 ms | title and ticker |
| Dwell (7 beats, `dwell: true`) | 3000 ms | iris 800 ms | title, ticker and cause caption |
| B15 → B16 | as above | **page turn** 1100 ms | the ticker flips from "years ago" to BCE/CE |
| B34 (Now) | settles | ring becomes composer, 700 ms | final frame |

- That totals about 65 s. All numbers live in one config object (`lib/landing/film-config.ts`), so pacing is tuned there, not in components.
- `?film=fast` (dev and tests only) speeds everything up 20×. `?film=reset` clears the "seen" flag.

### 4.2 How each beat moves

There are only two plate layers in the DOM at once, `current` and `next`, plus a third layer during the page turn. Reuse the elements. Animate only `transform`, `opacity` and `clip-path`. Drive it all from **one GSAP master timeline** built from a pure schedule (section 4.6), so pause, resume, skip and seek are just timeline calls.

- **Hold:** the current plate drifts from scale 1.00 to 1.04, centered (a slow push-in).
- **Iris (the signature move):** over the transition:
  - the current plate scales 1.04 → 2.6, ease-in, toward its center anchor, and fades to 0 over the last 45%;
  - the next plate sits underneath at scale 1.35 → 1.0, ease-out, revealed by `clip-path: circle(R at 50% 50%)`, with R growing from the anchor radius (about 9vmin) to 80vmax, ease-in-out.

  It reads as falling through the anchor into the next world. All anchors sit at the exact center, which is what makes this work.
- **Page turn (B15 → B16 only):** the stage gets `perspective: 1800px`. B15 rotates around its left edge, `rotateY` 0 → −110°, with shading that darkens as it turns. B16 is underneath at scale 1. During the turn, the ticker's old text slides up and out and the new text slides in. B16's placard carries one extra line: "From here, the clock counts calendar years."
- **Final frame (B34):** a paper plate with an empty ink ring at the center (about 22vmin). The ring morphs into the composer (FLIP): measure the composer's rect, animate an outline element from a circle (`border-radius: 50%`, 1.5px ink stroke) to the composer's rect and 6px radius over 700 ms, then fade the real input in underneath. Final frame copy:
  - Headline (serif, 44px): **Nothing happened by accident.**
  - Sub (serif, 20px, muted): Learn history as cause and consequence.
  - Composer placeholder: "What do you want to understand?" Helper text below it: "A topic, a question, or a paragraph you're reading."
  - Link: "Explore starting points ↓", which scrolls to section C.

### 4.3 Stand-in plates (until real images exist)

These must look intentional, like a quiet engraved plate, not like a loading state.

- **Background:** the beat's `bg` tint, flat. No gradients.
- **Grain:** an SVG `feTurbulence` paper grain at low opacity (about 6–8%).
- **Engraving:** 6–10 thin concentric hairline circles around the center (0.5px, 6–10% opacity), plus a sparse stipple. This suggests an engraved plate.
- **Anchor:** the beat's glyph (below), drawn with a 1.5px stroke at the center (about 18vmin), in the beat's `accent` color, or paper `#E9E3D8` on dark tints and ink `#1F1B16` on light tints. Compute dark vs light from the tint's OKLCH lightness (L < 0.6 counts as dark).
- **Glyphs:** 12 parametrized SVG glyphs cover all 35 anchors:

| Glyph | Drawing | Used by |
|---|---|---|
| `point` | a dot with a soft halo of fine rays | B01 |
| `star` | a dot with 8 to 12 hair-fine rays | B02, B11 |
| `disc` | a filled circle with a hatched shadow side | B03, B04, B10, B12, B17, B18, B19, B21, B32 |
| `ring` | a single circle | B13, B14, B24, B34 |
| `concentric` | 4 to 6 rings | B09, B16, B28, B35 |
| `spiral` | a logarithmic spiral | B07, B08, B25 |
| `cell` | a ring with a few inner dots, an optional nucleus | B05, B06 |
| `rose` | a compass rose (8 points) | B22, B26 |
| `orbits` | a sun dot with 3 elliptical orbits | B27 |
| `wheel` | a ring, hub and 8 spokes | B15, B23, B29, B31 |
| `dial` | a ring with 12 ticks and one hand | B30 |
| `globe` | a circle with 3 meridians and 2 parallels | B33 |

B20 (coin) uses `ring` with an inner `disc`. A stand-in plate never shows text. In dev only, a tiny `B07 · stand-in` corner label is fine.

### 4.4 The layers on top of the plates

- **Header:** "Chronicle" wordmark (serif, 20px) on the left and "Sign in" on the right. Its color follows the current plate (paper on dark, ink on light) and crossfades in 300 ms. Once the user scrolls past the hero, a sticky header appears with a paper background and a 1px rule.
- **Placard** (a museum label, in the left third, about 6vw from the edge):
  - a solid paper card (`#FAF7F2`, 1px rule border, no blur, no transparency), max width 340px, padding 16/20;
  - serif title (24px) and, on dwell beats, the serif caption (17px/1.5);
  - it enters 150 ms into the hold (opacity, y 8 → 0, 300 ms) and leaves at the start of the transition (200 ms);
  - on mobile portrait it moves to the bottom, full width minus 16px gutters.
- **Ticker:** mono (JetBrains Mono, tabular, 14px), bottom left, always visible. It counts during transitions:
  - **Act I** interpolates in log space between `t` values (years ago);
  - **Act II** interpolates linearly (calendar years);
  - **Formatting:** ≥1e9 → "4.6 billion years ago"; ≥1e6 → "540 million years ago"; otherwise "300,000 years ago". Years below 0 → "3500 BCE", 1 to 999 → "476 CE", 1000 and up → "1347". Round interpolated values to 2 significant figures so the digits don't jitter;
  - on arrival, it snaps to the beat's exact `label`, including "c." and ranges.
- **Controls** (bottom right, Inter 13px, real `<button>`s): Pause/Play, "Skip ›" and "Read as text". They dim to 40% after 2 s idle and return to full opacity on hover or focus.
- **Progress:** a 1px hairline across the bottom, with oxblood progress and one tick at the act break. Clicking it seeks.
- **Pausing** (button, Space or K while the film has focus) shows the current beat's placard with its caption, even on pass beats, plus an "Ask about this →" link. The link starts the handoff (section 7) with `kind: "why"` and the text "Why did this matter: {title}, {label}?" Resuming hides it.
- **AI label:** "AI-generated illustrations" (mono, 11px, muted), bottom left under the ticker. It is visible only once at least one real plate has been shown.

### 4.5 Behavior

- **Start:** after fonts are ready and the first three plates are decoded (stand-ins are instant), wait 400 ms, then play. If the tab is hidden at load, wait until it is visible.
- **Auto-pause** when the tab is hidden or the hero is less than 30% visible (IntersectionObserver). Auto-resume when that clears, unless the user paused.
- **Skip** seeks to the end and runs the ring-to-composer morph.
- **Seen flag:** when the film ends or is skipped, set `localStorage["chronicle.film.seen"] = "1"`. Wrap every storage call in try/catch, and treat storage that can't be read as "not seen". Seen visitors load straight onto the final frame with a "Replay film" link above the headline.
- **Reduced motion** (`prefers-reduced-motion: reduce`): no autoplay. Show the final frame with a "Play film" link. That plays crossfades only (400 ms) with the same holds: no iris, no page turn, no drift and no morph.
- **Photosensitivity:** never more than 3 large luminance flips per second. Stand-ins for B01, B02 and B11 must not flash the whole frame.

### 4.6 Pure logic (unit-tested, no DOM)

`lib/landing/film-schedule.ts`:

```ts
type Transition = "iris" | "pageTurn" | "crossfade" | "end";
type Slot = { id: string; start: number; holdEnd: number; end: number; transition: Transition; dwell: boolean };
export function buildSchedule(beats: Beat[], cfg: FilmConfig, opts: { reducedMotion: boolean; speed: number }): Slot[];
export function tickerAt(ms: number, schedule: Slot[], beats: Beat[]): string; // formatted ticker text
export function formatYearsAgo(n: number): string;
export function formatYear(y: number): string;
```

### 4.7 Accessibility

- The film is a `<section aria-roledescription="film" aria-label="A one-minute film from the Big Bang to today">`. Placard text is real DOM text. Mark the moving layers `aria-hidden`.
- "Read as text" opens a Radix Dialog with an ordered list of all 35 beats (label, title and caption). This is the accessible version of the film.
- There is a Pause control, as WCAG 2.2.2 requires for anything that moves for more than 5 s.
- Focus rings are 2px oxblood, and touch targets are at least 44px.

### 4.8 Performance

- Stand-ins cost zero network. With real plates, use `<img srcset>` with AVIF and WebP at 1280 and 1920, and preload B01.
- Keep a rolling window of the next 3 plates decoded (`img.decode()`). If the next plate isn't decoded when its transition is due, extend the current hold by up to 3 s, then use that beat's stand-in. **Never show a blank frame.**
- Budget: landing route JS under about 120 KB gzipped, excluding images. LCP under 2.5 s on a mid phone with real plates. No layout shift from the film.

---

## 5. Part B: The login card

- **Trigger:** "Sign in" in the header, submitting either composer while signed out, any prompt chip while signed out, or "Ask about this" in the film.
- **Backdrop:** a full-screen `PlateWall`. It crossfades slowly through 4 plates (B18, B22, B26, B27 by default, stand-ins until real ones exist), 6 s each, with a 1.00 → 1.05 push-in. A flat paper wash on top (`#FAF7F2` at 35%) keeps the card readable. No dark scrim and no blur. The film pauses underneath.
- **Card:** Radix Dialog, white surface `#FFFFFF`, 440px wide (full width minus 16px gutters on mobile), 6px radius, 1px rule border and a soft shadow (it's a floating layer). Padding is 32px.
  1. **Headline (serif, 28px):** "Begin where you're curious." If a question is pending, show "Sign in to ask" instead, with the question below it in serif italic, 18px, clamped to 3 lines.
  2. **Body (Inter, 14px, muted):** "Chronicle turns any history question into a lesson you can explore: causes, timelines, family trees and quizzes."
  3. **Primary button:** "Continue with Google" (placeholder).
  4. A thin "or" divider, then an email field and a secondary button, "Continue with email" (placeholder; no email is sent).
  5. **Toggle:** "Send me one short history note a week". Off by default (placeholder).
  6. **"Later"** as a text link, which closes the card.
  7. **Footer microcopy (12px, muted):** "By continuing you agree to the Terms and Privacy Policy (coming soon)."
- **Success:** the card content swaps to "You're in." for 300 ms, then the handoff navigates to `/study` (section 7). With no pending question, it goes to `/study` with an empty composer.
- Esc and "Later" close the card and return focus to whatever opened it. Focus is trapped while it's open (Radix does this).

---

## 6. Part C: Starting points

### 6.1 Section copy

- Eyebrow (mono, 12px, letter-spaced): `STARTING POINTS`
- H2 (serif, 40px): **Pick a moment. Ask the question you actually have.**
- Sub (serif, 20px, muted): Every event is a way in. The questions show what you can ask Chronicle. Tap one to start, or write your own.

### 6.2 "How to ask" legend (the prompt guide)

A row of 5 kinds. Each one has a small SVG mark, a label, an example and what the learner gets back (data in section 8.3). On desktop it's an inline row; on mobile, a horizontal scroll. Hovering or focusing a kind highlights the chips of that kind across the timeline.

If the app can't render a kind yet, hide that kind and its chips with `SUPPORTED_KINDS` in `content/landing/prompt-kinds.ts`. **The landing page must never promise a lesson type the app can't show.** Map the kinds onto the repo's actual block names in `docs/LANDING.md`.

### 6.3 The timeline

- **Spacing:** events are evenly spaced, not proportional to time, so cards stay readable. Each node is labeled with its date. Where the gap to the next event is more than 500 years, draw a small break mark (≈) on the axis.
- **Desktop:** a horizontal track inside native `overflow-x` scroll with `scroll-snap`, plus ‹ › buttons.
  - **Node:** the glyph (28px) on the axis, the title (serif, 16px) above it and the date (mono, 12px) below.
  - **Focusing or clicking a node** opens its `EventCard` as a Radix Popover: date, title, a one-line blurb and 3 prompt chips.
  - **Keyboard:** ←/→ move between nodes, Enter opens the card and Tab enters the chips.
- **Mobile (< 768px):** a vertical list with the axis on the left. Cards open inline as an accordion.
- **Cause links:** curved arcs above the axis between linked events, with a tiny label on hover. The style shows confidence, using the app's own language: **established** = solid, **likely** = dashed, **contested** = a hand-drawn wobbly line (roughjs, already in the stack) with a small "debated" marker. Cap arc height for far-apart events.
- **Prompt chip:** a small kind label in small caps, then the question in serif, for example `WHY · Why did Rome beat Carthage?`. Clicking it starts the handoff.
- **Under the timeline:** "Or ask your own", using the same composer component as the film's final frame.

### 6.4 Small animations (the "alive" part)

- **On first entering the viewport (once):**
  1. the axis draws left to right (600 ms);
  2. the nodes appear (scale 0.8 → 1, opacity), staggered 40 ms apart;
  3. the arcs draw in with `stroke-dashoffset` (500 ms each, staggered).

  Use IntersectionObserver plus CSS or a tiny GSAP call. No scroll-linked scrubbing.
- **Hover or focus on a node** plays its glyph's micro-motion once (≤ 900 ms, ease-out). Never loop, and never animate all nodes together.
  - `rose`: turns 30°
  - `wheel`: spins once
  - `globe`: meridians slide
  - `dial`: hand ticks forward
  - `disc`: flips on Y
  - `ring`: small sway
  - `concentric`: outer ring pulses
  - `spiral`: turns 90°
- **The selected node** gets an oxblood ring.
- **Reduced motion:** everything is static, with no draw-ins and no micro-motions.

---

## 7. Handoff contract (landing → app)

```ts
// lib/landing/handoff.ts
export type PromptKind = "why" | "when" | "who" | "whatif" | "quiz" | "free";
export type Handoff = { q: string; kind: PromptKind; ref?: string }; // ref = "E06" or "B24"
export function buildStudyHref(h: Handoff): string; // "/study?q=...&kind=why&src=landing&ref=E06"
export function requestStart(h: Handoff): void;     // the one entry point for every chip, composer and link
export function readHandoff(searchParams): Handoff | null; // used by /study
```

1. **`requestStart`** trims `q` and caps it at 1000 characters (the existing `TurnRequest.message` limit). It saves `{q, kind, ref}` to `sessionStorage["chronicle.pendingQuestion"]` (try/catch, so a real OAuth redirect later survives the round trip).
   - Signed in: navigate to `buildStudyHref`.
   - Signed out: open the login card with the question pending. After sign-in, navigate.
2. **On `/study`:**
   - Read the handoff from the URL, falling back to sessionStorage, then clear both (`router.replace` to the clean URL).
   - Prefill the composer, focus it and put the caret at the end.
   - Show a one-line hint above it: "From Starting points · press Enter to begin". It disappears on edit or send.
   - **Never auto-send.**
3. `kind` and `ref` are not sent to the Director. They exist for the hint now and analytics later. **No contract changes.**

---

## 8. Content (use exactly; dates are approximate where marked "c.")

Encode these as typed modules, validated with Zod in tests: `content/landing/beats.ts`, `content/landing/timeline.ts`, `content/landing/prompt-kinds.ts`.

### 8.1 Film beats (35, in play order)

`t` is years ago in Act I and a calendar year in Acts II and III (negative = BCE). `accent: null` means derive it from the tint. B35 is newer than the others, so its id is out of sequence. Array order is play order.

```ts
export const BEATS: Beat[] = [
  // Act I: deep time (log ticker)
  { id:"B01", act:1, title:"The Big Bang", label:"13.8 billion years ago", t:13.8e9, bg:"#0B0714", accent:"#FF7A3D", glyph:"point", anchor:"Point of light", dwell:true,  caption:"Everything begins as a point, hot and dense. As it cools, matter gathers." },
  { id:"B02", act:1, title:"First stars", label:"13.5 billion years ago", t:13.5e9, bg:"#101436", accent:null, glyph:"star", anchor:"Blue-white star", dwell:false, caption:"The first stars burn and explode, forging heavier elements." },
  { id:"B03", act:1, title:"Sun and planets form", label:"4.6 billion years ago", t:4.6e9, bg:"#3A1E10", accent:"#E8A33A", glyph:"disc", anchor:"Young sun disc", dwell:false, caption:"From the debris of earlier stars, the Sun and its planets form." },
  { id:"B04", act:1, title:"Earth and the Moon", label:"4.5 billion years ago", t:4.5e9, bg:"#4A1A10", accent:"#FF5A2A", glyph:"disc", anchor:"Molten sphere", dwell:false, caption:"A giant collision likely gives Earth its Moon, and with it, strong tides." },
  { id:"B05", act:1, title:"First life", label:"3.8 to 3.5 billion years ago", t:3.8e9, bg:"#0E3A3F", accent:null, glyph:"cell", anchor:"Round cell", dwell:false, caption:"In warm water, chemistry starts copying itself. Life begins." },
  { id:"B06", act:1, title:"Oxygen and the complex cell", label:"2.4 to 2.0 billion years ago", t:2.4e9, bg:"#5A2A1E", accent:"#1F4D3A", glyph:"cell", anchor:"Cell with nucleus", dwell:false, caption:"Microbes fill the air with oxygen. One cell swallows another and keeps it." },
  { id:"B07", act:1, title:"The Cambrian explosion", label:"540 million years ago", t:540e6, bg:"#0B3C4F", accent:null, glyph:"spiral", anchor:"Coiled shell", dwell:false, caption:"With oxygen and complex cells, bodies, eyes and shells appear in a rush." },
  { id:"B08", act:1, title:"Life reaches land", label:"470 to 375 million years ago", t:470e6, bg:"#1F4A2E", accent:null, glyph:"spiral", anchor:"Fern spiral", dwell:false, caption:"Plants move onto land first. Animals follow the food." },
  { id:"B09", act:1, title:"The coal forests", label:"300 million years ago", t:300e6, bg:"#17391F", accent:null, glyph:"concentric", anchor:"Tree rings", dwell:false, caption:"Swamp forests are buried before they can rot. Their carbon becomes coal." },
  { id:"B10", act:1, title:"Age of dinosaurs", label:"70 million years ago", t:70e6, bg:"#5C3B14", accent:null, glyph:"disc", anchor:"Pale sun disc", dwell:false, caption:"Dinosaurs rule for over 150 million years. Mammals stay small." },
  { id:"B11", act:1, title:"The impact", label:"66 million years ago", t:66e6, bg:"#1A0A08", accent:"#FF4A1C", glyph:"star", anchor:"Fireball", dwell:true,  caption:"An asteroid ends the age of dinosaurs. Small mammals inherit the Earth." },
  { id:"B12", act:1, title:"Upright walkers and the first tools", label:"6 to 2.6 million years ago", t:6e6, bg:"#6B4A24", accent:null, glyph:"disc", anchor:"Hammerstone", dwell:false, caption:"Our ancestors stand upright. Free hands begin shaping stone." },
  { id:"B13", act:1, title:"Homo sapiens", label:"c. 300,000 years ago", t:300000, bg:"#5A3C22", accent:null, glyph:"ring", anchor:"Campfire ring", dwell:false, caption:"Our species appears in Africa and, over time, spreads across the world." },
  { id:"B14", act:1, title:"Cave art", label:"c. 40,000 years ago", t:40000, bg:"#6E3A22", accent:null, glyph:"ring", anchor:"Handprint ring", dwell:false, caption:"People paint what they see and believe. Ideas begin to outlive their makers." },
  { id:"B15", act:1, title:"Farming", label:"c. 11,000 years ago", t:11000, bg:"#8A6A2B", accent:null, glyph:"wheel", anchor:"Millstone", dwell:false, caption:"Farming begins. Surpluses let people settle, store food and multiply." },
  // Act II: recorded history (linear ticker). The B15 -> B16 transition is the page turn.
  { id:"B16", act:2, title:"The first cities", label:"c. 3500 BCE", t:-3500, bg:"#8A4B2E", accent:null, glyph:"concentric", anchor:"Circular plaza", dwell:false, caption:"Surpluses feed cities. Cities need rulers, priests and records." },
  { id:"B17", act:2, title:"Writing", label:"c. 3200 BCE", t:-3200, bg:"#7A4A30", accent:null, glyph:"disc", anchor:"Clay disc", dwell:true,  caption:"To track grain and debts, people invent writing. Recorded history begins." },
  { id:"B18", act:2, title:"Pyramids and Indus cities", label:"c. 2600 BCE", t:-2600, bg:"#B07A3A", accent:"#2F4B8C", glyph:"disc", anchor:"Sun between two worlds", dwell:false, caption:"Egypt raises pyramids for its kings. Indus cities lay out streets and drains." },
  { id:"B19", act:2, title:"The age of thinkers", label:"c. 500 BCE", t:-500, bg:"#2F4B8C", accent:null, glyph:"disc", anchor:"Oil lamp", dwell:false, caption:"Across Greece, India and China, thinkers ask how to live and how to rule." },
  { id:"B20", act:2, title:"Silk Road empires", label:"c. 100 BCE", t:-100, bg:"#8C2F2B", accent:"#C9A24A", glyph:"ring", anchor:"Coin", dwell:false, caption:"Rome and Han China trade across Asia. Goods, ideas and germs travel together." },
  { id:"B21", act:2, title:"The fall of Western Rome", label:"476 CE", t:476, bg:"#6B645A", accent:null, glyph:"disc", anchor:"Cracked shield", dwell:false, caption:"Western Rome falls, and why is still debated. Its learning survives in the East." },
  { id:"B22", act:2, title:"House of Wisdom", label:"c. 830 CE", t:830, bg:"#1F5C5C", accent:"#C9A24A", glyph:"rose", anchor:"Astrolabe", dwell:false, caption:"In Baghdad, scholars translate and extend Greek, Persian and Indian knowledge." },
  { id:"B23", act:2, title:"The Mongol empire", label:"1206 to 1260", t:1206, bg:"#6A5A3A", accent:null, glyph:"wheel", anchor:"Yurt", dwell:false, caption:"The Mongols build the largest land empire yet and reconnect Asia's trade routes." },
  { id:"B24", act:2, title:"The Black Death", label:"1347", t:1347, bg:"#2E2B2A", accent:null, glyph:"ring", anchor:"Bell", dwell:true,  caption:"Along those routes, plague reaches Europe and kills a third or more." },
  { id:"B35", act:2, title:"Mali, the Aztec and the Inca", label:"c. 1325 to 1450", t:1400, bg:"#4E5A2C", accent:"#D4A03A", glyph:"concentric", anchor:"Ringed terraces", dwell:false, caption:"Meanwhile, Mali grows rich on Saharan gold, and the Aztec and Inca build empires." },
  { id:"B25", act:2, title:"The printing press", label:"c. 1450", t:1450, bg:"#3B2F20", accent:null, glyph:"spiral", anchor:"Screw platen", dwell:false, caption:"Gutenberg's press makes books cheap in Europe. Ideas start outrunning censors." },
  { id:"B26", act:2, title:"The oceans open", label:"1492 to 1498", t:1492, bg:"#1F4F73", accent:null, glyph:"rose", anchor:"Compass rose", dwell:false, caption:"Ocean routes join the continents. Trade, conquest and disease follow the ships." },
  { id:"B27", act:2, title:"The scientific revolution", label:"1543 to 1687", t:1543, bg:"#D8CBA8", accent:"#3B4A8C", glyph:"orbits", anchor:"Orbits around the sun", dwell:false, caption:"From Copernicus to Newton, printed ideas build on each other. Nature gets laws." },
  { id:"B28", act:2, title:"Revolutions", label:"1776 to 1789", t:1776, bg:"#7A2530", accent:null, glyph:"concentric", anchor:"Cockade", dwell:false, caption:"If nature follows laws, why not politics? America and France reject rule by kings." },
  { id:"B29", act:2, title:"The Industrial Revolution", label:"c. 1760 to 1840", t:1790, bg:"#3A3F44", accent:"#E2742B", glyph:"wheel", anchor:"Flywheel", dwell:true,  caption:"Coal from those ancient forests now drives machines. Work moves into factories." },
  { id:"B30", act:2, title:"The World Wars", label:"1914 to 1945", t:1914, bg:"#4A4A44", accent:null, glyph:"dial", anchor:"Stopped pocket watch", dwell:false, caption:"Industrial power turns to war. Two world wars kill tens of millions." },
  { id:"B31", act:2, title:"Independence and decolonization", label:"1947", t:1947, bg:"#D98A3D", accent:null, glyph:"wheel", anchor:"Spinning wheel", dwell:true,  caption:"Exhausted by war, empires retreat. India and Pakistan lead a wave of new nations." },
  { id:"B32", act:2, title:"The space age", label:"1969", t:1969, bg:"#0E1220", accent:"#E9E3D8", glyph:"disc", anchor:"Moon disc", dwell:false, caption:"People walk on the Moon and look back at Earth, small and whole." },
  { id:"B33", act:2, title:"The internet", label:"1990s", t:1995, bg:"#12202E", accent:"#5FB3C2", glyph:"globe", anchor:"Glass globe", dwell:true,  caption:"Computers link up worldwide. Anyone can publish; anyone can look things up." },
  // Act III
  { id:"B34", act:3, title:"Now", label:"Now", t:2026, bg:"#FAF7F2", accent:null, glyph:"ring", anchor:"Empty ring", dwell:false, caption:"Everything you just saw had causes." },
];
```

Notes:

- B29's ticker value is 1790, not 1760, so the ticker never runs backwards after B28 (1776).
- B34's `t` should come from the current year at runtime. 2026 is the fallback.

### 8.2 Starting-points events (20) and cause links

```ts
export const EVENTS: TimelineEvent[] = [
  { id:"E01", date:"c. 3500 BCE", year:-3500, title:"The first cities", glyph:"concentric",
    blurb:"Uruk and its neighbors in Mesopotamia grow into the first true cities.",
    prompts:[{kind:"why",text:"Why did the first cities appear in Mesopotamia?"},{kind:"when",text:"Walk me from the first farms to the first cities."},{kind:"quiz",text:"Quiz me on the first cities."}] },
  { id:"E02", date:"c. 3200 BCE", year:-3200, title:"Writing", glyph:"disc",
    blurb:"Scribes in Sumer mark signs on clay tablets, at first to keep accounts.",
    prompts:[{kind:"why",text:"Why was writing first used for accounting?"},{kind:"whatif",text:"What if writing had never been invented? Let me guess first."},{kind:"when",text:"Show where writing appeared around the world, in order."}] },
  { id:"E03", date:"c. 2600 BCE", year:-2600, title:"The Indus cities", glyph:"ring",
    blurb:"Harappa and Mohenjo-daro plan their streets, drains and standard weights.",
    prompts:[{kind:"why",text:"Why did the Indus cities decline?"},{kind:"when",text:"Show the rise and fall of the Indus civilization."},{kind:"quiz",text:"Test me on Harappa and Mohenjo-daro."}] },
  { id:"E04", date:"c. 268 to 232 BCE", year:-268, title:"Ashoka's empire", glyph:"wheel",
    blurb:"The Mauryan emperor turns from conquest to dhamma after the war in Kalinga.",
    prompts:[{kind:"who",text:"Who came before and after Ashoka?"},{kind:"why",text:"Why did Ashoka give up conquest after Kalinga?"},{kind:"whatif",text:"What if the Mauryan empire had held together after Ashoka?"}] },
  { id:"E05", date:"221 BCE", year:-221, title:"Qin unifies China", glyph:"ring",
    blurb:"The Qin state conquers its rivals and standardizes script, coins and weights.",
    prompts:[{kind:"why",text:"Why could Qin unify China when its rivals failed?"},{kind:"who",text:"Map the dynasties from Qin to Han."},{kind:"quiz",text:"Quiz me on the first emperor of China."}] },
  { id:"E06", date:"218 to 201 BCE", year:-218, title:"Rome against Carthage", glyph:"disc",
    blurb:"Hannibal crosses the Alps, wins at Cannae, and still loses the war.",
    prompts:[{kind:"why",text:"Why did Rome beat Carthage?"},{kind:"who",text:"Who were Hannibal's family, the Barcids?"},{kind:"whatif",text:"What if Hannibal had marched on Rome after Cannae?"}] },
  { id:"E07", date:"476 CE", year:476, title:"The fall of Western Rome", glyph:"disc",
    blurb:"The last western emperor is deposed. Historians still argue about why.",
    prompts:[{kind:"why",text:"Why did the Western Roman Empire fall?"},{kind:"when",text:"Show the last hundred years of the Western Empire."},{kind:"whatif",text:"What if the West had survived like the Eastern Empire did?"}] },
  { id:"E08", date:"c. 830 CE", year:830, title:"The House of Wisdom", glyph:"rose",
    blurb:"In Abbasid Baghdad, scholars translate and build on Greek, Persian and Indian works.",
    prompts:[{kind:"why",text:"Why did Baghdad become a center of learning?"},{kind:"when",text:"How did Greek science travel through Arabic into Europe?"},{kind:"quiz",text:"Test me on scholars of the Islamic Golden Age."}] },
  { id:"E09", date:"1206", year:1206, title:"The Mongol empire", glyph:"wheel",
    blurb:"Temüjin becomes Genghis Khan and unites the peoples of the steppe.",
    prompts:[{kind:"who",text:"Map Genghis Khan's sons and grandsons."},{kind:"why",text:"Why could the Mongols conquer so much so fast?"},{kind:"when",text:"Trace the Mongol conquests year by year."}] },
  { id:"E10", date:"1324", year:1324, title:"Mansa Musa's Mali", glyph:"disc",
    blurb:"Mali's ruler travels to Mecca with so much gold that Cairo talks about it for years.",
    prompts:[{kind:"why",text:"Why was the Mali empire so rich?"},{kind:"who",text:"Who ruled Mali before and after Mansa Musa?"},{kind:"quiz",text:"Quiz me on the empires of West Africa."}] },
  { id:"E11", date:"1347", year:1347, title:"The Black Death", glyph:"ring",
    blurb:"Plague reaches Europe along trade routes and kills a third or more of its people.",
    prompts:[{kind:"why",text:"Why did the Black Death spread so fast?"},{kind:"whatif",text:"Predict first: what happened to wages after the Black Death?"},{kind:"when",text:"Follow the plague's route from Central Asia to Europe."}] },
  { id:"E12", date:"c. 1450", year:1450, title:"The printing press", glyph:"spiral",
    blurb:"Gutenberg's press in Mainz makes books cheap enough to spread fast.",
    prompts:[{kind:"why",text:"Why did printing change Europe so quickly?"},{kind:"whatif",text:"What if the printing press had arrived 200 years earlier?"},{kind:"when",text:"Show how printing spread across Europe by 1500."}] },
  { id:"E13", date:"1492 to 1498", year:1492, title:"The oceans open", glyph:"rose",
    blurb:"Columbus reaches the Caribbean; six years later, da Gama reaches India by sea.",
    prompts:[{kind:"why",text:"Why did Europeans start crossing oceans in the 1490s?"},{kind:"when",text:"Put the first great voyages in order, Columbus to Magellan."},{kind:"quiz",text:"Quiz me on the age of exploration."}] },
  { id:"E14", date:"1526", year:1526, title:"The Mughal empire", glyph:"ring",
    blurb:"Babur wins at Panipat and founds an empire that will rule much of South Asia.",
    prompts:[{kind:"who",text:"Map the Mughal succession from Babur to Aurangzeb."},{kind:"why",text:"Why did the Mughal empire decline after Aurangzeb?"},{kind:"quiz",text:"Test me on the great Mughals."}] },
  { id:"E15", date:"c. 1760 to 1840", year:1760, title:"The Industrial Revolution", glyph:"wheel",
    blurb:"Coal, steam and machines move work from homes into factories.",
    prompts:[{kind:"why",text:"Why did the Industrial Revolution start in Britain?"},{kind:"whatif",text:"What if Britain had had no easy coal?"},{kind:"when",text:"Show the key inventions of the Industrial Revolution in order."}] },
  { id:"E16", date:"1789", year:1789, title:"The French Revolution", glyph:"concentric",
    blurb:"A bankrupt monarchy calls the Estates-General, and France's old order collapses.",
    prompts:[{kind:"why",text:"What caused the French Revolution?"},{kind:"when",text:"From the Estates-General to Napoleon, step by step."},{kind:"quiz",text:"Quiz me on the French Revolution."}] },
  { id:"E17", date:"1914 to 1945", year:1914, title:"The World Wars", glyph:"dial",
    blurb:"Two world wars, fought with industrial power, kill tens of millions.",
    prompts:[{kind:"why",text:"How did one assassination start a world war?"},{kind:"when",text:"Map the July Crisis of 1914 day by day."},{kind:"whatif",text:"What if the US had stayed out of the First World War?"}] },
  { id:"E18", date:"1947", year:1947, title:"Independence and Partition", glyph:"wheel",
    blurb:"British India becomes independent as two nations, India and Pakistan, amid mass violence.",
    prompts:[{kind:"why",text:"Why was British India partitioned in 1947?"},{kind:"when",text:"From the Quit India movement to independence, step by step."},{kind:"quiz",text:"Test me on the Indian independence movement."}] },
  { id:"E19", date:"1969", year:1969, title:"The Moon landing", glyph:"disc",
    blurb:"Apollo 11 lands people on the Moon, twelve years after Sputnik.",
    prompts:[{kind:"why",text:"Why did the US and the USSR race to the Moon?"},{kind:"when",text:"Show the space race from Sputnik to Apollo 11."},{kind:"quiz",text:"Quiz me on the space race."}] },
  { id:"E20", date:"1991", year:1991, title:"The World Wide Web", glyph:"globe",
    blurb:"The web goes public; in 1993 CERN makes it free for anyone to use.",
    prompts:[{kind:"when",text:"From ARPANET to the web, in order."},{kind:"why",text:"Why did the internet spread so fast in the 1990s?"},{kind:"whatif",text:"What if the web had been patented and paid for?"}] },
];

export const LINKS: CauseLink[] = [
  { from:"E01", to:"E02", confidence:"established", label:"cities need records" },
  { from:"E09", to:"E11", confidence:"likely",      label:"Mongol-era trade routes carry the plague" },
  { from:"E11", to:"E12", confidence:"contested",   label:"labor shortages spur new tools?" },
  { from:"E12", to:"E16", confidence:"likely",      label:"printed pamphlets spread new ideas" },
  { from:"E13", to:"E15", confidence:"contested",   label:"colonial wealth and markets?" },
  { from:"E15", to:"E17", confidence:"likely",      label:"war at industrial scale" },
  { from:"E17", to:"E18", confidence:"likely",      label:"war exhausts Britain" },
  { from:"E17", to:"E19", confidence:"established", label:"wartime rockets lead to space rockets" },
  { from:"E19", to:"E20", confidence:"established", label:"space-race research funding (ARPA) builds ARPANET" },
];
```

### 8.3 Prompt kinds (the legend)

```ts
export const PROMPT_KINDS = {
  why:    { label:"Why",     example:"Why did Rome beat Carthage?",           youGet:"a cause map: what led to it, and what it led to", mark:"diamond" },
  when:   { label:"When",    example:"Put the French Revolution in order.",   youGet:"a timeline you can zoom into",                    mark:"ticks" },
  who:    { label:"Who",     example:"Map the Mughal succession.",            youGet:"a family and succession tree",                    mark:"fork" },
  whatif: { label:"What if", example:"What if Hannibal had marched on Rome?", youGet:"you predict first, then see what historians think", mark:"half-circle" },
  quiz:   { label:"Test me", example:"Quiz me on the Black Death.",           youGet:"a short quiz built from the lesson",              mark:"check" },
} as const;
export const SUPPORTED_KINDS: (keyof typeof PROMPT_KINDS)[] = ["why","when","who","whatif","quiz"];
```

---

## 9. File plan (adapt to the repo; record the final version in `docs/LANDING.md`)

```text
/app/page.tsx                       landing: server shell plus client islands
/app/study/page.tsx                 existing workspace (reads the handoff), or a stub tagged TODO(workspace)
/content/landing/beats.ts           8.1
/content/landing/timeline.ts        8.2
/content/landing/prompt-kinds.ts    8.3
/content/landing/plates.generated.json   written by scripts/import-plates.mjs (starts as {})
/lib/landing/film-config.ts         every timing number
/lib/landing/film-schedule.ts       pure schedule and ticker logic (4.6)
/lib/landing/handoff.ts             section 7
/lib/auth/{types,placeholder,index}.ts
/lib/inference/{types,placeholder,index}.ts     only if the repo has none
/components/landing/film/   Film, PlateLayer, StandInPlate, glyphs/, Placard, Ticker, FilmControls, FinalFrame, ReadAsText
/components/landing/login/  LoginCard, PlateWall
/components/landing/timeline/  StartingPoints, HowToAsk, Timeline, EventNode, EventCard, PromptChip, CauseArc
/components/landing/Composer.tsx    shared by the final frame and "Or ask your own"
/scripts/import-plates.mjs          L5
/public/plates/                     empty until L5
```

---

## 10. Design tokens (from the Chronicle design system)

Reuse the repo's tokens if they exist. Otherwise, these are the values:

- **Type:** Source Serif 4 for content (fallback Charter, Georgia), Inter 13–14px for UI, JetBrains Mono for dates and the ticker. Load them with `next/font`.
- **Paper theme:** bg `#FAF7F2`, surface `#FFFFFF`, text `#1F1B16`, muted `#6B645A`, rule `#E6DFD3`. The single accent is oxblood `#8C2F2B`: primary buttons, links, focus, the selected node and film progress.
- **Shape and motion:** 8px grid. 6px radius on controls and the login card, 0–2px on content. 1px rules instead of shadows, except on floating layers. UI motion is 150–200ms ease-out; the film follows its own timings.
- **Never use:** glassmorphism or blur, purple/blue SaaS palettes, emoji, stock illustrations, card grids, confetti or badges.
- **Landing-only exceptions:**
  1. Film plates are full-bleed dark or colored tints.
  2. Shading gradients are allowed only inside the page-turn effect.

---

## 11. Milestones and acceptance checks

**L0: Orient and spec.** Write `docs/LANDING.md` as described in section 0.
- [ ] It lists the existing routes, contracts and tokens it found, every conflict and its resolution, the final file plan, the placeholder table and the kind-to-block mapping.

**L1: Data and pure logic, with tests.**
- [ ] All 35 beats and 20 events pass their Zod schemas.
- [ ] Every link references existing events. Every event has 3 prompts of 3 different kinds. Every prompt is at most 120 characters.
- [ ] The total schedule at speed 1 is between 55 and 75 s. B15 → B16 uses `pageTurn`. Reduced motion uses only `crossfade`.
- [ ] The ticker is monotonic within each act and formats every example in 4.4 correctly.

**L2: The film with stand-ins.**
- [ ] It plays end to end with zero image files.
- [ ] Pause, resume, skip and seek all work. Pausing shows the caption and "Ask about this".
- [ ] It auto-pauses when the tab is hidden or the hero is scrolled away, and resumes correctly.
- [ ] A returning visitor lands on the final frame. `?film=reset` and "Replay film" work.
- [ ] The reduced-motion path works.
- [ ] Screenshots look right at 1440×900 and 390×844, including a mid-iris frame and the page turn.
- [ ] Only `transform`, `opacity` and `clip-path` animate. No long tasks during transitions; profile once and report.

**L3: Final frame, login card and handoff.**
- [ ] Signed out: type a question, press Enter, the card shows "Sign in to ask" with the question, click "Continue with Google", land on `/study` with the composer prefilled and focused, the hint shown and the URL cleaned.
- [ ] Signed in: chips and the composer skip the card.
- [ ] Esc and "Later" close the card and return focus to the opener.
- [ ] Nothing auto-sends. If you send from `/study`, the placeholder inference reply renders.

**L4: Starting points.**
- [ ] All 20 events render.
- [ ] Keyboard ←/→, Enter and Tab work. Every chip runs the same handoff.
- [ ] The arcs show all three confidence styles.
- [ ] The draw-in plays once. Micro-motions play on hover and focus. Reduced motion keeps everything static.
- [ ] Mobile shows the vertical layout.
- [ ] Hiding a kind in `SUPPORTED_KINDS` removes it from the legend and from every card.

**L5: Real plates.** `scripts/import-plates.mjs <dir>` takes chosen files named `B01.jpg|png|webp` (for example, picked from `gen_plates.py` output).
- [ ] It writes `/public/plates/B01-1280.avif`, `-1280.webp`, `-1920.avif` and `-1920.webp` with `sharp`, and updates `plates.generated.json`.
- [ ] Beats with an entry show the image, and the others keep their stand-ins.
- [ ] Decode-gating works (4.8). The "AI-generated illustrations" label appears with the first real plate.

**L6: QA.**
- [ ] Playwright smoke tests (add Playwright as a dev dependency if the repo has none):
  - the landing page loads;
  - `?film=fast` reaches the final frame;
  - the composer handoff reaches `/study` prefilled;
  - a chip handoff works;
  - reduced motion (emulated) shows the final frame.
- [ ] Report Lighthouse performance and accessibility for `/` on mobile and desktop.

---

## 12. Do not build

Real auth, real LLM calls, analytics, sound, scroll-jacking or smooth-scroll libraries, a CMS, i18n, A/B tests, cookie banners, new contract fields, or video. Don't use anyone else's brand assets, launch imagery or wording.

---

## 13. Final report (your last message)

1. **What was built,** per milestone, with any acceptance item that did not pass and why.
2. **Deviations from this prompt,** and the reason for each.
3. **The placeholder table,** with real file paths and the exact swap steps.
4. **Content you think is wrong,** quoted (don't fix it silently).
5. **Open questions for the owner.** Remember: no git commits.
