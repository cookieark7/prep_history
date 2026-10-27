# Chronicle Homepage: Image Sequence Pack (v0)

A scroll journey from the Big Bang to now, built from **34 still plates** that crossfade into each other. Each plate carries one tint, one continuity anchor and one image-generation prompt. Video transitions are a later, optional upgrade (see the appendix).

> **Update (Oct 2026):** the homepage now plays as an **autoplay film**, not a scroll journey. The "Scroll start" column and the scroll shares in section 2 are superseded by `chronicle-landing-build-prompt.md`, which owns timing, ordering and captions. **B35** (Mali, the Aztec and the Inca) was added; it plays between B24 and B25.

## How to use this file

1. Read sections 1 to 4 once: the decision, the clock, the style bible and the anchor system.
2. For each beat in section 5, paste **GLOBAL STYLE + the beat prompt** into your image model, and put the **NEGATIVE** list in the negative field (or append it as "Avoid: ...").
3. Generate 3 to 4 variants per beat, pick one, and log it in your manifest.
4. Run the QA checklist in section 6, especially the pairwise crossfade test.
5. Dates are approximate and marked "c." where they are. Verify them before publishing any caption.

---

## 1. Decision: stills first, video later

**Stills now.** They are cheap, controllable, light to load, easy to check, and easy to crossfade or scrub on scroll. The "every frame is connected" feel does not need video. It comes from the **continuity anchor** (section 4): one circular or spiral shape held at the exact center of every plate, so a crossfade between two plates reads as one shape turning into the next.

**Video later, only for a handful of hero transitions.** Use the approved stills as start and end frames (see the appendix). Doing it for all 34 beats costs too much, loads too slowly on mobile, and makes continuity between independently generated clips hard.

**Be honest about AI plates.** They look like real museum plates, but they are illustrations. Label them that way, and avoid inventing "artifacts". Over time, swap in real public-domain images for recorded-history beats where you can.

---

## 2. The clock (scale)

The Big Bang is 13.8 billion years ago and recorded history is about 5,000 years, so one linear scroll would show all of history as a sliver. The page uses two rulers and makes the switch a visible beat.

| Act | Beats | Ruler | Scroll share |
|---|---|---|---|
| I. Deep time and prehistory | 1 to 15 | **Logarithmic "years ago"** | 0% to 24% (fast, rhythmic, about 1.6% per beat) |
| II. Recorded history | 16 to 33 | **Linear BCE/CE** | 24% to 88% (slower, about 3.6% per beat) |
| III. Now | 34 | none | 88% to 100% (the composer appears) |

- At **beat 16** the ticker flips from "years ago" to BCE/CE and a small caption says why.
- Implement as control points (scroll %, time). Between points, interpolate the ticker **in log space for Act I** and **linearly for Act II**. Tune pacing by editing the points, not the code.
- Deep time accelerates, then history slows down so you can savor it.

---

## 3. Style bible

> **Update (17 Oct 2026, round 2):** GLOBAL STYLE no longer asks for aged cream paper or for "one circular or spiral focal element". Round 1 produced plates mounted on paper with drawn borders and stray spiral discs. The opening is now scroll-driven with hard cuts (storyboard v1), so plates must fill the frame with the subject centred.

### GLOBAL STYLE (prepend to every beat prompt)

```text
Antique natural-history and celestial-atlas plate, hand-colored lithograph with fine engraved crosshatching and soft gouache washes, subtle paper texture within the picture, museum-archive quality, flat even lighting, matte finish. The illustration fills the entire 16:9 canvas edge to edge: no paper margin, no border, no frame, no blank panel. The main subject sits at the exact center of the frame. No text anywhere.
```

### NEGATIVE (use in the negative field, or append as "Avoid: ...")

```text
text, letters, numerals, captions, signature, watermark, logo, frame, border, user interface, photorealistic CGI, glossy 3D render, neon, lens flare, cartoon, anime, comic-book style, modern objects, brand names, national flags, real people's faces, close-up faces, gore, extremist or hate symbols
```

### Rules for every prompt

- Do **not** name living artists, franchises, films or games in any prompt.
- People appear as silhouettes or seen from behind. No facial detail.
- Marks that imitate writing must be **abstract** (wedges, lines), never readable letters.
- No sacred imagery depicted literally. Keep religious and cultural motifs abstract or architectural.

### Output specs

- 16:9, at least 2560 px wide.
- The focal anchor must survive a **9:16 center crop** for mobile. Keep key detail in the middle third.
- Export AVIF or WebP at 1280 and 1920 px widths. Budget (my estimate, adjust after measuring): the first plate well under 200 KB, the whole set lazy-loaded just ahead of the scroll.

---

## 4. Continuity anchor system

Every plate has **one circular or spiral object at the exact center**. Neighboring anchors rhyme in size and position, so a 50% crossfade, plus a small scale or rotation drift, reads as one shape becoming the next:

point of light, star, sun disc, molten sphere, cell, nucleus, coiled shell, fern spiral, tree rings, sun disc again, fireball, hammerstone, campfire ring, handprint ring, millstone, plaza, clay disc, sun between two worlds, oil lamp, coin, cracked shield, astrolabe, yurt, bell, screw platen, compass rose, orbits, cockade, flywheel, pocket watch, spinning wheel, moon, globe, **empty ring (the composer)**.

The through-line, which you can use in copy: *everything begins as a point and becomes a circle.*

---

## 5. The 34 beats

Times are approximate (c.). "Scroll start" is where the beat begins on the 0 to 100% page scroll. Tints are starting hex values to tune by eye, and the CSS atmosphere layer interpolates between them in OKLCH.

| # | Time | Scroll start | Tint | Anchor (center) |
|---|---|---|---|---|
| 1 | 13.8 billion years ago | 0.0% | #0B0714 + ember #FF7A3D | Point of light |
| 2 | 13.5 billion years ago | 1.6% | #101436 | Blue-white star |
| 3 | 4.6 billion years ago | 3.2% | #3A1E10 + amber #E8A33A | Young sun disc |
| 4 | 4.5 billion years ago | 4.8% | #4A1A10 + lava #FF5A2A | Molten sphere |
| 5 | 3.8 to 3.5 billion years ago | 6.4% | #0E3A3F | Round cell |
| 6 | 2.4 to 2.0 billion years ago | 8.0% | #5A2A1E + #1F4D3A | Cell with nucleus |
| 7 | 540 million years ago | 9.6% | #0B3C4F | Coiled shell |
| 8 | 470 to 375 million years ago | 11.2% | #1F4A2E | Fern spiral |
| 9 | 300 million years ago | 12.8% | #17391F | Tree rings |
| 10 | 70 million years ago | 14.4% | #5C3B14 | Pale sun disc |
| 11 | 66 million years ago | 16.0% | #1A0A08 + #FF4A1C | Fireball |
| 12 | 6 to 2.6 million years ago | 17.6% | #6B4A24 | Hammerstone |
| 13 | c. 300,000 years ago | 19.2% | #5A3C22 | Campfire ring |
| 14 | c. 40,000 years ago | 20.8% | #6E3A22 | Handprint ring |
| 15 | c. 11,000 years ago | 22.4% | #8A6A2B | Millstone |
| 16 | c. 3500 BCE | 24.0% | #8A4B2E | Circular plaza |
| 17 | c. 3200 BCE | 27.6% | #7A4A30 | Clay disc |
| 18 | c. 2600 BCE | 31.1% | #B07A3A + lapis #2F4B8C | Sun between two worlds |
| 19 | c. 500 BCE | 34.7% | #2F4B8C | Oil lamp |
| 20 | c. 100 BCE | 38.2% | #8C2F2B + gold | Coin |
| 21 | 476 CE | 41.8% | #6B645A | Cracked shield |
| 22 | c. 830 CE | 45.3% | #1F5C5C + gold | Astrolabe |
| 23 | 1206 to 1260 | 48.9% | #6A5A3A | Yurt |
| 24 | 1347 | 52.4% | #2E2B2A | Bell |
| 35 | c. 1325 to 1450 (plays after 24) | n/a | #4E5A2C + gold #D4A03A | Ringed terraces |
| 25 | c. 1450 | 56.0% | #3B2F20 | Screw platen |
| 26 | 1492 to 1498 | 59.6% | #1F4F73 | Compass rose |
| 27 | 1543 to 1687 | 63.1% | #D8CBA8 + indigo | Orbits around the sun |
| 28 | 1776 to 1789 | 66.7% | #7A2530 | Cockade |
| 29 | c. 1760 to 1840 | 70.2% | #3A3F44 + furnace orange | Flywheel |
| 30 | 1914 to 1945 | 73.8% | #4A4A44 | Stopped pocket watch |
| 31 | 1947 | 77.3% | #D98A3D | Spinning wheel |
| 32 | 1969 | 80.9% | #0E1220 + moon #E9E3D8 | Moon disc |
| 33 | 1990s | 84.4% | #12202E + restrained cyan | Glass globe |
| 34 | Now | 88.0% | #FAF7F2 (paper) | Empty ring |

---

### Act I: Deep time and prehistory (log "years ago")

**B01 · The Big Bang · 13.8 billion years ago**
```text
A single tiny blazing point of warm white-gold light at the exact center of a near-black violet field, radiating hair-fine engraved rays outward in perfect symmetry, a faint ember-orange halo, a scatter of dust-like grain, nothing else, the instant before everything. Palette: near-black violet, ember orange, pale gold.
```

**B02 · First stars · 13.5 billion years ago**
```text
The first stars igniting in a deep indigo void: one large blue-white star burning at the exact center with an engraved diffraction glow, hundreds of smaller stars around it, faint filaments of cosmic gas curling like ink in water, gouache washes of indigo and pale blue, engraved stipple.
```

**B03 · Sun and planets form · 4.6 billion years ago**
```text
A young sun, a bright amber-gold disc at the exact center, inside a flat spinning disc of dust and gas seen slightly from above, bands of umber and ochre, tiny rocky clumps coalescing along concentric rings, fine engraved orbital lines, celestial-atlas style.
```

**B04 · Earth and the Moon-forming impact · 4.5 billion years ago**
```text
A young molten Earth, a glowing sphere at the exact center with rivers of orange lava and cracked black crust, a smaller rocky body glancing off its edge in a burst of sparks and debris, a ring of fragments beginning to orbit, dark umber space, engraved crosshatching on the shadow side.
```

**B05 · First life · 3.8 to 3.5 billion years ago**
```text
The first life in shallow warm seas: a single translucent round cell at the exact center, membrane drawn in fine ink line with a dotted interior, surrounded by layered microbial mats and domed stromatolite mounds in teal, olive and rust, shown as a specimen-plate cross-section of seawater and sediment.
```

**B06 · Oxygen and the complex cell · 2.4 to 2.0 billion years ago**
```text
A larger complex cell with a distinct nucleus and organelles at the exact center, drawn like a biology plate, floating above banded red-and-grey iron-rich rock strata, pale green cyanobacteria filaments releasing tiny bubbles upward, an orange-tinted sky turning faintly blue-green at the top edge.
```

**B07 · The Cambrian explosion · 540 million years ago**
```text
A Cambrian seabed: a coiled spiral shell at the exact center, surrounded by trilobites, spiny worms, strange many-legged soft-bodied animals and early arthropods arranged like a specimen plate, deep sea-green and teal washes, pale sand floor, delicate engraved shadows.
```

**B08 · Life reaches land · 470 to 375 million years ago**
```text
A muddy shoreline at dawn: an unfurling fern fiddlehead spiral at the exact center, low primitive plants and mosses, a lobe-finned fish-like animal hauling itself onto the mud, shallow water behind, soft green and brown washes, a pale sky.
```

**B09 · The coal forests · 300 million years ago**
```text
A cross-section of a giant tree trunk with concentric growth rings at the exact center, framed by towering scale-barked trees, giant ferns and horsetails of a swamp forest, a huge dragonfly with a wide wingspan, misty deep-green air, lamplit engraved detail.
```

**B10 · Age of dinosaurs · 70 million years ago**
```text
A huge pale sun disc at the exact center, low on the horizon of a Late Cretaceous plain, silhouetted dinosaurs of different sizes crossing it, including a large tyrannosaur with open jaws roaring, ferns and conifers in the foreground, warm amber and ochre, scientific-illustration realism with antique print texture.
```

**B11 · The impact · 66 million years ago**
```text
The exact same composition and horizon as the previous plate, but the sun disc is now a blazing fireball streaking down at the exact center through a sky turning orange and black, a shockwave line on the horizon, tiny silhouetted dinosaurs and swaying trees below, ash-grey clouds, ember-red edges.
```
Tip: generate B10 and B11 from the same base composition, so they crossfade as one moment.

**B12 · Upright walkers and the first tools · 6 to 2.6 million years ago**
```text
Open savanna with acacia trees and golden grass: in the foreground center, a hand holding a round hammerstone above a freshly flaked stone tool, a small upright-walking early hominin far away seen from behind, warm ochre light, naturalist plate style.
```

**B13 · Homo sapiens · c. 300,000 years ago**
```text
A circle of stones with a small campfire at the exact center, a family group of early modern humans silhouetted around it in animal-skin clothing, faces unseen, sparks rising into a starry sky, a rock overhang behind, umber and ember palette.
```

**B14 · Cave art · c. 40,000 years ago**
```text
A cave wall lit by torchlight: a ring of red-ochre hand stencils forming a circle at the exact center, painted bison and horses in black and ochre around it, rough limestone texture, flickering warm light, mineral pigments, no symbols, no letters, not a copy of any specific real painting.
```

**B15 · Farming · c. 11,000 years ago**
```text
A round stone grinding quern at the exact center with heaped wild grain, beside it sheaves of early wheat and barley, a small settlement of round mudbrick houses and a ploughed field on the horizon, golden wheat tones, early-morning light.
```

---

### Act II: Recorded history (linear BCE/CE)

**B16 · The first cities · c. 3500 BCE**
```text
A bird's-eye plan-and-elevation view of an early Mesopotamian walled mudbrick city with a stepped temple tower, canals and fields, a circular plaza at the exact center, terracotta, ochre and pale blue-green canal washes, antique map style with fine hatching.
```
Check: a stepped mudbrick temple tower, mudbrick walls, no later arches or domes.

**B17 · Writing · c. 3200 BCE**
```text
A round clay tablet at the exact center covered in rows of abstract wedge-shaped impressions (not letters, not readable), a reed stylus beside it, a cylinder seal and clay tokens, warm clay brown and cream, a close specimen-plate view on a plain paper ground.
```

**B18 · Pyramids and Indus cities · c. 2600 BCE**
```text
A wide landscape divided softly down the middle by a large round sun disc at the exact center: on the left, smooth-sided Egyptian pyramids beside the Nile with reed boats; on the right, a gridded fired-brick city of the Indus valley with a great bathing tank and a river, sandstone yellow and lapis blue washes, hand-colored lithograph.
```
Check: Indus city is fired brick, gridded streets, no domes or later Indian temple styles.

**B19 · The age of thinkers · c. 500 BCE**
```text
A glowing round clay oil lamp at the exact center on a table among unrolled scrolls, in the dim background three softly drawn settings fading into one another: Greek stone columns, a Persian winged-relief gateway, and a quiet forest grove with a seated figure seen from behind, lapis blue, ivory and warm lamp gold, no readable writing on the scrolls.
```

**B20 · Silk Road empires · c. 100 BCE**
```text
A single round ancient coin at the exact center, a hand-colored map of Eurasia behind it with a thin dotted caravan route linking a Roman-style city on the left to a Han-dynasty-style city on the right, camels and bales of silk in the foreground, oxblood red, gold and sand palette, no readable lettering on the coin or map.
```

**B21 · The fall of Western Rome · 476 CE**
```text
A cracked round bronze shield at the exact center lying among fallen marble columns and an overgrown forum, distant smoke on the horizon, small figures of travelers leaving, cold ash-grey and weathered marble tones, melancholic autumn light.
```

**B22 · House of Wisdom · c. 830 CE**
```text
A brass astrolabe at the exact center on a desk covered in manuscripts, geometric-patterned arches and a domed library behind, scholars seen from behind studying a celestial globe, turquoise tilework and gold-leaf accents, abstract geometric patterns only, no script and no calligraphy.
```

**B23 · The Mongol empire · 1206 to 1260**
```text
A round felt yurt seen from slightly above at the exact center of a vast steppe, riders on small sturdy horses crossing the far plain in a long thin line, horsehair standards fluttering, a low vast sky, steppe green-gold and storm grey.
```

**B24 · The Black Death · 1347**
```text
A single large bronze bell hanging at the exact center of an empty medieval town square, narrow timber-framed houses with shuttered windows, an abandoned cart in the road, a few rats on the cobblestones, heavy charcoal and sickly olive palette, quiet and solemn, no bodies, no gore.
```

**B35 · Mali, the Aztec and the Inca · c. 1325 to 1450**
```text
Concentric circular stone farming terraces seen from directly above at the exact center, stepped rings of green fields descending into a round hollow among high mountains, at one far edge a camel caravan carrying gold crosses pale desert dunes, at the other far edge a lake city on causeways glimpsed through mist, as if three distant worlds share one map plate, terrace green, ochre and gold, no faces, no readable text.
```
Note: plays between B24 and B25 (the id is out of sequence because it was added later). Three regions on one plate, like B18.

**B25 · The printing press · c. 1450**
```text
A wooden screw press viewed from the front at the exact center, its round screw and platen prominent, trays of metal type and a freshly printed sheet being lifted, a workshop with beams and a window of warm light, sepia ink tones, the printed page showing only blurred abstract lines, no readable text.
```

**B26 · The oceans open · 1492 to 1498**
```text
A large hand-colored compass rose at the exact center over an old nautical chart, wooden caravel and carrack sailing ships on a deep blue sea, coastlines of Europe and Africa with a blank western ocean, ocean blue, parchment and vermilion accents, no lettering on the chart.
```

**B27 · The scientific revolution · 1543 to 1687**
```text
A radiant sun at the exact center of concentric orbit rings with small planets, a brass telescope and a glass prism splitting a beam of light at the edge, an apple branch in a corner, fine engraved parchment-and-indigo scientific plate, no labels.
```

**B28 · Revolutions · 1776 to 1789**
```text
A round ribbon cockade rosette at the exact center, behind it a crowd of silhouetted figures gathered in a city square with a stone fortress tower being torn down, plain red and blue cloth banners with no emblems, deep red and slate blue, dawn smoke, dramatic but not violent.
```

**B29 · The Industrial Revolution · c. 1760 to 1840**
```text
A massive cast-iron flywheel at the exact center of a steam-powered mill, belts and gears around it, brick chimneys smoking on the horizon, rail tracks leading into the distance, workers as small silhouettes, soot grey, steel blue and a furnace-orange accent, engraved industrial plate.
```

**B30 · The World Wars · 1914 to 1945**
```text
A stopped silver pocket watch at the exact center half-buried in churned mud, a barren landscape of shell craters and bare tree stumps fading into smoke, a single red poppy beside the watch, muted smoke grey and olive palette, solemn, no soldiers, no weapons in close-up, no symbols, no flags, no gore.
```

**B31 · Independence and decolonization · 1947**
```text
A traditional Indian charkha at the exact center in front of a rising sun: a small hand-operated cotton spinning wheel sitting low on the ground on a long flat wooden base, its wheel made of thin wooden spokes laced together with string, a small wooden crank handle at the hub, a single fine white cotton thread running from the wheel to a slender horizontal spindle at the far end of the base, a little heap of raw cotton beside it. Behind it, a hand-drawn outline of the Indian subcontinent with new borders. Silhouettes of crowds holding plain cloth banners, saffron, ivory and deep green dawn washes, hopeful and quiet, no readable text, no violence.
```
Note: 1947 anchors the beat on India. Later, broaden to the wider decolonization wave (for example Africa in the late 1950s and 1960s) in the caption.

**B32 · The space age · 1969**
```text
A full moon disc at the exact center with a tiny lunar module silhouette on its lit edge and a small blue-and-white Earth far off to one side, deep night-blue sky with engraved stipple stars, matte archival print texture, no flags, no faces.
```

**B33 · The internet · 1990s**
```text
A glass globe at the exact center filled with fine glowing lines connecting tiny points of light across the continents, on an old wooden desk beside an antique telegraph key, deep blue with a restrained cyan glow, drawn in the same engraved plate style, no screens, no readable content.
```

### Act III: Now

**B34 · Now · 2026**
```text
A completely empty circular cartouche at the exact center of a plain warm paper field, a thin hand-drawn ink ring with faint decorative flourishes around its edge, nothing inside it, faint foxing at the corners, quiet and open: an invitation, not a scene.
```
This beat is mostly CSS. The ring becomes the composer, and the atmosphere settles to Paper (#FAF7F2).

---

## 6. Workflow and QA

### Workflow

1. Generate **B01 first**. If your tool supports a style reference or seed lock, reuse it for the rest at a **low** strength, so palettes stay free to change per beat.
2. 3 to 4 variants per beat, same model and settings. Pick the one with the cleanest center anchor.
3. Keep a manifest: beat id, full prompt, model and version, seed, date, chosen file, and the tool's usage-terms note.
4. Post-process: one shared grain and tone pass, 9:16 crop check, export AVIF or WebP at two widths.

### QA checklist (every plate)

- [ ] No letters, numerals or pseudo-writing anywhere (except intentionally abstract wedge marks).
- [ ] The anchor sits at the exact center and has roughly the size of its neighbors' anchors.
- [ ] The left third is calm (the caption card sits there on desktop).
- [ ] The palette matches the beat's tint.
- [ ] No anachronisms: check the notes under each beat, and anything modern in ancient scenes.
- [ ] No faces, no flags, no extremist or hate symbols, no gore.
- [ ] A center 9:16 crop still reads.

### Pairwise crossfade test (every adjacent pair)

Overlay the two plates at 50%. The anchors should line up so the blend reads as one object turning into the next. If it doesn't, regenerate the weaker plate with a tighter anchor instruction.

---

## 7. Labelling and rights

- Credit all plates as **"AI-generated illustration"** and add an attributions page.
- Check your image generator's terms for commercial use. The copyright status of AI-generated images also varies by jurisdiction, so keep your prompts and generation records.
- Never present a plate as a real artifact or photograph. For recorded-history beats (Act II), plan to swap in real public-domain material (maps, manuscripts, engravings) where you can find it. Check each source's license.

---

## 8. Appendix: video transition pass (later, optional)

Only after the stills version feels right. Use **approved stills as the start and end frame** of short clips, so continuity is guaranteed.

**Candidate transitions (about 6 to 8):**
- 5 → 6 → 7 → 8 → 9: cell to complex cell to shell to fern to tree rings (the "amoeba to tree" chain)
- 10 → 11: the dinosaur roar into the meteor fall
- 1 → 2: point of light to first star
- 33 → 34: the globe emptying into the blank ring

**Template prompt for a transition clip:**
```text
Slow, seamless morph from the first frame to the last frame. The camera is locked and does not move. The central object at the exact center transforms smoothly from [anchor A] into [anchor B], everything around it dissolving and reforming with it. No cuts, no text, no new characters, same palette and same antique-plate look throughout. 4 seconds.
```

**Notes:**
- Check whether your video model supports first-and-last-frame control. Support varies by model.
- Keep clips short, muted and lazy-loaded. Play on entering view or scrub on scroll, and limit scrubbed clips to the few hero moments (frame extraction gets heavy fast).
- Test mobile decode and total weight before adding more.

---

## Addendum (18 Oct 2026): Act I cinematic set, made with Nano Banana

The owner made three deep-time images with Nano Banana (Gemini app): the point of light, the galaxy and the young Sun. They are much stronger than the FLUX plates and chain well. A test zooms into each centre and grows the next out of a soft circle (`docs/landing-screens/nano-banana-test/`).

Their look is cinematic space art, not the engraved archive style above. That's fine for Act I only: the white-out between the acts already separates deep time from the drawn history plates. So Act I goes cinematic all the way down to Earth's clouds, and Act II stays as it is.

| Level | Beat | Image | Status |
|---|---|---|---|
| 0 | B01 · The Big Bang | point of light with violet rings | have it (`3.webp`) |
| 1 | B02 · First stars | spiral galaxy, golden core | have it (`2.webp`) |
| 2 | B03 · Sun and planets form | young Sun in its dust disc | have it (`1.webp`) |
| 3 | B04 · Earth and the Moon | molten young Earth, Moon-forming impact | **prompt below** |
| 4 | (into the white-out) | storm-cloud spiral over a young ocean | **prompt below** |

**How the chain works:** each level appears inside the centre of the one before, so the next subject must sit at the exact centre. It should be round and bright, so the cut matches on the glow: point → galaxy core → Sun → molten Earth → cloud eye.

**Export:** use the largest size Nano Banana offers (2K or 4K). The zoom goes 3× into the centre, so the centre needs the pixels.

**The corner mark:** the app adds a sparkle in the bottom-right corner. The prep script crops 12% evenly around the centre, which removes it. The footer already says "Illustrations are AI-generated".

**Style line** (start each prompt with it, so the five match):

```text
Cinematic space art, the same look as the previous images in this series: deep black space, warm golden light at the centre, soft volumetric glow, fine drifting dust and small rocks catching the light, gentle radial motion blur toward the edges, rich but natural colour. 16:9, the subject at the exact centre of the frame, filling the frame edge to edge. No text, no border, no frame, no logo.
```

**Level 3 · B04 · Earth and the Moon, 4.5 billion years ago**

```text
[style line] A young, still-molten Earth seen whole at the exact centre: a glowing sphere about a third of the frame's height, cracked black crust over rivers of orange lava. A smaller rocky planet, about half its size, strikes its upper-left edge in a burst of white-hot spray. A thin ring of glowing debris has begun to orbit. Its glow matches the young Sun of the previous image, so a dissolve from one to the other reads as one round light becoming a planet.
```

**Level 4 · into the white-out, about 4 billion years ago**

```text
[style line] Looking straight down at the young Earth from just above the clouds: a huge spiral of white storm clouds, its calm eye at the exact centre. Through gaps, a dark early ocean and a few small volcanic islands with faint orange glow. Bright, soft daylight from above, so the frame is mostly white and pale blue at the centre and darker toward the edges, ready to dissolve into a white screen.
```

**After generating:**
1. Save the files as `image_gen/out/nano/{level}.webp`.
2. Check the chain by eye: `.venv/bin/python nano_chain.py out/nano/0.webp … out/nano/4.webp -o out/nano/chain.mp4` (from `image_gen/`).
3. Swap them in for Z0 to Z4.

Keep Act II's drawn plates.
