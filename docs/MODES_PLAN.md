# Exam prep and explore: design plan

Status: proposed 22 October 2026; the first version was built on 31 October 2026 (section 12). The owner's decisions are marked in section 11.
Product truth lives in `PRODUCT.md`; the prototype it builds on is described in `docs/PROTOTYPE_PLAN.md`.

## 1. Why

`PRODUCT.md` says who the product is for (UPSC and state PSC students) and what it promises: understand a topic in one sitting, still recall it on exam day, with facts that are sourced and honest about confidence. Today every lesson has one shape, and that shape is tuned for understanding: the writing rules ask for "causes and consequences, not lists of facts". That serves a curious reader and the Mains paper. It underserves Prelims, which tests exactly the facts the rules play down: dates, names, places, terms, treaties and battles.

The proposal: let the student say why they are here, exam prep or explore, and shape the lesson and its review around that.

## 2. What happens today: the Marathas as a worked example

1. **Start.** On the home page (`/start`) the student opens *Medieval India* and picks the station **The Marathas** (1674–1818, `content/syllabus.ts`). There are three ways in:
   - three starter questions ("How did Shivaji organise his state?", "What were chauth and sardeshmukhi?", "Why did the Marathas lose at Panipat in 1761?");
   - five lens buttons (Story, Timeline, People, Places, Cause and effect);
   - the question box, with a level choice: *New to this*, *Some background* or *Revising*.
2. **The wait.** On the free models the first part arrives after 8 to 30 seconds.
3. **The lesson.** The rules (`lib/prompts/director/rules.ts`) say: for "I want to learn X", add an article, then a cause map, then a timeline if order matters, then a prediction question. Never more than 4 blocks.
4. **Sources.** Our 43 source articles (`content/corpus/wikipedia.txt`) include the Mughal Empire and Aurangzeb, but nothing on the Marathas, the Delhi Sultanate, Company rule, 1857 or the national movement. When passages do not cover a claim, the grounding rules (`lib/prompts/director/grounding.ts`) let the model use general knowledge, tagged *likely* or *contested* and uncited. A Maratha lesson is therefore mostly unsourced.
5. **The end.** "To remember" lists 3 to 6 ideas (`lib/prompts/director/pedagogy.ts`), each a reasoning question of one of five kinds: why, consequence, sequence, anchor (when) or significance. They go into review.
6. **The days after.** The daily review (`/review`) brings each card back on an FSRS schedule:
   - the student recalls the answer, reveals it and rates themselves;
   - quiz items (multiple choice, put in order, match) are marked automatically;
   - at most 10 new cards a day (`REVIEW_NEW_PER_DAY`).

**What a UPSC student does not get today:**
- a list of the facts Prelims asks for;
- any sense of how the topic is examined;
- enough room: four blocks cannot cover 144 years, so "the Marathas" needs a short series;
- sources for most of the facts;
- any measure of how much of the topic they have covered.

## 3. The proposal in one paragraph

Each lesson has a **goal**: *Exam prep* or *Explore*.
- **Goal is not level.** Goal is why the student is here; level is how much they already know.
- **Exam prep** gives a predictable lesson: the facts, the explanation, the timeline, how it is asked, and more review cards, held to a stricter standard of sourcing.
- **Explore** is today's lesson, led by the story and free to follow tangents.
- **Defaults:**
  - starting from the syllabus line → exam prep;
  - a free question typed in the box → explore;
  - either can be switched before or during a lesson.

## 4. Explore

| | |
|---|---|
| **Who and when** | Curiosity, a first look at a period, a question that came up in reading. |
| **Lesson shape** | As today: an article led by the story, a cause map when causes matter, a timeline when order matters, a prediction question at a real turning point. |
| **Follow-ups** | Go deeper, what was happening elsewhere at the same time, what if, related people and places. |
| **Review** | A few cards for the big ideas only (see open question 7). |
| **Sourcing** | As today: confidence marks on every claim, and citations where sources exist. |

## 5. Exam prep

### 5.1 Lesson shape

The same five parts every time, so a student learns where to look:

1. **Key facts (Prelims).** Dates, people, places, terms, treaties and battles, in a compact list.

   *Example for the Marathas* (illustrative; a real lesson must source every line): the Ashtapradhan, chauth and sardeshmukhi, the Treaty of Purandar (1665), the Third Battle of Panipat (1761), the Treaty of Salbai (1782), the Treaty of Bassein (1802), and the end of the Peshwa's rule in 1818.
2. **The explanation (Mains).** Causes and consequences in a short article, with a cause map where it helps.
3. **Timeline.** The dated facts in order. This is also the source of an automatic "put in order" card.
4. **How it is asked.** Practice items in the exam's own forms, each labelled *Practice question, not from a past paper*:
   - **Prelims:** statement questions, match-the-following, put-in-order. These use the existing quiz items (`lib/contracts/blocks.ts`: `McqItem`, `MatchItem`, `ChronologyItem`), which review already marks automatically. Example:
     > Consider the following statements about the Marathas:
     > 1. Chauth was a levy of one-fourth of the revenue.
     > 2. The Third Battle of Panipat was fought in 1761.
     >
     > Which of the statements given above is/are correct?
   - **Mains:** one or two prompts in the Mains style, for example "Assess the role of the Marathas in the decline of the Mughal empire (150 words)". No marking at first (see section 8).
5. **To remember.** 4 to 8 cards: the reasoning cards of today plus fact and term cards (section 5.3).

**First version, without new block types:**
- key facts become a short article section plus the timeline;
- terms become a callout;
- practice items become a quiz block.

A dedicated "fact sheet" block would read better, but it is a contract change, so it waits until the shape is proven in evals.

### 5.2 Station series

Big stations become short series of lessons, each one sitting:

| The Marathas, in four parts | |
|---|---|
| 1 | Shivaji and the Maratha state (1630–1680) |
| 2 | The Peshwas and expansion (1713–1761) |
| 3 | The Third Battle of Panipat (1761) |
| 4 | The Anglo-Maratha wars and the end of Maratha power (1775–1818) |

The parts live in the syllabus data. The syllabus line shows progress by part instead of only "started", which also fixes the gap that a lesson is known to belong to a station only when it was started from one.

### 5.3 Review in exam prep

- **New card kinds.** *Fact* and *term*, for example "When was the Treaty of Salbai signed?" or "What was sardeshmukhi?". This is a contract change: `CardKind` in `lib/contracts/ops.ts` lists the kinds.
- **Prelims-style items.** Practice items become cards that are marked automatically, as quiz items already do.
- **More new cards a day.** Exam prep may need more than the current 10 (open question 8).
- **One queue.** Exam and explore cards share the queue. Each card knows its goal, so the student can review exam cards only before a test.

### 5.4 The accuracy bar

This is the part that makes or breaks exam prep.
- **Every fact needs a source.** Each item in the key facts and each fact card must be backed by a retrieved passage and carry its citation.
- **Unsourced facts are marked.** A fact the sources do not cover is shown with a visible "check this" mark and never becomes a review card.
- **Thin sources are said up front.** When the sources do not cover a topic well enough, the lesson says so at the top and offers to continue as explore (open question 3).

Today the grounding rules allow uncited general knowledge, tagged likely or contested. For exam prep that permission ends at the facts list.

## 6. Where the goal lives in the product

- **Home (`/start`):**
  - a two-option switch, *Exam prep* / *Explore*, beside **Start lesson**, preset by where the student starts;
  - the starter questions and lenses of a station start in exam prep.
- **Lesson (`/study`):**
  - the goal shows next to the date board under the title;
  - a follow-up turns an explore lesson into exam notes by adding the missing parts, rather than starting again.
- **Review (`/review`):** a filter for exam cards only.
- **Level:** today's level picker sits in the same row as the goal (open question 2).

## 7. What would change, layer by layer

Nothing below is built yet. Additive changes first, so old lessons keep working.

| Layer | Change |
|---|---|
| Contracts (`lib/contracts`) | `TurnRequest` gains an optional `goal: "exam" \| "explore"`. `CardKind` gains `fact` and `term`. A `facts` block, later. |
| Prompt (`lib/prompts/director`) | A new GOALS module beside LEVELS. Rule 1 in RULES splits by goal. PEDAGOGY keeps "causes, not lists" for explore and the explanation part, and asks for a sourced facts list in exam prep. GROUNDING tightens for facts in exam prep. The prompt version changes, so evals rerun. |
| Turn context (`lib/director/context.ts`) | Sends `learner_goal` next to `learner_level`. |
| Lesson store (`lib/store/workspace.ts`) | Each lesson keeps its goal, like its level, and saves it with the lesson. |
| Syllabus (`content/syllabus.ts`) | Parts per station; exam-style starter questions. |
| Sources (`content/corpus`, `scripts/ingest.ts`) | More sources, unit by unit (section 9). |
| Review (`lib/review`) | The new card kinds, the goal on each card, the new-cards limit per goal. |
| Evals (`scripts/eval.ts`, `docs/evals`) | Exam-prep cases that check every listed fact against its cited passage. |
| Interface | The goal switch, the goal next to the date board, the "check this" mark, practice-question labels, the review filter. |

## 8. What we can and cannot do

| | |
|---|---|
| **Can do with what is built** | A goal input to the lesson writer (the prompt is already in modules). Prelims-style practice items (quiz items exist and are marked automatically). Station series (content work). Fact cards (a small contract change). More sources from Wikipedia (freely licensed, and the ingest pipeline exists). |
| **Needs care** | Fact cards and the goal field touch shared contracts and tests. Exam lessons are longer, so they are slower and use more of the free model allowance (about 30 to 40 lessons a day in total today); a four-part station series is four lessons. |
| **Cannot, or not yet** | Invent past-paper questions: never. Reproduce real UPSC papers: they are published on the UPSC website, but whether we may reuse them needs checking first. Ingest NCERT or coaching material without permission. Promise correct facts where our sources are thin: free models get dates and names wrong. Mark Mains answers reliably on the free models. |

## 9. Sources come first

Exam prep is only as good as the sources behind its facts. Today 10 of the 43 articles are Indian history: the Mauryas and the Mughals. Before exam prep ships, the sources should cover the syllabus unit by unit, starting with the units students ask about most.

Wikipedia titles to check and ingest for the Marathas, as the pattern for every unit:
- Maratha Empire, Shivaji, Ashta Pradhan;
- Peshwa, Baji Rao I;
- Chauth, Sardeshmukhi;
- Treaty of Purandar (1665);
- Third Battle of Panipat;
- Anglo-Maratha wars, Treaty of Salbai, Treaty of Bassein (1802).

Then the same for the other medieval and modern units:
- the Delhi Sultanate;
- Vijayanagara and the Bahmanis;
- the Bhakti and Sufi movements;
- Plassey and Buxar;
- the Revolt of 1857;
- the Congress and its early decades;
- the Partition of Bengal;
- the Gandhian movements;
- Partition.

Each unit is measured by the share of its key facts that a retrieval finds a passage for. Embedding uses the Cloudflare allowance (about 10,000 neurons a day, shared with lessons), so ingest goes in batches.

## 10. Order of work

1. **Sources.** Medieval and modern India first, with the coverage measure above.
2. **Goal and exam shape.** The goal input and the five-part exam lesson, built from existing blocks, with evals that check facts against passages.
3. **Review.** Fact and term cards, the goal on each card, the new-cards limit, the exam-only filter.
4. **Station series and coverage.** Parts in the syllabus data, progress by part on the syllabus line.
5. **Later.** Mains answer practice with feedback, Hindi, state PSC syllabi.

## 11. Open questions

1. ~~**One exam mode, or Prelims and Mains separately?**~~ **Decided 31 Oct: one exam mode**, covering both in the same lesson. One mode covers both in a single lesson. Two modes make each lesson shorter and sharper but ask the student to choose more often.
2. ~~**Goal and level: replace, sit beside, or infer?**~~ **Decided 31 Oct: the goal replaces the level picker**, and the level is inferred: a first lesson from a station is for someone new to it, a later one is revision, a free question gets the middle level. Two pickers before every lesson is one too many. Options:
   - goal replaces level;
   - goal sits beside level;
   - level is inferred from review history.
3. ~~**When sources do not cover a topic, what does exam prep do?**~~ **Decided 31 Oct: show the facts, marked "check this"**; they never become review cards, and the lesson says at the top when its sources are thin. Options:
   - show the facts with "check this" marks;
   - hold the facts list back and teach the explanation only;
   - offer explore instead.
4. **Past papers.** May we reproduce the question papers UPSC publishes? Until that is checked: practice questions only, always labelled.
5. **Which state PSCs first?** State history matters there, for example the Marathas for Maharashtra.
6. **Hindi.** Lessons, cards, or both, and when?
7. **Explore and review.** Should explore lessons make review cards automatically, only for the big ideas, or only when the student asks?
8. **New cards a day.** Is 10 right for exam prep, or should the student set it?
9. **Switching mid-lesson.** Should an explore lesson be convertible into exam notes, and the other way round?
10. ~~**What counts as covered?**~~ **Decided 31 Oct: a part read** (its lesson read to the end); settled cards show as a stronger state on Progress. A part read, a part read with its cards settled, or its practice questions passed?

## 12. What was built (31 Oct 2026)

- **Goal.** `Goal` (`exam` | `explore`) in the turn contract, the lesson store and each saved lesson. On `/start` a two-option switch replaces the level picker; it is remembered on the device and starts on Exam prep. Homepage questions explore. In a lesson the goal shows under the title, and an explore lesson has **Make exam notes** (also in ⌘K).
- **The exam lesson.** A GOAL prompt module: an article headed "Key facts", then the explanation and "How it is asked" (a Mains prompt); a timeline; a "Terms" aside (a new callout kind); "Practice questions" (a quiz, labelled not from a past paper). At most five parts.
- **Accuracy bar.** Key facts without a citation are marked **Check this**. Fact and term cards without a source are dropped. An exam lesson with fewer than three passages says its sources are thin.
- **Review.** Card kinds `fact` and `term`; each card stores its goal (migration `0005_card_goal`). `/review` has **All cards / Exam cards only** (`/review?goal=exam`). **Check my answer** judges a typed answer in one sentence, only when asked (`/api/review/check`; a word match stands in under the mock model).
- **Station series.** `content/series.ts`: two to four parts for each of the 26 stations. The app home lists a station's parts with Read and Started; a part already begun opens its lesson. A part is read once its lesson's reading parts have been read. Progress shows parts read per station.
- **Warm-up.** Reopening a lesson with a card due from it asks that card first.
- **Sources.** Every station now has some: 192 more Wikipedia articles, 97 for medieval and modern India and 95 for ancient India and world history (8,531 passages in all).
- **Not yet:** new cards a day per goal (question 8, still 10 in all), state PSCs, Hindi, Mains answer marking, real past papers (question 4).

