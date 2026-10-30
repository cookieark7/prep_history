# Chronicle: where things stand

Audit of 27 Oct 2026, updated 28 Oct after the checklist pass (section 6) and 30 Oct after the leftover fixes and commits. Sources: the git history, the docs (`README.md`, `PRODUCT.md`, `docs/*`), the design critique in `.impeccable/`, the session transcripts, and fresh checks run that day. Update this file when an item moves; it replaces re-asking "what's done?".

**Health on 29 Oct:**
- **Passing:** typecheck, lint, 242 tests (31 files), `next build`, and all 9 end-to-end steps.
- **Pages:** `/`, `/start`, `/study`, `/review` and `/stats` all load, in light and dark.
- **Docker keeps stopping on this Mac** (three times on 28 Oct). When the database is down, the end-to-end steps that need it fail. Start it with `open -a Docker`, then `docker compose up -d db`.

**Committed:** the work is on `chronicle-v0.1` in chunks:
- 27 Oct: prototype, redesign, homepage, docs, then the phone fixes;
- 28 Oct: homepage questions start at once, and the old timeline tree is retired;
- 30 Oct: lesson writing for UPSC, the redesign checklist, and `DESIGN.md` with the review captures.

Nothing is pushed: the repository has no remote yet. Some things stay local only and are ignored by git, because they're large:
- raw image-generation output (`image_gen/out/`, about 300 MB, regenerable);
- screen recordings (`docs/**/*.mp4`, about 100 MB).

---

## 1. Done

### Lesson workspace (v0 and v0.1, committed)
- [x] Contracts, mock Director with 3 sample lessons, streaming turn API (M0, M2).
- [x] Stage with article, cause map, timeline, lineage, prediction gate, quiz, callout; canvas, timeline and focus views (M3–M5).
- [x] Notes, fullscreen reading, history and undo, Markdown export (M6).
- [x] v0.1 E1–E8:
  - composer;
  - status line;
  - lesson rail;
  - scroll behaviour;
  - article patch-streaming;
  - block actions and resizable dock;
  - rich copy;
  - shortcuts and the cheat sheet.

### Prototype on free tiers (built 20 Oct, record in `docs/PROTOTYPE_PLAN.md`)
- [x] **LLM chain:** Cloudflare `gpt-oss-120b` first, OpenRouter's free Gemma as the fallback. A forced 429 was checked to fall back.
- [x] **Director prompt:** split into 11 versioned modules, with repair before validation.
- [x] **Database:** Postgres 16 + pgvector (Docker, port 5433), with Drizzle migrations applied at startup.
- [x] **Accounts:**
  - guests by default;
  - email sign-in link (printed in the server log in development);
  - a guest's lessons and cards move to the account they sign in to.
- [x] **Sync:** lessons are saved with versions, and a lesson opens on a second device.
- [x] **Turn log and limits:** every turn is logged (`/admin/turns`). Limits are 20 turns a day for guests, 60 for accounts, 6 a minute.
- [x] **Sources:** 43 Wikipedia articles, about 2,500 passages, hybrid retrieval, `[S#]` citations with a popover.
- [x] **Retention:** memory cards from each lesson, scheduled with FSRS. `/review` (recall, then rate), `/stats` (streak, retention by interval) and the review prompt on `/start`.
- [x] **PWA:** manifest and icons.
- [x] **Evals:** on 20 Oct the earlier prompt passed 16 turns at 99% valid lines, and a 3-turn run on the current prompt passed.

### Redesign (22–24 Oct, the restyle session)
- [x] Design critique saved: 24/40 (`.impeccable/critique/`).
- [x] **Look chosen** (`PRODUCT.md`): a calm, Notion-like study app with one signature, time drawn as a route line with stations and a yellow station board for "you are here".
  - railway maroon for actions;
  - Atkinson Hyperlegible for text, Archivo on boards;
  - light and dark themes.
- [x] App frame: a sidebar on laptops, bottom tabs on phones (Learn, Review, Progress).
- [x] `/start` rebuilt:
  - the syllabus line, with the station board sliding between stations;
  - a station's starter questions and the 5 lenses (story, timeline, people, places, cause and effect);
  - the review panel and recent lessons.
- [x] `/study` restyled:
  - the route line runs through the lesson;
  - a simpler top bar with a More menu;
  - "To remember" closes the lesson;
  - phone layout cleaned up;
  - the Depth control relabelled.
- [x] `/review` and `/stats` moved into the same frame.
- [x] `PRODUCT.md` rewritten for UPSC and state PSC students, with history through many lenses (cause and effect is one of them).

### Homepage `/`
- [x] It's the public page now; the app home moved to `/start`, and `/welcome` redirects to `/`.
- [x] **Layout** (your choice, 24 Oct): the slideshow at the top in a rounded box, then the headline, the question box with lens chips, three syllabus questions, and the syllabus line.
- [x] **Slideshow:**
  - 35 plates from the Big Bang to now, playing on a clock, in a loop, with pause and play;
  - it pauses while scrolled away;
  - the stutter and the end freeze are fixed;
  - 60 fps in headless Chrome, including a phone profile with the CPU slowed 4×.
- [x] **Images:**
  - AVIF plus tall phone crops, with a WebP fallback;
  - loaded just ahead of playback;
  - 3.9 MB on desktop and 2.3 MB on a phone, down from 9.6 MB.
- [x] Reduced motion: the slideshow waits on its first frame, and "Read as text" lists all 35 moments.
- [x] **Handoff to `/study`:** your question travels with you, through the sign-in card if needed. It is filled in but not sent.
- [x] Light and dark.

### Plans written (no code)
- [x] **Exam prep and explore modes:** `docs/MODES_PLAN.md`, with 10 open questions.
- [x] **Image pipeline:** Cloudflare FLUX scripts in `image_gen/`, plus prompts for the Nano Banana deep-time set (end of `docs/chronicle-homepage-image-sequence-pack.md`).

---

## 2. Half done

Each item: what exists, then what's missing.

### Product and content
- [ ] **Sources for the actual syllabus.**
  - Have: 57 Wikipedia articles. About 24 cover India: the Mauryas, the Mughals, and the Marathas, added 28 Oct as 14 titles and 216 passages. "Sardeshmukhi" redirects to the "Chauth" article.
  - Missing: the Delhi Sultanate, Vijayanagara, Bhakti and Sufi, Plassey and Buxar, 1857, the national movement and Partition. Until these exist, most UPSC lessons are uncited, and free models get dates wrong.
- [ ] **Syllabus data.**
  - Have: `content/syllabus.ts` holds the stations and their starter questions.
  - Missing: stations split into short series ("The Marathas, in four parts"), and progress per part.
- [x] **Evals** (28 Oct, `docs/evals/2026-10-28-*`).
  - **Full run on the lens rules:** 20 cases, the 16 originals plus 4 UPSC cases on the Marathas. 10 of 20 passed; valid lines 98.2%.
  - **New UPSC cases:** "learn the Marathas" passes with 8 citations from the new sources. The timeline lens gives a timeline.
  - **Targeted re-run** of the 8 failures after tightening three rules: the timeline lens and the Prelims fact question (chauth as a quarter of the revenue) now pass.
  - **Still failing:**
    - "who succeeded Akbar" patches the Mughal timeline already on the stage instead of adding a lineage block (allowed by the rules; the check may be too strict);
    - pasted text is cited from the paste, not the sources;
    - a few turns get malformed JSON from the free model.
  - On the old prompt, 12 of the original 16 passed; now 9 of the same 16. On free models one run is noisy, so the gap is unproven either way.
- [x] **Director rules** (28 Oct, `lib/prompts/director/{role,rules,pedagogy,grounding}.ts`):
  - the lens follows the question (story, timeline, people, places, cause and effect);
  - exam facts (dates, people, places, terms) are stated precisely rather than played down;
  - an article always has a brief and a standard section;
  - who-ruled questions always get a lineage block;
  - each article section cites a source when the passages cover it.

### Accounts and real-world setup
- [ ] **Google sign-in:** the code is there, but no `GOOGLE_*` keys are set.
- [ ] **Real emails:** the sign-in link only prints in the server log; no `RESEND_API_KEY` or `EMAIL_FROM` is set.
- [ ] **Turn log access:** `/admin/turns` exists, but `ADMIN_EMAILS` is empty, so in production nobody can open it.

### Homepage
- [ ] **Plates.** Act I still uses the FLUX plates.
  - Three Nano Banana images (point, galaxy, young Sun) were tested and fit, but aren't swapped in.
  - Two more are needed: molten Earth, and the cloud eye. Their prompts are written.
  - The critique notes only about 6 of the 35 plates fit Indian eras.
- [x] **Leftovers from earlier homepage versions** (28 Oct): the vertical tree is retired.
  - Removed: its code, styles, layout, tests and the 20-event file, plus the old landing question box, the event icons and the prompt-kind data.
  - Questions moved: 16 example questions went into the 8 syllabus stations that cover those events (`content/syllabus.ts`, now tested).
- [x] **Stale wording** (28 Oct): `docs/LANDING.md` opens with "The homepage today" and marks the rest as history; the `LoginCard.tsx` comment is corrected.

### Redesign
- [x] **Critique P1 issues** (closed 28 Oct):
  - **Broken model output:**
    - unknown entity tags read as terms;
    - BC/AD become BCE/CE;
    - the year parser takes the passage's era;
    - fallback review questions read naturally ("What did the Second Punic War lead to?").
  - **Phone as an equal:**
    - the cause map reads as a list of steps on phones, inline and in the Map view;
    - the Map view's quiz button no longer overflows;
    - tap targets are 44 px.
  - **Speaking to UPSC students:**
    - lens-based lesson rules;
    - the waiting line says what is happening and for how long, instead of rotating "Mapping causes…" verbs;
    - block names in plain words ("Cause map", "Aside", "part" for block).
  - **One time system:**
    - the route line is the one drawing of a line: syllabus, lesson parts, review cards, the slideshow ruler, Progress;
    - the 24-event tree is retired.

---

## 3. Not started

### Product
- [ ] **Exam prep and explore** (`docs/MODES_PLAN.md`): the goal switch, the five-part exam lesson, fact and term cards, Prelims-style practice items, and an exam-only review filter.
- [ ] **"Check my answer":** grading a typed review answer.
- [ ] **Lesson warm-up question.**
- [ ] **Fact checks:** dates checked against Wikidata.
- [ ] **More sources:** OpenStax ingest (Vol. 2 is CC BY; Vol. 1's licence is unconfirmed).
- [ ] **Later in the plan:** Mains answer practice, Hindi, state PSC syllabi.

### Design
- [x] **Onboarding (critique P2):**
  - [x] guests start without the sign-in card (28 Oct);
  - [x] the question asked on the homepage sends itself, exactly once (28 Oct; end-to-end step 9);
  - [x] **the wait** (28 Oct): the lesson shows its era's plate, when it was started from a station that has one, plus up to two of today's review cards to recall and rate. To check it with the mock, set `MOCK_FIRST_DELAY_MS`.
  - [x] **the daily quota** (28 Oct): "18 of 20 questions left today", under the question box and in the lesson composer. It turns red near the end, and guests are told signing in raises it. Served by `/api/turn/quota`.
- [x] **Final design review** (28 Oct), by an independent reviewer over captures of every screen.
  - **First verdict:** fix, with 8 material fixes. **After one fix round:** 5 resolved and 3 partial, plus 3 small regressions, which were then fixed.
  - **Left open:**
    - ~~the lesson line's route drawing~~ decided 29 Oct: keep the route (section 4);
    - the settled and overdue states on Progress are unit-tested but not yet seen on screen (they need cards that have aged).
  - Captures: `.impeccable/review/`.
- [x] **`DESIGN.md`** (28 Oct): written from the built code, with `.impeccable/design.json`. The leftovers it flagged were fixed 29 Oct:
  - the thick coloured left stripes are gone: asides are tinted panels (a live debate adds a dashed outline), note cards are frame-grey panels, and a changed part keeps only its "updated" tag (with Undo), not a stripe;
  - the "Read as text" dialog and the sign-in card use the theme's surface and float shadow, so they follow dark mode; the sign-in button's text is the page colour, so it stays readable on the lighter dark-mode maroon;
  - the stale comments in `globals.css` and `layout.tsx` are corrected;
  - the "To remember" bullets are no longer yellow (yellow is kept for the station board).
- [x] **Animation pass** (28 Oct). Found with `find-animation-opportunities`, built with `animate`:
  - popovers grow from their button;
  - the history and notes panels slide from the right edge, and the jump sheet rises from the bottom;
  - the phone conversation and a station's details ease in where they open;
  - the theme switch crossfades;
  - the end of a daily review fills its stations;
  - the ⌘K palette no longer animates (keyboard, used constantly);
  - reduced motion keeps quick fades without movement.
  - **Still to run yourself:** `/review-animations`. It is a skill only you can start.
- [x] **Small fixes from the critique** (28 Oct):
  - `/stats` rebuilt as Progress, with designed first-visit, loading and error states (and a retry);
  - ochre contrast now 5.4:1;
  - the level chip;
  - 44 px targets;
  - fonts load once;
  - Caveat gone;
  - no text under 12 px;
  - no uppercase "kicker" labels;
  - no monospace outside keys and code.
- [ ] **Terms and Privacy pages** (`TODO(legal)`).

### Shipping
- [x] Commit the work, in logical chunks (27 to 30 Oct; not pushed, as there is no remote yet).
- [x] Test on a real phone (homepage, lesson, review). Passed on the owner's phone, 27 Oct.
  - **Done 27 Oct:** the phone-feel fixes are in, and checked on a phone profile. All 9 end-to-end steps pass with them.
    - 16 px text fields, so iOS no longer zooms in;
    - no tap flash, and press feedback on every control;
    - hover only applies with a mouse;
    - `dvh`/`svh` heights instead of `100vh`;
    - no page rubber-banding inside the app;
    - `viewport-fit=cover` with safe areas;
    - status-bar colours for light and dark;
    - 44 px tap targets.
  - **Real hardware:** checked on the LAN build (`http://<this Mac's IP>:3100`); everything worked.
- [ ] Deploy (Vercel + Neon in the plan): set `DATABASE_URL` and `BETTER_AUTH_URL`, and run the ingest against it.
- [ ] Five testers for a week, then the first retention-by-interval table from `review_logs`.

---

## 4. Decisions waiting on you

1. **Pushing:** `chronicle-v0.1` is committed locally but not pushed or merged into `main`. The repository has no remote yet, so pushing first needs a GitHub repository added as `origin`.
2. **Exam prep and explore:** the open questions in `docs/MODES_PLAN.md` §11. The big ones:
   - one exam mode, or Prelims and Mains separately;
   - whether the goal replaces the level picker;
   - what exam prep does when sources are thin.
3. ~~**Handoff**~~ Decided 28 Oct: guests go straight in and the question sends itself.
4. ~~**The timeline events**~~ Decided 28 Oct: retired, with their questions moved into matching stations.
5. ~~**The lesson line**~~ Decided 29 Oct: keep the route for a lesson's parts (recorded in the app contract and `DESIGN.md`).
6. **Plates:**
   - finish the Nano Banana deep-time set (2 more images);
   - make new plates for Indian eras, or keep the current set.
7. **Name and tagline:** `PRODUCT.md` says both are open.
8. **UPSC past papers:** check whether they may be reproduced before any "previous year question" feature.
9. **Deploy target and when to invite testers.**

---

## 5. Suggested order from here

1. ~~**Commit** what exists, so the work is safe.~~ Done 27 Oct.
2. ~~**Real phone pass** on the LAN build, and fix what shows up.~~ Done 27 Oct.
3. ~~**Close the redesign:** onboarding, the final design review, `DESIGN.md`, the animation pass.~~ Done 28 Oct (see section 6); the lesson-line decision was made 29 Oct. Still yours: `/review-animations`.
4. **Sources for the rest of the syllabus.** The Marathas are done (28 Oct). Next: the Delhi Sultanate, Vijayanagara, 1857 and the national movement. Re-run the eval after each unit.
5. **Exam prep, first version** per `docs/MODES_PLAN.md` §10, after the decisions in point 2 of section 4.
6. **Deploy and invite five testers.**

---

## 6. The 28 Oct checklist pass

**What changed:**
- **Small fixes:** text size, labels and fonts; Progress and the review card redesigned on the route line.
- **Lesson content:** natural card questions; an honest waiting line; plain block names; the cause map as steps on phones.
- **Lesson rules:** led by the lens that fits the question.
- **Onboarding:** the wait and the quota.
- **Motion:** the animation pass.
- **Review and records:** the final design review with one fix round; Maratha sources; the full eval.

**Unchanged:** the lesson contracts (`lib/contracts`). The review stats now also count overdue cards per lesson.

**Verified:** 242 tests, types, lint, the production build, all 9 end-to-end steps, and captures in `.impeccable/review/`.

**Not verified:**
- the settled and overdue station states on screen;
- motion feel on a real phone;
- `/review-animations`.
