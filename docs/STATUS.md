# Chronicle: where things stand

Audit of 27 Oct 2026. Sources: the git history, the docs (`README.md`, `PRODUCT.md`, `docs/*`), the design critique in `.impeccable/`, the session transcripts, and fresh checks run that day. Update this file when an item moves; it replaces re-asking "what's done?".

**Health on 27 Oct:**
- **Passing:** typecheck, lint, 247 tests (30 files) and `next build`.
- **Pages:** `/`, `/start`, `/study`, `/review` and `/stats` all load.
- **Not run that day:** the end-to-end script, because Docker (and so the database) was stopped. The restyle session last reported it passing after the homepage slideshow fix.
- **Not tested at all:** a real phone. Every motion and layout check so far ran in headless Chrome.

**Committed (27 Oct):** the work is now in four commits on `chronicle-v0.1`: prototype, redesign, homepage, docs. Nothing is pushed yet. Some things stay local only and are ignored by git, because they're large:
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
  - Have: 43 Wikipedia articles, mostly world history; about 10 cover India (Mauryas, Mughals).
  - Missing: the Marathas, the Delhi Sultanate, Vijayanagara, Bhakti and Sufi, Plassey and Buxar, 1857, the national movement and Partition. Until these exist, most UPSC lessons are uncited, and free models get dates wrong.
- [ ] **Syllabus data.**
  - Have: `content/syllabus.ts` holds the stations and their starter questions.
  - Missing: stations split into short series ("The Marathas, in four parts"), and progress per part.
- [ ] **Evals.**
  - Have: only a 3-turn run on the current prompt.
  - Missing: the full 16-turn eval on the latest prompt, after a quota reset.
- [ ] **Director rules.** They still lead with causes ("causes and consequences, not lists of facts"); the critique's P1 says they should match the many-lenses product.

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
- [ ] **Critique P1 issues**, each partly addressed:
  - **Broken model output:** the date and tag fixes landed with tests. Not re-checked against the critique's list: raw `[[X|entity]]`, BC vs BCE, template card fronts.
  - **Phone as an equal:** the tabs and the front door to review are done. Not re-checked: the canvas on a phone, the inline map clipping, tap targets under 44 px.
  - **Speaking to UPSC students:** `PRODUCT.md` and `/start` are done; the Director rules and the status wording still lead with cause and effect.
  - **One time system:** the route line is now everywhere. The 35 slideshow moments and the 24 timeline events still disagree.

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
- [ ] **Onboarding (critique P2):**
  - [x] guests start without the sign-in card (28 Oct);
  - [x] the question asked on the homepage sends itself, exactly once (28 Oct; end-to-end step 9);
  - [ ] fill the 8–30 s wait with the era plate and due cards;
  - [ ] show the daily quota.
- [ ] **Finishing the redesign:** a final independent design review, then `DESIGN.md` with the design rules.
- [ ] **Animation pass beyond the slideshow:** find what should move (`find-animation-opportunities`), build it (`animate`), then review it (`review-animations`).
- [ ] **Small fixes from the critique:**
  - a designed empty state on `/stats`;
  - the ochre date text is 3.4:1 contrast;
  - the selected level chip;
  - small tap targets;
  - fonts loaded twice;
  - unused Caveat.
- [ ] **Terms and Privacy pages** (`TODO(legal)`).

### Shipping
- [x] Commit the work, in logical chunks (27 Oct; not pushed).
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

1. **Pushing:** `chronicle-v0.1` is committed locally but not pushed or merged into `main`.
2. **Exam prep and explore:** the open questions in `docs/MODES_PLAN.md` §11. The big ones:
   - one exam mode, or Prelims and Mains separately;
   - whether the goal replaces the level picker;
   - what exam prep does when sources are thin.
3. ~~**Handoff**~~ Decided 28 Oct: guests go straight in and the question sends itself.
4. ~~**The timeline events**~~ Decided 28 Oct: retired, with their questions moved into matching stations.
5. **Plates:**
   - finish the Nano Banana deep-time set (2 more images);
   - make new plates for Indian eras, or keep the current set.
6. **Name and tagline:** `PRODUCT.md` says both are open.
7. **UPSC past papers:** check whether they may be reproduced before any "previous year question" feature.
8. **Deploy target and when to invite testers.**

---

## 5. Suggested order from here

1. ~~**Commit** what exists, so the work is safe.~~ Done 27 Oct.
2. ~~**Real phone pass** on the LAN build, and fix what shows up.~~ Done 27 Oct.
3. **Close the redesign:**
   - ~~onboarding decisions, the dead tree code, `docs/LANDING.md`~~ done 28 Oct;
   - **next:** the final design review and `DESIGN.md`, then the rest of onboarding (the wait, the quota).
4. **Sources for one syllabus unit** (the Marathas), then the full eval, to measure lesson quality on the free chain.
5. **Exam prep, first version** per `docs/MODES_PLAN.md` §10, after the decisions in point 2 of section 4.
6. **Deploy and invite five testers.**
