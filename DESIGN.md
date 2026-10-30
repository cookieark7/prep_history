---
name: Chronicle
description: A calm study app for UPSC and state PSC history, with time drawn as one route line and the current era on a yellow station board.
colors:
  bg: "#ffffff"
  frame: "#f7f7f5"
  surface: "#ffffff"
  sunk: "#efefec"
  text: "#1d1d1b"
  muted: "#5f5e5a"
  rule: "#e6e5e1"
  rule-strong: "#cfcec9"
  hover: "rgba(29, 29, 27, 0.05)"
  line: "#1d1d1b"
  accent: "#8a2b22"
  accent-ink: "#6f2019"
  accent-soft: "rgba(138, 43, 34, 0.08)"
  board: "#f2c230"
  board-ink: "#1d1d1b"
  ok: "#1f7a3a"
  brick: "#c0281e"
  ochre: "#946000"
  violet: "#6b4fbb"
  l-structural: "#2f5da8"
  l-enabling: "#4a7a2c"
  l-trigger: "#c0281e"
  l-contingency: "#7a4fb8"
  l-consequence: "#946000"
  stage: "#0e0e0d"
  bg-dark: "#191918"
  frame-dark: "#202020"
  surface-dark: "#252524"
  sunk-dark: "#2c2c2a"
  text-dark: "#ecebe8"
  muted-dark: "#a3a29d"
  rule-dark: "#31312e"
  rule-strong-dark: "#4a4945"
  hover-dark: "rgba(236, 235, 232, 0.06)"
  line-dark: "#ecebe8"
  accent-dark: "#ec8b7c"
  accent-ink-dark: "#f4a99c"
  accent-soft-dark: "rgba(236, 139, 124, 0.12)"
  board-dark: "#e8b72a"
  board-ink-dark: "#1d1d1b"
  ok-dark: "#6cc58a"
  brick-dark: "#f07a6b"
  ochre-dark: "#dcaa45"
  violet-dark: "#b39cf0"
  l-structural-dark: "#86a7d4"
  l-enabling-dark: "#a9c07f"
  l-trigger-dark: "#f07a6b"
  l-contingency-dark: "#c39ad8"
  l-consequence-dark: "#dcaa45"
typography:
  display:
    fontFamily: "Atkinson Hyperlegible Next, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(34px, 3.6vw, 50px)"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Atkinson Hyperlegible Next, Helvetica Neue, Arial, sans-serif"
    fontSize: "34px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.015em"
  title:
    fontFamily: "Atkinson Hyperlegible Next, Helvetica Neue, Arial, sans-serif"
    fontSize: "22px"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.005em"
  subtitle:
    fontFamily: "Atkinson Hyperlegible Next, Helvetica Neue, Arial, sans-serif"
    fontSize: "18px"
    fontWeight: 600
    lineHeight: 1.25
  reading:
    fontFamily: "Atkinson Hyperlegible Next, Helvetica Neue, Arial, sans-serif"
    fontSize: "19px"
    fontWeight: 400
    lineHeight: 1.7
  body:
    fontFamily: "Atkinson Hyperlegible Next, Helvetica Neue, Arial, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Atkinson Hyperlegible Next, Helvetica Neue, Arial, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.35
  button:
    fontFamily: "Atkinson Hyperlegible Next, Helvetica Neue, Arial, sans-serif"
    fontSize: "14.5px"
    fontWeight: 600
    lineHeight: 1
  date:
    fontFamily: "Atkinson Hyperlegible Next, Helvetica Neue, Arial, sans-serif"
    fontSize: "14px"
    fontWeight: 700
    lineHeight: 1.2
    fontFeature: "\"tnum\""
  board:
    fontFamily: "Archivo, Arial Narrow, sans-serif"
    fontSize: "26px"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "0.01em"
    fontVariation: "\"wdth\" 75"
  board-small:
    fontFamily: "Archivo, Arial Narrow, sans-serif"
    fontSize: "15px"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "0.01em"
    fontVariation: "\"wdth\" 75"
  mono:
    fontFamily: "Atkinson Hyperlegible Mono, ui-monospace, Menlo, monospace"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.3
rounded:
  none: "0px"
  hairline: "2px"
  chip: "3px"
  sm: "4px"
  md: "6px"
  lg: "8px"
  sheet: "10px"
  ask: "14px"
  stage: "24px"
  full: "9999px"
spacing:
  unit: "4px"
  gutter: "16px"
  gutter-wide: "40px"
  target: "44px"
  row: "48px"
  section: "48px"
  block-gap: "56px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.bg}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "40px"
  button-primary-hover:
    backgroundColor: "{colors.accent-ink}"
  button-primary-disabled:
    backgroundColor: "{colors.sunk}"
    textColor: "{colors.muted}"
  button-secondary:
    backgroundColor: "{colors.sunk}"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "40px"
  button-secondary-hover:
    backgroundColor: "{colors.hover}"
  button-quiet:
    textColor: "{colors.muted}"
    rounded: "{rounded.md}"
    size: "36px"
  button-quiet-hover:
    backgroundColor: "{colors.hover}"
    textColor: "{colors.text}"
  chip-lens:
    backgroundColor: "{colors.sunk}"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "36px"
  chip-lens-selected:
    backgroundColor: "{colors.text}"
    textColor: "{colors.bg}"
  tab:
    textColor: "{colors.muted}"
    padding: "0 12px"
    height: "40px"
  tab-active:
    textColor: "{colors.text}"
  nav-item:
    textColor: "{colors.muted}"
    rounded: "{rounded.md}"
    padding: "0 10px"
    height: "36px"
  nav-item-active:
    backgroundColor: "{colors.hover}"
    textColor: "{colors.text}"
  due-chip:
    backgroundColor: "{colors.board}"
    textColor: "{colors.board-ink}"
    rounded: "{rounded.chip}"
    padding: "0 6px"
    height: "20px"
  input-ask:
    backgroundColor: "{colors.bg}"
    textColor: "{colors.text}"
    rounded: "{rounded.lg}"
    padding: "14px 16px 10px"
  panel:
    backgroundColor: "{colors.frame}"
    textColor: "{colors.text}"
    rounded: "{rounded.lg}"
    padding: "20px"
  popover:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
    padding: "4px"
  rating-button:
    backgroundColor: "{colors.bg}"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
    height: "56px"
  rating-button-suggested:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.accent}"
  station-board:
    backgroundColor: "{colors.board}"
    textColor: "{colors.board-ink}"
    typography: "{typography.board}"
    rounded: "{rounded.none}"
    padding: "10px 16px 8px"
  station-board-small:
    backgroundColor: "{colors.board}"
    textColor: "{colors.board-ink}"
    typography: "{typography.board-small}"
    rounded: "{rounded.none}"
    padding: "4px 6px 2px"
  route-line:
    backgroundColor: "{colors.line}"
    height: "3px"
  station-dot:
    backgroundColor: "{colors.bg}"
    rounded: "{rounded.full}"
    size: "14px"
  station-dot-done:
    backgroundColor: "{colors.line}"
  station-dot-here:
    backgroundColor: "{colors.board}"
    size: "22px"
  slideshow-box:
    backgroundColor: "{colors.stage}"
    rounded: "{rounded.stage}"
---

# Design System: Chronicle

## Overview

**Creative North Star: "The Station Board"**

Chronicle is a plain, familiar study app with one drawing of its own. Everything a student works with (the sidebar, tabs, buttons, the question box, ruled tables, reading text) looks the way a calm notes app looks: white pages on a light grey frame, near-black ink, neutral greys, standard controls. The one ornament is time. Wherever the product shows a sequence, it draws the same 3px ink line with round stations: open where nothing has happened yet, filled where it has, and the current one on a square yellow station board lettered in narrow, heavy capitals. The syllabus, the parts of a lesson, the day's review cards, a cause map on a phone and the homepage slideshow's ruler are all this one line.

Density is moderate and readable: Atkinson Hyperlegible Next everywhere (chosen for legibility, not character), 14px to 15.5px for interface text and 19px for lesson reading. Colour is spent sparingly and always means something: railway maroon for what you can do, station-board yellow for where you are and what is due, green and red only for settled or overdue, established or contested. Light and dark are equal themes built from the same token names; the dark one is a warm near-black, not an inverted grey.

The system refuses the "calm AI notebook" look (tinted page ground, soft serif display, mono kickers, rows of identical bordered cards) and the parchment-history costume. History's texture lives in the plates (the illustrated images) and in the board lettering, never in the page material.

**Key Characteristics:**
- White page (#ffffff) on a light neutral frame (#f7f7f5); flat, with depth only for things that float.
- One route line, 3px, in the text colour, with 14px stations; the current station on a square yellow board.
- Archivo at 75% width, weight 800, uppercase, only on boards and the wordmark.
- Railway maroon for primary actions, links and the focus ring; nothing decorative.
- Tabular figures on every date and count; mono only for keyboard keys and code.
- Standard controls at standard sizes: 36px to 44px high, 6px corners, 44px touch targets.
- Motion is transform and opacity, under 300ms, with a quick fade in its place under reduced motion.

## Colors

A neutral study palette with one action colour, one marker colour, and signal colours that only appear when they carry meaning.

### Primary
- **Railway Maroon** (#8a2b22): primary buttons (Start lesson, Start review, Ask, Start learning), links such as "See your progress", the focus ring, the text caret, the reading-progress hairline under the lesson's top bar and the loading rule. 8.6:1 on the page. In dark it becomes **Signal Salmon** (#ec8b7c) with dark text (#191918) on it.
- **Pressed Maroon** (#6f2019): hover and pressed state of maroon fills. Dark: #f4a99c.
- **Maroon Wash** (rgba(138, 43, 34, 0.08)): the suggested answer among the review ratings ("Good"), the "updated" tag on a changed part, and the homepage question box's focus halo. Dark: rgba(236, 139, 124, 0.12).

### Secondary
- **Station-Board Yellow** (#f2c230): the fill of station boards and current-station dots, and of the due-count chip. Always carries ink lettering (**Board Ink**, #1d1d1b, in both themes) and an ink border. Dark: #e8b72a. Also used as two faint tints: text selection (55% mix) and the arrival glow on a part that just landed (22% mix, fading over 1.5s).

### Tertiary
- **Settled Green** (#1f7a3a): every idea at a station settled, a correct answer ("Right."), "Copied". Dark: #6cc58a.
- **Overdue Brick** (#c0281e): overdue cards, contested claims and links, errors, the quota warning when 3 or fewer questions are left. Dark: #f07a6b.
- **Remember Ochre** (#946000): "Remember this" callouts, "remember" note underlines, and the brief flash on a changed heading. Dark: #dcaa45.
- **Debate Violet** (#6b4fbb): "Live debate" callouts and "disagree" note underlines. Dark: #b39cf0.
- **Cause-map layers**: structural blue (#2f5da8), enabling green (#4a7a2c), trigger red (#c0281e), chance violet (#7a4fb8), consequence ochre (#946000); each also has its own shape (square, triangle, diamond, open circle, filled circle), so colour is never the only cue. All at least 5:1 on the page; dark values at least 5.7:1.

### Neutral
- **Page White** (#ffffff): the page (`bg`) and raised panels (`surface`). Dark page: **Warm Near-Black** (#191918); dark surface #252524.
- **Frame Grey** (#f7f7f5): the sidebar, the review panel, the answer box, "To remember", the homepage syllabus band. Dark: #202020.
- **Sunk Grey** (#efefec): chips and secondary buttons at rest, disabled primary buttons, loading placeholders. Dark: #2c2c2a.
- **Ink** (#1d1d1b): text, and the route line itself (`line`). Dark: #ecebe8, so boards in dark wear a light border.
- **Muted Grey** (#5f5e5a): secondary text, years under stations, labels. 6.5:1 on the page. Dark: #a3a29d.
- **Rule** (#e6e5e1) and **Strong Rule** (#cfcec9): hairlines between rows and around controls, and field borders. Dark: #31312e and #4a4945.
- **Hover Tint** (rgba(29, 29, 27, 0.05)): the hover and current-place fill on nav items, rows and quiet buttons.
- **Stage Black** (#0e0e0d): inside the homepage slideshow box, in both themes.

### Named Rules
**The Station Board Rule.** Yellow is only ever a station board, a station dot or the due count: a solid fill with ink lettering and an ink border. It marks where you are (the current station, part, card, moment or event) or what is due. It is never a button, a link, a background wash or emphasis.

**The Maroon Acts Rule.** Railway maroon is for things you can do: primary buttons, links, the focus ring, the caret. Headings, icons and decoration stay in ink and grey.

**The Signal Words Rule.** Green and red appear only where they mean settled or overdue, correct or wrong, established or contested, and they always travel with a word or a shape (a filled, half or hollow confidence dot; "Contested:"; a hidden state word for screen readers). Colour alone never carries state.

## Typography

**Display Font:** Atkinson Hyperlegible Next (with Helvetica Neue, Arial, sans-serif)
**Body Font:** Atkinson Hyperlegible Next (with Helvetica Neue, Arial, sans-serif), in normal and italic
**Board Font:** Archivo with its width axis (with Arial Narrow, sans-serif)
**Mono Font:** Atkinson Hyperlegible Mono (with ui-monospace, Menlo, monospace)

**Character:** One highly legible sans does all the reading, interface and headline work, so the page reads like a well-made tool. The only typographic voice is the station board: Archivo squeezed to 75% width at weight 800, in capitals, like lettering on a railway sign.

### Hierarchy
- **Display** (700, clamp(34px, 3.6vw, 50px), line-height 1.05, -0.02em, balanced wrap): the homepage headline only, left-aligned, at most 18em wide.
- **Headline** (700, 28px on phones and 34px from 768px, line-height 1.2 to 1.25, -0.015em): page titles ("History for GS Paper I", "Progress") and the editable lesson title. Review card questions use 25px / 29px at 1.25.
- **Title** (600, 22px, line-height 1.25, -0.005em): a lesson part's heading and "To remember".
- **Subtitle** (600, 18px to 19px): section headings such as "The syllabus", "Recent lessons", "How much you remember". Panel headings are 16px semibold.
- **Reading** (400, 19px, line-height 1.7; 17.5px at 1.65 below 768px): lesson text, in a column of at most 680px. Paragraphs are spaced 0.9em; strong is 600.
- **Body** (400, 14px to 15.5px, line-height about 1.5): interface text, lists, table rows, panel copy. The document base is 14px.
- **Label** (400 to 600, 12.5px to 13.5px): years under stations, captions, hints, table headers, the quota line. Sentence case, never uppercase, never letter-spaced.
- **Date** (700, 13.5px to 14px, tabular figures): the dates printed under a board's name and the lesson's span.
- **Board** (Archivo 800, 75% width, uppercase, 0.01em, line-height 1): era names on boards at 26px (across the page), 22px (down the page), 20px (the event in a cause list), 14px to 15px on small boards; the wordmark at 21px in the app and 23px on the homepage.
- **Mono** (12px to 12.5px): keyboard keys in `kbd` and raw block data, nothing else.

### Named Rules
**The Board Lettering Rule.** Archivo, narrow and heavy, appears only on station boards and the wordmark. Every headline, including the homepage's, is set in Atkinson.

**The Tabular Dates Rule.** Every date, year, count and score uses tabular figures in the reading face. Mono is for keys and code only, never for labels or numbers.

## Layout

The app is a sidebar and a page. From 768px a 240px light sidebar (frame grey, with a 1px rule on its right) holds the wordmark, the three places (Learn, Review with its due count, Progress), recent lessons, the account and the theme switch. Below 768px the sidebar becomes a 48px top bar (wordmark and theme button, page colour at 95% with a blur) and 64px bottom tabs for the same three places, padded for the home indicator with `env(safe-area-inset-bottom)`.

Pages are single columns centred in the space beside the sidebar, each with a width that suits its job: Learn up to 1120px, Progress 880px, Review 640px. A lesson uses a 1080px row: the lesson line (112px, sticky, from 768px), the reading column (up to 680px), and a 260px notes margin from 1280px. On a laptop the lesson's chat dock sits on the left at 340px by default and can be dragged between 280px and 520px. The homepage wraps its content at 1240px.

Gutters are 16px on phones and 40px from 768px (the homepage uses clamp(16px, 4vw, 40px)). Spacing follows a 4px step. Sections are separated by 40px to 56px; the parts of a lesson by 56px. Rows in ruled lists and tables are at least 48px tall, and every touch target is at least 44px.

The route line changes direction with the screen: across the page from 1024px, down the left edge below it, with the chosen station's details opening in place under its board. On Learn, the station's questions and lenses sit beside the daily review panel (320px) from 1024px; below that, a compact "To review today" row moves up under the question box.

The homepage keeps the question box in the first laptop screen: the slideshow box is 16:7 on wide screens and 4:5 on tall ones, and gives up height (max(300px, 100svh minus 500px)) before the question box gives up the fold.

### Named Rules
**The One Line Rule.** Any sequence the student moves through is drawn as the route line, the same way everywhere: across on wide screens, down the left on narrow ones. No second drawing of time or progress is introduced.

## Elevation & Depth

The page is flat. Depth comes from tone: white page on frame grey, frame-grey panels on the white page, sunk grey for controls at rest. One shadow, the float, is used only for things that sit above the page and can be dismissed: popovers, menus, tooltips, the side panel, the bottom sheet, dialogs, and the "Jump to latest" pill in the chat. Overlays behind panels and sheets are an ink scrim at 18%. The homepage slideshow box is the one surface with its own lift, because it is a window onto the plates rather than part of the page.

### Shadow Vocabulary
- **Float** (`box-shadow: 0 1px 2px rgba(29, 29, 27, 0.08), 0 10px 28px -6px rgba(29, 29, 27, 0.16)`; dark: `0 1px 2px rgba(0, 0, 0, 0.4), 0 12px 32px -6px rgba(0, 0, 0, 0.5)`): popovers, menus, tooltips, panels, sheets, dialogs.
- **Stage lift** (`box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08), 0 30px 60px -36px rgba(0, 0, 0, 0.55)`): the homepage slideshow box only.
- **Ask halo** (`box-shadow: 0 0 0 4px var(--accent-soft)`): the homepage question box while focused.

### Named Rules
**The Flat Page Rule.** Nothing on the page casts a shadow. Panels, the review panel, the answer box and tables are separated by tone and 1px rules; the float shadow is reserved for things that open over the page.

## Shapes

Two shape languages meet. Station boards are square: no rounding, a 3px ink border on full boards and 2px on small ones, like a painted sign. Everything you operate is gently rounded: 6px on buttons, chips, nav items, menus and popovers; 8px on panels, fields and the homepage's buttons; 4px on menu rows. Smaller marks are tighter: 3px on the due chip, the confidence tag and plate images; 2px on the lesson span, a block's arrival glow and the focus ring. Stations, dots and the slideshow's play button are full circles. A few large containers are softer: the bottom sheet's top corners (10px), the homepage question box (14px, with a 1.5px ink border), and the slideshow box (24px, 18px when tall).

### Named Rules
**The Square Board Rule.** A board never gets rounded corners, a shadow or a gradient. Its square edge and ink border are what make it read as a board among rounded controls.

## Components

### Buttons
Standard, quiet, and filled only when they matter.
- **Shape:** gently rounded (6px); 8px on the homepage.
- **Primary:** maroon fill, page-white text, 14.5px semibold, 40px high with 16px sides; 44px for the main action on a review card and on touch-heavy screens; 48px with 20px sides for the homepage's Ask. A trailing arrow icon (15px) where it leads somewhere.
- **Hover / Active:** hover darkens to pressed maroon; press scales to 0.97 over 150ms. On touch screens any control dims to 60% the moment a finger lands. Focus is a 2px maroon outline with a 2px offset.
- **Disabled:** sunk grey fill with muted text (Start lesson and Ask before anything is typed; Send in the composer).
- **Secondary:** sunk grey fill, ink text, 14.5px medium, 40px ("See progress"); hover moves to the hover tint.
- **Quiet:** icon or text buttons with muted ink and no fill (the chat toggle, More, theme switch), 36px square on laptops and 44px on phones; hover adds the hover tint and ink text.

### Chips
- **Lens chips:** sunk grey, ink text, 14px medium, 36px high with 12px sides, 6px corners (Story, Timeline, People, Places, Cause and effect under a station). On the homepage they are 40px, 15px semibold, 8px corners, and toggle: selected is an ink fill with page-white text.
- **Level choice** (New to this, Some background, Revising): text-only options, 36px; the chosen one sits on sunk grey in semibold.
- **Due chip:** the count of cards waiting, on a scrap of board yellow (20px high, 3px corners, 12px bold tabular figures), beside Review in the sidebar and on the Review tab.
- **Follow-up suggestions** in the chat: 1px dashed strong-rule outline, 12.5px, turning maroon on hover.

### Cards / Containers
- **Corner Style:** 8px.
- **Background:** frame grey on the white page (the daily review panel, the answer, "To remember", empty-state notes). No border.
- **Shadow Strategy:** none (see Elevation & Depth).
- **Border:** none on frame panels; a 1px rule only where content is the user's own ("You wrote").
- **Internal Padding:** 20px for panels; 14px to 16px for the answer box.
- Lists of lessons and questions are ruled tables and ruled lists, not cards: 1px rules between rows, rows at least 48px, the whole row clickable, the label turning maroon on hover.
- **Asides** in a lesson ("Remember this", "Live debate" and the rest) are 8px panels washed with 7% of their kind's colour over the page, the label in that colour; a live debate adds a 1.5px dashed outline in its violet. **Note cards** in the margin are frame-grey panels with 6px corners. Neither has a side stripe.

### Inputs / Fields
- **Style:** the app's question box is a white field with a 1px strong-rule border and 8px corners, 17px text with a 2-line minimum, the level choice and Start lesson inside its bottom edge. The lesson composer is the same idea at 14px (16px on touch) with 6px corners. The homepage question box is larger: 14px corners, a 1.5px ink border, 17.5px to 21px text, lens chips and Ask inside.
- **Focus:** the whole box shows focus, never the textarea alone: the border turns maroon (app), or a 4px maroon-wash halo appears (homepage). The caret is maroon.
- **Error / Limits:** the daily quota line sits under the field in 12.5px to 13px muted tabular text and turns brick at 3 or fewer left.

### Navigation
- **Sidebar items:** 36px rows, 14.5px, muted with a 16px icon; hover and the current place use the hover tint, and the current place is semibold ink.
- **Bottom tabs (phones):** three equal 64px tabs, 20px icons over 12.5px labels; the current one semibold ink, the rest muted.
- **Underline tabs:** the lesson views (Read, Map, Timeline, Quiz) and the syllabus parts (Ancient India, Medieval India, Modern India, World history): 14.5px muted labels on a 1px rule; the chosen one is semibold ink on a 2px ink underline. On phones the lesson views collapse into one "View" menu.
- **Lesson top bar:** 56px, the page colour at 94% with a light blur, hides on scroll down and returns on scroll up (200ms); a 1px maroon hairline under it shows how far you have read.
- **Homepage header:** 64px, sticky, page colour at 92% with an 8px blur and a 1px rule; wordmark left; muted 15px links that underline on hover; the maroon Start learning button at 40px with 8px corners.
- **Segmented control:** a 2px-padded rule-bordered group; the chosen option is an ink fill with page-white text (used for how much of each article to show).

### Popovers, Panels and Sheets
- **Popovers and menus:** surface fill, 1px rule border, 6px corners, 4px padding, float shadow; rows 40px to 44px at 14px to 15px with the hover tint. They grow from their trigger (scale 0.97 to 1 and fade, 150ms in, 100ms out).
- **Side panel:** up to 400px from the right edge, page fill, 1px rule on its left, slides in over 280ms on the drawer curve and out over 200ms.
- **Bottom sheet (phones):** page fill, 10px top corners, up to 70% of the screen, rises over 280ms and drops over 200ms.

### Confidence Marks and Cause Shapes
- **Confidence dot:** filled for established, half-filled for likely, hollow for contested, in the current text colour; never colour alone.
- **Confidence tag:** a small 3px-cornered tag with a 1px rule (11.5px semibold tabular letter E, L or C plus the dot) set inline after a claim; it opens a popover explaining the three levels.
- **Kinds of cause:** each layer has a plain name (Long-term cause, Made it possible, Spark, Chance or choice, The event, What it led to), a shape and a colour.

### The Route Line (signature component)
One drawing used everywhere a student moves through a sequence.
- **The line:** 3px, in the text colour (`line`), straight.
- **Stations:** 14px circles with a 3px ink border; open (page fill) for not yet, filled (ink) for done or started. The current station is 20px to 22px and filled yellow. On Progress a station can also be **settled** (green fill and border) or **overdue** (brick fill and border), in the order of precedence here, overdue, settled, started, open, with a legend above the line and the state word read out to screen readers.
- **The board:** the current station's name in board lettering on a square yellow board with a 3px ink border, its dates beneath in 13.5px to 14px bold tabular figures. Across the page the board hangs from a 24px ink post above its station and slides along the line to a newly chosen station (280ms, ease-in-out); past about 62% of the way it hangs to the left of its post so it stays on the page.
- **Across (from 1024px):** 178px tall, stations spaced evenly, each a 108px-wide button with the short name (13.5px semibold, bold when current, underlined on hover) and its year (12.5px muted tabular).
- **Down (below 1024px):** the line runs 14px from the left edge; other stations are 48px rows (15.5px semibold name, 13px muted year); the current one wears its board (22px lettering) and its details drop in beneath it.
- **The lesson line:** a lesson's parts as a short vertical line to the left of the reading column (from 768px), one station per part in reading order, labelled by the part's title rather than by year. The part in view is named on a small yellow board (12.5px bold, 2px ink border, 2px corners); read parts are filled and set in ink, unread ones open and muted; the kind of part and its period appear in a tooltip.
- **The card line:** today's review cards across the top of a review, 12px stations and an 18px yellow one for the card in hand, with "3 of 12" in tabular figures. At the end of a session every station fills in, left to right, 40ms apart.
- **The cause list (phones):** a cause map drawn as steps down the line, each cause in a 28px circle with its layer shape, the event on its own yellow board, and each link's reason with its confidence; contested reasons are written in brick and begin "Contested:".
- **The slideshow ruler (homepage):** the same line inverted for the dark stage: a 3px white line along the bottom of the box, 2px by 7px ticks for each moment, 11px open circles for key moments, and the needle as a 19px yellow station with a 3px ink border, moved with transform. The moment's date sits on a yellow board in the top-left corner (2px ink border, 15px to 19px board lettering).
- **Decided (29 Oct 2026, the owner's words: "Keep the route"):** a lesson's parts are drawn with the route line too. The line stands for the way through something: time on the syllabus and the slideshow, the order of parts in a lesson.
- **Open point:** the settled and overdue station states on Progress are implemented and unit-tested but have not yet been seen in a capture.

### Motion
Motion is short, uses transform and opacity, and explains where something came from.
- **Curves:** ease-out `cubic-bezier(0.23, 1, 0.32, 1)` for most things; ease-in-out `cubic-bezier(0.77, 0, 0.175, 1)` for the board sliding along the line; drawer `cubic-bezier(0.32, 0.72, 0, 1)` for panels, sheets and content opening in place.
- **Vocabulary:** popovers 150ms in and 100ms out; panels and sheets 280ms in and 200ms out; the scrim 200ms; the phone conversation rises 16px over 260ms; a station's details drop 4px over 180ms; new content fades up 4px over 180ms; presses scale to 0.97 over 150ms; the theme switch crossfades the page over 200ms.
- **Slow, ambient pieces:** a new or changed part glows faint yellow for 1.5s; a changed heading flashes ochre for 1.6s; the loading rule slides a maroon segment across a 1px rule every 1.4s; while a lesson is on its way the era's plate pushes in to 106% over 24s.
- **Reduced motion:** movement is removed; panels, sheets, popovers and the scrim fade over 120ms instead; the loading rule becomes a static half-strength bar; the slideshow waits on its first frame until the reader presses play.

### Named Rules
**The Under-300ms Rule.** Interface motion stays under 300ms and moves only transform and opacity. Anything longer is ambient (an arrival glow, a slow plate) and never blocks the student.

## Do's and Don'ts

### Do:
- **Do** draw any sequence a student moves through as the route line: a 3px ink line, 14px stations with a 3px ink border, open for not yet, filled for done, the current one larger and yellow.
- **Do** name the current station, part, card or moment on a square yellow board (#f2c230) with Archivo board lettering and its dates beneath in bold tabular figures.
- **Do** build pages from white (#ffffff) on frame grey (#f7f7f5), with 1px rules (#e6e5e1) between rows and frame-grey panels instead of bordered cards.
- **Do** make the one main action on a screen a maroon (#8a2b22) button, 40px high with 6px corners, 14.5px semibold, pressing to 0.97.
- **Do** list lessons and questions as ruled rows at least 48px tall, the whole row clickable.
- **Do** set lesson text at 19px with 1.7 line height (17.5px and 1.65 on phones) in a column no wider than 680px.
- **Do** give every touch target at least 44px, and pad bars for the notch and home indicator.
- **Do** pair every signal colour with a word or a shape: confidence dots, layer shapes, "Contested:", a state word for screen readers.
- **Do** define colour only through the shared tokens so the dark theme follows without extra work.

### Don't:
- **Don't** use yellow for buttons, links, highlights, background washes or decoration; it is a board, a station or the due count.
- **Don't** use a serif or display face for headlines, a tinted or parchment page ground, or paper textures.
- **Don't** set labels, kickers or numbers in mono or in letter-spaced capitals; mono is for keyboard keys and code.
- **Don't** lay out content as grids of identical bordered cards.
- **Don't** put gradient fills on buttons, panels or page backgrounds; the only gradients are the legibility shades and the bloom inside the slideshow box.
- **Don't** add coloured side stripes (a thick coloured left border) to callouts, notes or blocks.
- **Don't** give boards rounded corners, shadows or gradients, and don't draw a second kind of timeline or progress bar beside the route line.
- **Don't** put shadows on anything that sits on the page; the float shadow is for popovers, menus, panels, sheets and dialogs.
- **Don't** animate layout properties or run interface motion past 300ms.
