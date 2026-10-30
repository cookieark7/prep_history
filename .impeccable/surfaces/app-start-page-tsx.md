---
version: 1
slug: "app-start-page-tsx"
primary_target: "app/start/page.tsx"
related_targets: ["app/study/page.tsx","app/review/page.tsx","app/stats/page.tsx"]
---

## Scope

The app home (/start), and through it the app's visual world: /study, /review and /stats follow inside the same world. Mode: Operate. Audience, job and constraints: see PRODUCT.md (UPSC and state PSC students, phone and laptop equally).

Job on this surface: see where you are in the syllabus, do today's review, ask about anything, and get back to recent lessons.

Memorable moment: the syllabus drawn as one line you are travelling, with your current era on a yellow station board.

## Direction contract

THESIS: A calm, familiar study workspace whose one ornament is the route line: stations on a line, drawn the same way on every screen, the station you are at on a yellow board. It draws time on the syllabus and the slideshow, and the way through a lesson's parts (owner's decision, 29 Oct 2026, in their words: "Keep the route"). It refuses the "calm AI notebook" (tinted ground, soft serif display, mono kickers, identical bordered cards) and the parchment-history costume.

OWN-WORLD: White pages on a light neutral frame, near-black ink, neutral greys. Station-board yellow only for "you are here" and things due; signal green and red only where they mean something (settled or overdue, established or contested). Body and UI in Atkinson Hyperlegible Next; era names and boards in a narrow, heavy grotesk (Archivo); tabular figures for every date. Standard controls: sidebar, tabs, buttons, inputs, ruled tables. No card grids, gradients or mono labels. The route: a 3px ink line; open stations not yet studied, filled ones studied, the current one yellow with its board. Every line in the product is this line: the syllabus, a lesson's parts (a route through the lesson, labelled by part, not a time axis), the day's review cards, and the slideshow's ruler. Yellow means "you are here" or "due" and nothing else.

STORY: The student sees the syllabus as a line they are travelling and where they are on it, sees what is due today, and can ask about anything. Each lesson ends with what to remember, and they come back daily for review.

FIRST VIEWPORT: Desktop: a light sidebar (Learn, Review with its due count, Progress, recent lessons, account). The white page holds the title and a full-width ask box, then the GS Paper I route across the page with Ancient, Medieval, Modern and World tabs and the current station on its yellow board beside its plate. Below that sit the station's starter questions and lenses on the left and the daily review on the right, with Start review as the primary action, then recent lessons in a ruled table. Phone: top bar, bottom tabs, ask box first, the route as a vertical station list. Signature interaction: choosing a station moves the board along the line to it and swaps its questions.

FORM: The category standard (a Notion-like study app), chosen by the user, fused with the Station Board signature (candidate 5 of 7, the roll's assignment): the route line and station boards. seed:f09dc3db8c1d869b

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Unresolved

- The product name (Chronicle for now).
- Plates exist for only a few Indian eras; stations without one show none until new plates are made.
