# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Students preparing for the UPSC civil services exam and state PSC exams. They study on a phone and on a laptop equally: neither may feel like the lesser version. They need to cover a large, fixed history syllabus (ancient, medieval and modern India, plus world history), understand it well enough to answer questions on it, and still remember it on exam day.

## Product Purpose

A history study companion. A student asks about a topic, period, person or question; the product builds a lesson for exactly that, and then keeps the key ideas alive with a short daily review until the exam. Success means the student understands a topic in one sitting and still recalls it weeks later.

## Positioning

History through many lenses: the same topic can be seen as a story, on a timeline, through the people involved, through places, and through cause and effect. Cause and effect is one of the product's ideas (understanding why things happened), not the whole product. Each lesson is made for the student's own question, its claims are marked established, likely or contested and cited to their sources, and its key ideas go straight into a spaced review.

## Operating Context

- Self-study for UPSC and state PSC, alongside the standard books and coaching material students already use.
- Short sessions (daily review, a quick question) and long ones (working through a period), on both phone and laptop.
- An account carries lessons, notes and review across devices; a guest can start without signing up.

## Capabilities and Constraints

Built today (see docs/PROTOTYPE_PLAN.md, "Build record"):
- Lessons made by an LLM "Director" as blocks: article, cause map, timeline, lineage (who succeeded whom), prediction question, quiz, callout. Reader, canvas, timeline and focus views; notes; fullscreen reading.
- Retrieval over a source corpus with numbered citations; confidence marks on claims.
- Memory cards from every lesson, scheduled with FSRS; a daily review, progress and streak.
- Guest accounts, email sign-in, sync across devices; installable on a phone.
- Free LLM tiers: lessons take about 8 to 30 seconds to start streaming, and the free quota is roughly 30 to 40 lessons a day in total. Waiting states matter.

Constraints and gaps:
- The current source corpus is 43 Wikipedia articles, mostly world history; it does not yet cover the UPSC syllabus (for example the Harappan and Vedic periods, the Delhi Sultanate, the freedom struggle, art and culture).
- NCERT textbooks and coaching material are copyrighted and must not be ingested without permission.
- Undecided: the product's name (open to a new one); languages beyond English (for example Hindi); which state PSCs to cover first; whether to add answer-writing practice for the mains exam; how lessons map to the official syllabus.

## Brand Commitments

These pieces stay as parts of the product; their look is open to change:
- the history slideshow (35 image plates, from the Big Bang to now, in public/opening);
- the timeline (eras and starting points on the homepage, and the timeline view in lessons);
- the daily review and memory cards;
- cause maps, as one lens among several.

The current name "Chronicle" and the tagline "Nothing happened by accident" are not binding: the name is open, and the tagline framed the product as cause and effect only.

Look and feel (chosen 2026-10-22): a calm, familiar study app in the manner of Notion (plain pages, a sidebar, standard controls) so study material stays easy to read and work with, plus one signature of its own: time drawn as a single route line with stations, the same line on every screen, the current era marked by a yellow station board. Familiar first, creative in that one place.

## Evidence on Hand

- 35 history plates with colour and monochrome grades (public/opening, content/landing/opening-plates.json).
- A hand-written timeline of 24 events with blurbs and example questions (content/landing/timeline.ts).
- Three complete sample lessons (lib/fixtures): the Second Punic War, the fall of Rome, the Mughal succession.
- A 43-article Wikipedia corpus, CC BY-SA, with attribution (content/corpus/wikipedia.txt).
- No users, testimonials, exam results or press yet. Nothing of the kind may be invented.

## Product Principles

1. Understand, then remember: every lesson ends with what to remember, and the daily review is the habit the product builds.
2. Many lenses, one subject: pick the lens that fits the question (story, timeline, people, places, cause and effect); none of them is the whole product.
3. Exam-true: facts sourced and marked by confidence; coverage shaped by what UPSC and state PSC students must know.
4. Equal on phone and laptop: every core task works fully on both.
5. Respect the student's time: short daily sessions, no filler, and honest waiting when the model is slow.
