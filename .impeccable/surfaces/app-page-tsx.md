---
version: 1
slug: "app-page-tsx"
primary_target: "app/page.tsx"
related_targets: ["components/landing/Landing.tsx"]
---

## Scope

The public homepage (/). Mode: Persuade, inside the app's established world (see .impeccable/surfaces/app-start-page-tsx.md). Audience and constraints: PRODUCT.md. Light and dark themes, following the visitor's setting.

Job: a UPSC or state PSC student understands in seconds what this is for, asks a question or picks one from the syllabus, and sees the history slideshow and the syllabus line they will use inside the app.

Memorable moment: the plates playing in a large rounded box at the top of the page, with time drawn as the same route line used everywhere else.

## Direction contract

THESIS: The homepage opens on the plates, playing large in a rounded box at the top as the way into time, then hands the visitor straight to what they came to do: asking, with the five lenses that make the product different set under the question box. The syllabus line closes the page. It refuses the split hero with a picture beside the copy and the centred headline over a row of feature cards. (Order pinned by the user, 24 Oct 2026: slideshow on top, question section beneath.)

OWN-WORLD: The app's world: white pages (near-black in dark), near-black ink, railway maroon for actions, station-board yellow only for dates and "you are here", the 3px route line with stations. Atkinson Hyperlegible Next for text and headlines, narrow heavy Archivo only on boards and the wordmark. No Fraunces, no mono labels, no arched window, no bordered card rows.

STORY: The student reads one line on what it is for, asks or taps a syllabus question, watches the 35 moments play, and finds their part of the syllabus on the line they will meet again inside the app.

FIRST VIEWPORT: Header with the wordmark, The syllabus, Read as text, a theme switch, Sign in, and Start learning. Directly under it the slideshow in a rounded box (16:7 on wide screens, 4:5 on tall ones) with the date on a board in its top-left corner, the pause button opposite, and the ruler drawn as the route line along its bottom; at key moments the moment's cause is set inside the box above the ruler (it used to sit under the box, which left a gap on phones while hidden); under the box, on phones only, Read all 35 moments as text (the header carries it on wider screens). The box gives up height before the question box gives up the laptop fold. Then, still in the first screen on a laptop, a left-aligned headline at about 52px and one line of explanation, with the full-width question box, its five lens chips and the Ask button, and three syllabus questions on small yellow boards just below. Signature interaction: choosing a lens shapes the question; the slideshow's needle travels the route line.

FORM: The dealt structure "Question first" (candidate 7 of 7), chosen by the user in a surface round inside the established world. seed:da92b5f8e43fc9f2

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Unresolved

- The question still arrives unsent in /study, and a signed-out visitor meets the sign-in card first (the critique's onboarding items).
- The 24-event tree (content/landing/timeline.ts) leaves the homepage; whether its events join the line or retire is open.
