// The seven block types and their fields (mirrors lib/contracts/blocks.ts).
export const BLOCKS = `BLOCK COMMON FIELDS
id: "b" + integer, unique and increasing (never reuse; use next_block_id from context).
type, title (max 80 chars), because (max 80 chars: why this block exists, tied to the
learner's ask). Every block has all four, callouts included.
Every "confidence" field is exactly "E", "L" or "C" (never words like "high").
Years are plain integers: -218 for 218 BCE; never strings or ranges.
Short fields: node label max 60 chars, edge why max 160, timeline event label max 50,
importance 1, 2 or 3.

BLOCK TYPES (use only these; if none fit, use "article")
1. article: {"sections":[{"h":"","md":"","depth":"brief|standard|deep"}]}
   - Tag each factual claim right after it with [E] established, [L] likely, [C]
     contested.
   - Mark entities as [[Name|person|place|event|term]].
   - First section is "brief" (the 3-sentence version). Then "standard" sections for
     why it happened and what it caused. Add "deep" sections only when asked.
   - An add carries ONLY the brief section. Send every other section as its own patch
     on the same id: {"op":"patch","id":"bN","set":{"sections":[{one section}]}}.
     Patches merge by heading (same heading replaces, new heading appends).
2. cause_graph: {"nodes":[{"id","label","layer","when","t_offset","confidence"}],
   "edges":[{"from","to","confidence","why"}]}
   - layer: structural | enabling | trigger | contingency | event | consequence.
   - Exactly one node has layer "event" (the subject). Causes carry "when" (year);
     consequences carry "t_offset" (years after the event) and when=null.
   - 6 to 10 nodes for level "new"; up to 16 for "advanced". Every edge has a ONE
     sentence "why".
3. timeline: {"range":{"from","to"},"tracks":[{"id","label"}],
   "events":[{"id","track","start","end","label","importance","confidence"}]}
   - Integers; BCE is negative; there is no year 0.
   - Use parallel tracks (regions or sides) when simultaneity matters.
4. lineage: {"people":[{"id","name","gen","start","end","approx","key_events":[]}],
   gen is the generation as a number: 1 for the earliest generation shown, 2 for their children.
   "links":[{"from","to","rel","confidence"}]}
   - rel: parent | spouse | succeeded | claimed.
   - This is an approximate map of who ruled or led and how they connect. Succession
     order matters more than family detail. Tag uncertain links [L] or [C]. A person
     may be reachable by more than one path.
5. predict_gate: {"prompt","options":[{"id","label"}],"answer_id","explanation","reveals"}
   - Use before a real turning point or consequence; "reveals" is the id of the block
     that follows. Options must be plausible, never silly. Max one per turn.
6. quiz: {"items":[...]}   Item kinds:
   - {"kind":"mcq","id","stem","options":[{"id","text"}],"answer_id","why","source_ref"}
   - {"kind":"chronology","id","stem","events":[{"id","label","year"}],"source_ref"}
     3 to 5 events with integer years; the UI shuffles and checks the order.
   - {"kind":"match","id","stem","pairs":[{"left","right"}],"explain","source_ref"}
   - source_ref: {"block":"<block id>","node":"<node id or null>"}.
   Prefer relation questions (what led to what, what did X cause) over date recall.
7. callout: {"kind":"anchor|mnemonic|debate|meanwhile|terms","md":""}
   - anchor: a relative-time hook ("about two generations after X"), not a raw date.
   - meanwhile: what was happening elsewhere at the same time.
   - debate: one live disagreement among historians, in two sentences.
   - terms: exam lessons only. A markdown list, one term per line: "**Chauth**: a levy of a
     quarter of the revenue [E][S2]".`;
