# Chronicle: where things stand

Audit of 27 Oct 2026, updated 28 Oct after the checklist pass (section 6), 30 Oct after the leftover fixes and commits, and 31 Oct after exam prep (section 1). Sources: the git history, the docs (`README.md`, `PRODUCT.md`, `docs/*`), the design critique in `.impeccable/`, the session transcripts, and fresh checks run that day. Update this file when an item moves; it replaces re-asking "what's done?".

**Health on 31 Oct:**
- **Passing:** typecheck, lint, 262 tests (32 files), `next build`, and all 15 end-to-end steps (exam prep, series, review filter, Check my answer and the warm-up are steps 8 to 13).
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
- [x] **Handoff to `/study`** (28 Oct): a question asked on the homepage goes straight to its lesson, as a guest, and sends itself once.
- [x] Light and dark.
- [x] **Leftovers from earlier homepage versions** (28 Oct): the vertical tree is retired.
  - Removed: its code, styles, layout, tests and the 20-event file, plus the old landing question box, the event icons and the prompt-kind data.
  - Questions moved: 16 example questions went into the 8 syllabus stations that cover those events (`content/syllabus.ts`, now tested).
- [x] **Stale wording** (28 Oct): `docs/LANDING.md` opens with "The homepage today" and marks the rest as history; the `LoginCard.tsx` comment is corrected.

### Lesson writing for UPSC (28 Oct)
- [x] **Director rules** (28 Oct, `lib/prompts/director/{role,rules,pedagogy,grounding}.ts`):
  - the lens follows the question (story, timeline, people, places, cause and effect);
  - exam facts (dates, people, places, terms) are stated precisely rather than played down;
  - an article always has a brief and a standard section;
  - who-ruled questions always get a lineage block;
  - each article section cites a source when the passages cover it.
- [x] **Maratha sources:** 14 articles, 216 passages.
- [x] **Full eval run** with 4 new UPSC cases (`docs/evals/2026-10-28-*`). Its results and what still fails are under "Lesson quality" in section 2.

### Exam prep, series and review (31 Oct, not committed)
Built to the owner's answers of 31 Oct (`docs/MODES_PLAN.md` §11 and §12):
- [x] **Goal switch:** Exam prep or Explore on `/start`, in place of the level picker; the level is worked out from where the lesson starts. Homepage questions explore; an explore lesson has **Make exam notes**.
- [x] **The exam lesson:** Key facts, the explanation, "How it is asked", a timeline, a Terms aside and practice questions (labelled not from a past paper). Key facts without a source are marked **Check this**, and a lesson with few sources says so at the top.
- [x] **Review:** fact and term cards (only with a source), each card's goal saved, **All cards / Exam cards only**, and **Check my answer** for a typed answer.
- [x] **Station series:** two to four parts for each of the 26 stations, with Read and Started on the app home and parts read on Progress. A part already begun opens its lesson. Still missing: a lesson asked freely is not matched to a station.
- [x] **Warm-up:** reopening a lesson with a card due asks that card first.
- [x] **Sources:** 192 articles, so every station has some: 97 for medieval and modern India, 95 for ancient India and world history (section 2).
- [x] **Fixes found on the way:**
  - the lesson's date board read citation ids as years (it showed "1660–4446");
  - two new repairs for free-model output: brackets that don't match, and an article section without its depth.

### Plans written (no code)
- [x] **Exam prep and explore modes:** `docs/MODES_PLAN.md`, with 10 open questions.
- [x] **Image pipeline:** Cloudflare FLUX scripts in `image_gen/`, plus prompts for the Nano Banana deep-time set (end of `docs/chronicle-homepage-image-sequence-pack.md`).

---

## 2. Half done

Started, with something still missing. The table is the short version; each item below says what exists, what's missing, who can move it, and the next step.

| Item | How far | Waiting on | What's left |
|---|---|---|---|
| Sources for the syllabus | all 26 stations have sources (31 Oct) | nothing: Claude can do it | small: deepen thin stations as evals show them |
| Lesson quality (evals) | 10 of 20 cases pass; exam lessons arrive in five parts, with repairs | nothing: Claude can do it | small to medium |
| Google sign-in | code done | your Google keys | small, once the keys exist |
| Email sign-in | works in development only | your Resend key and sending domain | small, once the keys exist |
| Turn log access | open in development only | your email in `ADMIN_EMAILS` | one line |
| Homepage pictures | 3 of 5 deep-time images made, none swapped in | you: 2 images in the Gemini app, and a choice on Indian eras | small, then a choice |

### Sources for the syllabus
- **Have:** 249 Wikipedia titles (`content/corpus/wikipedia.txt`; 248 articles, as one title redirects), 8,531 passages:
  - 172 on Indian history: the Mauryas (4), the Mughals (6), the Marathas (15), and on 31 Oct 97 more for the medieval and modern stations and 51 for the ancient ones;
  - 52 for world-history stations: the French Revolution and Napoleon (6) and the Industrial Revolution (2), and on 31 Oct 44 more for the American Revolution and the five later stations;
  - 25 on topics that aren't on the syllabus line (Rome and Carthage, the fall of Rome, Byzantium and the Ottomans, the Late Bronze Age, early imperial China). They serve the sample lessons and the evals.

**Coverage of the 26 stations:**

| Part | Covered | Partly | None yet |
|---|---|---|---|
| Ancient India (7) | all seven (six added 31 Oct) | | |
| Medieval India (6) | all six (31 Oct) | | |
| Modern India (6) | all six (31 Oct) | | |
| World history (7) | all seven (the American Revolution and five stations added 31 Oct) | | |

- **Why it matters:** a lesson on a station without sources has no citations, and free models get dates and names wrong more often there.
- **Cost is not the limit.** Embedding the first 43 articles used about 341 of Cloudflare's 10,000 free daily units, the 14 Maratha articles about 54, the 97 medieval and modern ones of 31 Oct about 536, and the 95 ancient and world ones about 1,050. The ingest fetches one Wikipedia article every 1.5 seconds. The work is choosing 8 to 15 articles per station and re-running the eval.
- **Who:** Claude. The database must be running (Docker).
- **Next:** deepen where lessons show gaps. The eval cases `src-*` (one per station added on 31 Oct) show which stations cite well; the Stone Age and the early medieval kingdoms have the fewest articles.

### Lesson quality (evals)
- **Have:** the full run of 28 Oct (`docs/evals/2026-10-28-*`): 10 of 20 cases pass, and 98.2% of lines are valid. Three of the four new UPSC cases pass after a rule fix; "learn the Marathas" cites 8 passages. The fourth, the people lens, fails on broken JSON (below).
- **Missing:** three kinds of failure:
  - "who succeeded Akbar" changes the Mughal timeline already on the page instead of adding a family tree. The rules allow that, so the check may be too strict;
  - when the student pastes text, the lesson cites the paste instead of the sources;
  - the free model sometimes returns broken JSON on long lines, which are then dropped. In the people-lens case ("the Marathas: the key people") both the article and the family tree were dropped this way.
- **Not settled:** on the old prompt the original 16 cases passed 12; on the new one, 9. One run on free models is noisy, so it isn't known whether the new prompt is worse.
- **Exam prep on the live model (31 Oct, `docs/evals/2026-10-31-*`):** two new cases, a Maratha part and the Khaljis. Both lessons came back in the exam shape, but each run broke one long line: practice questions with one brace too many, or an article section without its depth. Two repairs now rescue those, and the last Khaljis run, replayed, keeps all four parts. One kind of break, a stray `"},` inside the practice questions, still can't be repaired, and once the model skipped the practice questions (the prompt now says they are never skipped).
- **New sources on the live model (31 Oct, `docs/evals/2026-10-31-director-05eaff3d-cf+openrouter-sources.md`):** one case per newly sourced station. All 12 turns found passages and kept every citation (137 in all, none removed), and every article cited its sources. 3 of 12 passed every check. The rest failed on the model's output, not the sources:
  - four lost their practice questions to a stray `"},` between items, which a new repair now removes (all four lines rescued on replay);
  - explore lessons were adding practice questions, which the prompt now leaves to exam prep or a request;
  - a Stone Age timeline used the year 0, and one First World War turn timed out with the fallback rate-limited;
  - two lessons didn't name what the check looks for (the Rig Veda, 1776).
  - **Rerun of the four with broken practice questions, on the current prompt** (`docs/evals/2026-10-31-director-067c7bf8-cf+openrouter.md`): no line dropped in any of them, the Gupta exam lesson came with all its parts, and 2 of 4 passed every check; the other two only sent their article whole instead of section by section.
- **Who:** Claude.
- **Next:** run the original 16 two or three times on each prompt to settle 12 against 9; run the exam and source cases a few times on the current prompt; then decide the Akbar check and fix the citing of pasted text.

### Sign-in and admin setup
These need accounts and keys that only you can create. Until they exist, a deployed copy lets people in as guests only, and nobody can open the turn log.
- [ ] **Google sign-in.**
  - Have: the code (`lib/auth/server.ts`); it switches on when `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set.
  - Missing: the keys. "Continue with Google" is still the first button on the sign-in card, and pressing it says "Google sign-in isn't set up yet. Use your email."
  - Next (you): create an OAuth client in Google Cloud with the redirect address `<site>/api/auth/callback/google`, then set the two keys. Until then, Claude could hide the button.
- [ ] **Email sign-in.**
  - Have: the sign-in link works in development, where it's printed in the server log.
  - Missing: `RESEND_API_KEY` and `EMAIL_FROM`. On a deployed copy without them, email sign-in stops with "Email sign-in is not set up yet."
  - Next (you): a Resend account with a verified sending domain, then the two keys.
- [ ] **Turn log access.**
  - Have: `/admin/turns` shows the latest 100 lesson turns, with the prompt version, the model that served each, timings, and dropped or repaired lines. It's open in development.
  - Missing: `ADMIN_EMAILS` is empty, so on a deployed copy nobody can open it.
  - Next (you): set `ADMIN_EMAILS` to your email address (comma-separated for more than one).

### Homepage pictures
- **Have:** 35 plates on the slideshow. Act I (deep time) still uses the FLUX plates. You made three Nano Banana images (the point of light, the galaxy, the young Sun), and a zoom test showed they chain well. Only the test sheet and video are in the project (`docs/landing-screens/nano-banana-test/`), not the images themselves.
- **Missing:**
  - two more deep-time images, the molten Earth and the cloud eye. Their prompts are in `docs/chronicle-homepage-image-sequence-pack.md` (addendum of 18 Oct);
  - pictures for Indian eras. The critique counted about 6 of the 35 plates that fit them. Only 8 of the 26 stations have a plate, so the picture shown while a lesson loads appears for those 8 only.
- **Who:** you make the two images in the Gemini app (the Gemini image API is paid; the current plates came from Cloudflare's free FLUX). Claude then swaps in all five and checks the chain. Indian-era pictures need your choice first (section 4, point 6).
- **Next:** put all five images in `image_gen/out/nano/`, named by level as the addendum says.

---

## 3. Not started

### Product
- [ ] **Exam prep, later parts** (`docs/MODES_PLAN.md` §12): new cards a day per goal, Mains answer marking.
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
2. **Exam prep and explore:** the big questions were decided 31 Oct (one exam mode; the goal replaces the level; thin sources show "check this"; a part counts when read). Still open in `docs/MODES_PLAN.md` §11: whether explore lessons make cards (7), new cards a day (8), switching from exam back to explore (9), which state PSCs (5) and Hindi (6).
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
4. ~~**Sources for the rest of the syllabus.**~~ Every station has sources (31 Oct). Next: deepen the thin ones as the evals show them.
5. ~~**Exam prep, first version**~~ Built 31 Oct with station series, Check my answer and the warm-up (section 1); not committed.
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
