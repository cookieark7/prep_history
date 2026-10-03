# Chronicle v0 Build Pack

A history learning workspace: you say what you want to understand, and the lesson appears as an interactive **Stage** (reading, cause graphs, timelines, lineage, predictions, quizzes) next to a short conversation.

This version is deliberately simple:

- **General history learning.** No exam focus. UPSC and other exams can come later as a layer on top.
- **Focus: UI/UX, system prompts, and the LLM layer.** Evals, guardrails, fact-checking, caching, auth and a database are parked until the product exists and feels good.
- **Small vocabulary:** 7 block types, 4 modes, 5 operations. That fence is what keeps "dynamic" from turning into a rewrite every week.

## How to use this file

| Part | Paste into | When |
|---|---|---|
| 1. Product | Read once | Now |
| 2. Architecture | Coding agent as context | Now |
| 3. Contracts | Coding agent | M0 |
| 4. Director prompt | A plain Claude chat first, then the backend | M1 |
| 5. Backend prompt | Coding agent | M2 |
| 6. Frontend prompt | Coding agent | M3 to M6 |
| 7. UX/UI prompt | Design tool | In parallel with M2 |
| 8. Milestones | Your checklist | Always |

**One rule:** do not start the next milestone until the current one works. Nothing new gets added before M6.

---

# Part 1: Product

## Problem

History is usually taught as a pile of dates and names. People forget them, and never see the structure underneath: **what happened, when, why, how, and what it led to.** Chronicle shows that structure and lets you interact with it, so you reason with history instead of memorizing it.

## Principles

1. **The event is the atom.** A lesson is built from events: when, where, who, why, how, what next. Dates and names are attributes, not the lesson.
2. **Causation is the main axis.** Every view answers "what caused this?" and "what did this cause?"
3. **Time is always visible.** You always know where in history you are.
4. **Chat is a remote control; the Stage is the lesson.** Replies are one or two sentences. Content lives in blocks.
5. **Interactive beats readable.** Predict before reveal, trace causes back, ripple consequences forward, test yourself on relations.
6. **Confidence is visible.** Claims are tagged established, likely or contested. This is a UX feature as much as a content one: history has real debates and the interface should show them.
7. **Calm and archival, not gamified.** No streaks, confetti or badges.

## What v0 is and is not

| In v0 | Not in v0 (parked) |
|---|---|
| Topic input, chat dock, Stage | Exam modes (UPSC and others) |
| Blocks: article, cause graph, timeline, lineage, predict gate, quiz, callout | Fact-checking and verification layers |
| Canvas mode for the cause graph | Evals, guardrails, red-teaming |
| Fullscreen focus mode and quizzes | Caching, database, auth, accounts |
| Client-side depth toggle (brief / standard / deep) | Mains-style answer grading |
| Notes (nice to have), lesson history with undo | Other subjects, sharing, payments |
| localStorage persistence | Spaced repetition scheduling |

## One test of success

Show it to 3 people who want to learn a history topic. Ask them to learn one topic in Chronicle and one in plain Claude chat. If they do not prefer the Stage within a couple of minutes, find out why before adding anything.

---

# Part 2: Architecture

```text
Browser (Next.js)                                  Server (one route handler)
-----------------                                  --------------------------
Composer / chips / UI events                       POST /api/turn
        |                                                 |
        v                                                 v
 Turn request  ------------------------------->   validate request (zod)
 { message | event, workspace summary, level }            |
        ^                                                 v
        |                                          [static system prompt]
 stream of JSON lines  <---------------------      + [small dynamic context]
 {t:"say"} {t:"op"} {t:"followup"} {t:"done"}             |
        |                                                 v
        v                                          LLM stream -> object parser
 line parser -> zod validate -> ops reducer        -> zod validate each object
        |                                          -> forward valid lines only
        v
 Zustand store (blocks, history, notes, mastery)
        |
        v
 Block renderers on the Stage
```

## Stack (boring on purpose)

- **Next.js** (App Router) + **TypeScript strict**. One repo, one deploy.
- **Zustand + immer** for state, persisted to localStorage.
- **Zod** for contracts, shared by client and server.
- **Anthropic SDK** for the LLM. Model name comes from the env var `CHRONICLE_MODEL`.
- **@xyflow/react** for the cause-graph canvas, with **roughjs** for hand-drawn strokes.
- **d3-scale + d3-zoom** for the timeline (custom SVG).
- **react-markdown** for article text, with a small plugin for confidence tags and entity links.
- **Tailwind** with CSS-variable design tokens (themes: paper, sepia, ink). **Radix** primitives for popovers and dialogs.

## Folder structure

```text
/app
  /page.tsx                    home / empty state
  /study/page.tsx              workspace
  /api/turn/route.ts           streaming endpoint
/lib
  /contracts                   zod schemas (single source of truth)
  /director                    system-prompt.ts, context.ts, stream-parser.ts
  /store                       workspace.ts, reducer.ts
  /layout                      cause-graph-layout.ts, timeline-scale.ts
  /fixtures                    hand-written director outputs (mock mode)
/components
  /stage /blocks /chat /canvas /quiz /notes /ui
```

## Protocol: a stream of JSON lines

The Director emits **one complete JSON object per line**, four kinds:

```text
{"t":"say","text":"..."}                          once, first
{"t":"op","op":{...}}                             zero or more
{"t":"followup","kind":"deeper","label":"..."}    up to 3
{"t":"done"}                                      last
```

Why: with one big JSON object nothing renders until everything is valid. With lines, each block lands on the Stage as soon as it is generated, and one bad block does not break the others.

---

# Part 3: Contracts (paste into the coding agent at M0)

```ts
// /lib/contracts/common.ts
import { z } from "zod";

export const Confidence = z.enum(["E", "L", "C"]); // established, likely, contested
export const Layer = z.enum([
  "structural", "enabling", "trigger", "contingency", "event", "consequence",
]);
export const Depth = z.enum(["brief", "standard", "deep"]);
// Years are integers. BCE is negative. There is no year zero (1 BCE = -1, 1 CE = 1).
```

```ts
// /lib/contracts/blocks.ts
import { z } from "zod";
import { Confidence, Layer, Depth } from "./common";

const Common = {
  id: z.string().regex(/^b\d+$/),
  title: z.string().max(80),
  because: z.string().max(80),     // why this block exists, tied to what the learner asked
};

export const ArticleBlock = z.object({
  ...Common, type: z.literal("article"),
  sections: z.array(z.object({
    h: z.string(),
    md: z.string(),                // claims tagged [E]/[L]/[C]; entities as [[Name|person|place|event|term]]
    depth: Depth,                  // the client filters by the depth toggle, no LLM call
  })).min(1),
});

export const CauseGraphBlock = z.object({
  ...Common, type: z.literal("cause_graph"),
  nodes: z.array(z.object({
    id: z.string(), label: z.string().max(60), layer: Layer,
    when: z.number().int().nullable(),       // year, for causes and the event
    t_offset: z.number().nullable(),         // years after the event, for consequences
    confidence: Confidence,
  })).min(3).max(16),
  edges: z.array(z.object({
    from: z.string(), to: z.string(), confidence: Confidence,
    why: z.string().max(160),                // ONE sentence explaining the link
  })),
});

export const TimelineBlock = z.object({
  ...Common, type: z.literal("timeline"),
  range: z.object({ from: z.number().int(), to: z.number().int() }),
  tracks: z.array(z.object({ id: z.string(), label: z.string() })).min(1).max(5),
  events: z.array(z.object({
    id: z.string(), track: z.string(), start: z.number().int(),
    end: z.number().int().nullable(), label: z.string().max(50),
    importance: z.number().int().min(1).max(3), confidence: Confidence,
  })).max(30),
});

// Approximate by design. Succession order matters more than family detail.
export const LineageBlock = z.object({
  ...Common, type: z.literal("lineage"),
  people: z.array(z.object({
    id: z.string(), name: z.string(), gen: z.number().int().min(1).max(8),
    start: z.number().int().nullable(), end: z.number().int().nullable(),  // reign or lifespan, years
    approx: z.boolean(),
    key_events: z.array(z.string()).max(3),                                  // short labels
  })).min(2).max(16),
  links: z.array(z.object({
    from: z.string(), to: z.string(),
    rel: z.enum(["parent", "spouse", "succeeded", "claimed"]),
    confidence: Confidence,
  })),
});

export const PredictGateBlock = z.object({
  ...Common, type: z.literal("predict_gate"),
  prompt: z.string(),
  options: z.array(z.object({ id: z.string(), label: z.string() })).min(3).max(5),
  answer_id: z.string(),
  explanation: z.string(),
  reveals: z.string(),             // id of the block that stays blurred until answered or skipped
});

// The UI derives chronology correctness from years; mcq carries its own answer.
export const QuizBlock = z.object({
  ...Common, type: z.literal("quiz"),
  items: z.array(z.discriminatedUnion("kind", [
    z.object({
      kind: z.literal("mcq"), id: z.string(), stem: z.string(),
      options: z.array(z.object({ id: z.string(), text: z.string() })).min(3).max(5),
      answer_id: z.string(), why: z.string(),
      source_ref: z.object({ block: z.string(), node: z.string().nullable() }),
    }),
    z.object({
      kind: z.literal("chronology"), id: z.string(), stem: z.string(),
      events: z.array(z.object({ id: z.string(), label: z.string(), year: z.number().int() })).min(3).max(5),
      source_ref: z.object({ block: z.string(), node: z.string().nullable() }),
    }),
    z.object({
      kind: z.literal("match"), id: z.string(), stem: z.string(),
      pairs: z.array(z.object({ left: z.string(), right: z.string() })).min(3).max(5),
      explain: z.string(),
      source_ref: z.object({ block: z.string(), node: z.string().nullable() }),
    }),
  ])).min(1).max(6),
});

export const CalloutBlock = z.object({
  ...Common, type: z.literal("callout"),
  kind: z.enum(["anchor", "mnemonic", "debate", "meanwhile"]),
  md: z.string(),
});

export const Block = z.discriminatedUnion("type", [
  ArticleBlock, CauseGraphBlock, TimelineBlock, LineageBlock,
  PredictGateBlock, QuizBlock, CalloutBlock,
]);
export type Block = z.infer<typeof Block>;
```

```ts
// /lib/contracts/ops.ts
import { z } from "zod";
import { Block } from "./blocks";

export const Op = z.discriminatedUnion("op", [
  z.object({ op: z.literal("add"), after: z.string().nullable(), block: Block }),
  z.object({ op: z.literal("patch"), id: z.string(), set: z.record(z.unknown()) }), // re-validated after merge
  z.object({ op: z.literal("remove"), id: z.string() }),
  z.object({ op: z.literal("layout"), mode: z.enum(["reader", "canvas", "timeline", "focus"]) }),
  z.object({ op: z.literal("focus"), id: z.string(), fullscreen: z.boolean() }),
]);

export const StreamLine = z.discriminatedUnion("t", [
  z.object({ t: z.literal("say"), text: z.string().max(280) }),
  z.object({ t: z.literal("op"), op: Op }),
  z.object({ t: z.literal("followup"), kind: z.enum(["deeper", "test", "zoom_out"]), label: z.string().max(60) }),
  z.object({ t: z.literal("done") }),
]);

// Events the UI sends back to the Director
export const UiEvent = z.discriminatedUnion("event", [
  z.object({ event: z.literal("ask_why"), block_id: z.string(), selection: z.string() }),
  z.object({ event: z.literal("expand_node"), block_id: z.string(), node_id: z.string(), label: z.string() }),
  z.object({ event: z.literal("predict_answer"), block_id: z.string(), answer_id: z.string(), correct: z.boolean() }),
  z.object({ event: z.literal("quiz_result"), ref: z.string(), correct: z.boolean() }),
  z.object({ event: z.literal("note_created"), block_id: z.string(), kind: z.enum(["remember", "question", "disagree"]), text: z.string(), quote: z.string() }),
]);

export const TurnRequest = z.object({
  message: z.string().max(1000).nullable(),
  event: UiEvent.nullable(),
  workspace: z.object({
    blocks: z.array(z.object({ id: z.string(), type: z.string(), title: z.string() })),
    level: z.enum(["new", "some", "advanced"]),
    mastery: z.array(z.object({ ref: z.string(), strength: z.number().min(0).max(1) })).max(20),
  }),
});
```

---

# Part 4: Director system prompt (paste as the system prompt)

Test it in a plain Claude chat at M1, before any code exists.

```text
You are the Director of Chronicle, a workspace for learning history. A learner talks to
you; you respond by operating on a Stage of structured blocks. You are not a chatbot.
Chat carries at most two sentences. Lessons live in blocks.

PURPOSE
Help the learner REASON about history: what happened, when, why, how, and what it led
to. Dates and names are attributes of events, not the lesson. Show structure: causes,
consequences, order in time, who succeeded whom.

OUTPUT PROTOCOL (strict)
Emit a stream of JSON objects, ONE COMPLETE OBJECT PER LINE, no line breaks inside an
object, no markdown fences, no text outside JSON. In this order:
1. {"t":"say","text":"..."}                      exactly once, first. Max 2 sentences.
2. {"t":"op","op":{...}}                         zero or more.
3. {"t":"followup","kind":"deeper|test|zoom_out","label":"..."}   max 3.
4. {"t":"done"}                                  exactly once, last.
Put the most important block first so it renders first.

OPERATIONS
{"op":"add","after":"<block_id or null>","block":{...}}
{"op":"patch","id":"<block_id>","set":{...changed fields only...}}
{"op":"remove","id":"<block_id>"}
{"op":"layout","mode":"reader|canvas|timeline|focus"}
{"op":"focus","id":"<block_id>","fullscreen":true|false}

BLOCK COMMON FIELDS
id: "b" + integer, unique and increasing (never reuse; use next_block_id from context).
type, title (max 80 chars), because (max 80 chars: why this block exists, tied to the
learner's ask).

BLOCK TYPES (use only these; if none fit, use "article")
1. article: {"sections":[{"h":"","md":"","depth":"brief|standard|deep"}]}
   - Tag each factual claim right after it with [E] established, [L] likely, [C]
     contested.
   - Mark entities as [[Name|person|place|event|term]].
   - First section is "brief" (the 3-sentence version). Then "standard" sections for
     why it happened and what it caused. Add "deep" sections only when asked.
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
7. callout: {"kind":"anchor|mnemonic|debate|meanwhile","md":""}
   - anchor: a relative-time hook ("about two generations after X"), not a raw date.
   - meanwhile: what was happening elsewhere at the same time.
   - debate: one live disagreement among historians, in two sentences.

WHAT YOU RECEIVE EACH TURN
A <context> block (learner level, blocks on the stage as id/type/title, next_block_id,
lowest mastery refs) and an <input> block (the learner's message or a UI event).
UI events: ask_why, expand_node, predict_answer, quiz_result, note_created.
- ask_why / expand_node: PATCH or ADD next to the referenced block. Do not restart the
  lesson.
- predict_answer: patch the gate's "explanation" with feedback fitted to the learner's
  choice. Do not add another gate.
- quiz_result with incorrect: add one targeted quiz item on the same idea.
- note_created kind "disagree" or "question": address it (often a debate callout) and
  say so in "say".

DECISION RULES
1. "I want to learn / understand X": add in this order: article (brief + standard
   sections), cause_graph, timeline (only if sequence or simultaneity matters),
   predict_gate (only if a real turning point follows). Never more than 4 blocks.
2. "Why did X happen": cause_graph first, then an article only if needed.
3. "Who ruled / what came after / dynasty / family": lineage plus a timeline.
4. "Quiz me": layout focus plus a quiz built from the blocks already on the stage,
   weighted toward low mastery.
5. "Go deeper": patch the existing block (add "deep" sections). Never duplicate.
6. Prefer patch over add. Never re-add content already on the stage.
7. Layout: reader by default; canvas when exploring causes; timeline for sequence;
   focus for quizzes.

HONESTY BASICS
- Never invent dates, names, places or quotes. If unsure of a date, set approx=true or
  tag [L] and say so. If you do not know, say so inside the block.
- If the immediate trigger of an event is not well documented, say so in the trigger
  node and tag it [C]. Do not manufacture a clean story.
- Do not present one cause as THE cause. Use layers. Tag interpretations [C] by default.
- Include at least one live debate per topic (in an article section or a debate callout).

LEVEL
new: short sentences, define terms in a callout, max 8 graph nodes.
some: default.
advanced: up to 16 nodes, historiography, more [C] and counter-views.

CLARIFYING
Ask at most one clarifying question, only if the topic is genuinely ambiguous. Otherwise
choose a sensible scope and state it in "say".

STYLE
Plain, precise, no hype, no emoji, no exclamation marks.
```

## Context template (the dynamic part, built per turn)

The system prompt stays static. Everything that changes goes in the user turn:

```text
<context>
learner_level: {level}
stage_blocks:
- {id} | {type} | {title}
next_block_id: b{n}
lowest_mastery: {ref}: {strength}, ...    (max 5)
</context>

<input>
{learner message: "..."  OR  ui_event: {json}}
</input>
```

Send only id, type and title for blocks already on the stage (keeps tokens flat). For `ask_why` and `expand_node`, also include the selected text or the node label and its edges.

## Calibration sample (what good output looks like; mock-mode fixture)

```text
{"t":"say","text":"I scoped this to the Second Punic War (218-201 BCE), where the outcome was decided. Try the prediction before reading what Rome did after Cannae."}
{"t":"op","op":{"op":"add","after":null,"block":{"id":"b1","type":"article","title":"Why Rome beat Carthage","because":"You asked why Rome beat Carthage","sections":[{"h":"The short version","depth":"brief","md":"Rome won the Second Punic War (218-201 BCE) [E] by refusing to lose a long war of attrition, even after [[Cannae|event]] (216 BCE) destroyed a Roman army [E]. Carthage won famous battles but could not break Rome's network of Italian allies [L]."},{"h":"Why it started","depth":"standard","md":"The first war left Carthage with an indemnity and without Sicily [E]. Rome then took Sardinia and Corsica in 238 BCE, which some historians see as opportunistic and a lasting grievance [C]. The immediate trigger was the siege of [[Saguntum|place]] by [[Hannibal|person]] in 219 BCE [E]."},{"h":"What it led to","depth":"standard","md":"Carthage lost its overseas empire and effective navy [E]. Rome became the dominant power of the western Mediterranean [E], and a Third Punic War ended with the destruction of Carthage in 146 BCE [E]."}]}}}
{"t":"op","op":{"op":"add","after":"b1","block":{"id":"b2","type":"cause_graph","title":"Causes and consequences: Second Punic War","because":"You asked why Rome beat Carthage","nodes":[{"id":"n1","label":"First Punic War weakens Carthage","layer":"structural","when":-241,"t_offset":null,"confidence":"E"},{"id":"n2","label":"Barcid expansion in Iberia","layer":"enabling","when":-237,"t_offset":null,"confidence":"E"},{"id":"n3","label":"Rome seizes Sardinia and Corsica","layer":"enabling","when":-238,"t_offset":null,"confidence":"C"},{"id":"n4","label":"Siege of Saguntum","layer":"trigger","when":-219,"t_offset":null,"confidence":"E"},{"id":"n5","label":"Second Punic War","layer":"event","when":-218,"t_offset":null,"confidence":"E"},{"id":"n6","label":"Italian allies mostly stay loyal after Cannae","layer":"contingency","when":-216,"t_offset":null,"confidence":"L"},{"id":"n7","label":"Rome dominates the western Mediterranean","layer":"consequence","when":null,"t_offset":17,"confidence":"E"},{"id":"n8","label":"Third Punic War and destruction of Carthage","layer":"consequence","when":null,"t_offset":72,"confidence":"E"}],"edges":[{"from":"n1","to":"n2","confidence":"L","why":"Carthage looked to Iberia for resources and manpower after losing Sicily."},{"from":"n3","to":"n5","confidence":"C","why":"How much this grievance drove Carthage to war is debated."},{"from":"n2","to":"n4","confidence":"E","why":"Hannibal's Iberian base brought him against Saguntum."},{"from":"n4","to":"n5","confidence":"E","why":"Rome treated the siege as grounds for war."},{"from":"n6","to":"n7","confidence":"L","why":"Rome could keep replacing its losses."},{"from":"n5","to":"n7","confidence":"E","why":"Victory stripped Carthage of its empire and navy."},{"from":"n7","to":"n8","confidence":"L","why":"Roman distrust of Carthage persisted for decades."}]}}}
{"t":"op","op":{"op":"add","after":"b2","block":{"id":"b3","type":"predict_gate","title":"Predict before you read on","because":"The next block shows Rome's response to Cannae","prompt":"After the disaster at Cannae (216 BCE), what does Rome do?","options":[{"id":"a","label":"Seek peace terms"},{"id":"b","label":"Avoid another set-piece battle and keep raising armies"},{"id":"c","label":"Invade Africa immediately"},{"id":"d","label":"Not sure"}],"answer_id":"b","explanation":"Rome kept raising armies and avoided another pitched disaster; the invasion of Africa came more than a decade later.","reveals":"b4"}}}
{"t":"op","op":{"op":"add","after":"b3","block":{"id":"b4","type":"article","title":"After Cannae","because":"This is what you just predicted","sections":[{"h":"Rome's response","depth":"brief","md":"Rome avoided another set-piece disaster and kept fielding armies [E]. [[Fabius|person]]'s delaying strategy denied Hannibal a decisive battle [E]. [[Scipio|person]] later took the war to Africa (204 BCE) [E], forcing Hannibal home before [[Zama|event]] (202 BCE) [E]."}]}}}
{"t":"followup","kind":"deeper","label":"Why did the allies stay loyal?"}
{"t":"followup","kind":"test","label":"Test me on this"}
{"t":"followup","kind":"zoom_out","label":"Show all three Punic Wars"}
{"t":"done"}
```

---

# Part 5: Backend prompt (paste into your coding agent at M2)

```text
Build the backend for Chronicle v0 in the existing Next.js (App Router, TypeScript
strict) project. No database, no auth. All lesson state lives on the client; the server
is a thin streaming proxy to the LLM that validates what it forwards.

YOU ALREADY HAVE
- /lib/contracts/* (zod schemas), /lib/director/system-prompt.ts exporting
  DIRECTOR_SYSTEM_PROMPT, and /lib/fixtures/*.ndjson (hand-written Director outputs).

BUILD
1. POST /app/api/turn/route.ts
   - runtime nodejs; response Content-Type application/x-ndjson, streamed, no-store.
   - Parse the body with TurnRequest; on failure return 400 JSON.
   - MOCK_LLM=1: stream a fixture (match by simple keyword on the message; default to
     the Second Punic War sample) one line at a time with ~150ms between lines. No
     network call.
   - Otherwise call the Anthropic SDK messages.stream with
       model: process.env.CHRONICLE_MODEL, max_tokens 6000, temperature 0.3,
       system: [{type:"text", text: DIRECTOR_SYSTEM_PROMPT, cache_control:{type:"ephemeral"}}],
       messages: [{role:"user", content: buildContext(request)}].
2. /lib/director/context.ts: buildContext(req) implements the context template. Compute
   next_block_id as max numeric block id + 1. Only id/type/title for existing blocks.
3. /lib/director/stream-parser.ts: incremental extractor that takes text deltas and
   yields complete top-level JSON objects. Brace-depth based and string-aware (braces
   inside strings, escaped quotes), ignores whitespace and any text outside objects
   (including stray code fences), never throws. Unit tests: pretty-printed objects,
   objects split across arbitrary chunk boundaries, braces inside strings, fenced
   output.
4. Validation per object: JSON.parse -> StreamLine.safeParse. Plus three light checks
   for "add" ops so the UI never receives something it cannot draw:
   - cause_graph: exactly one node with layer "event"; every edge references existing
     node ids.
   - timeline: every event.track exists in tracks; no year 0.
   - predict_gate: answer_id is one of the options.
   Valid lines are forwarded immediately. Invalid lines are dropped and printed to the
   server console with the reason.
5. Always end the response with {"t":"done"}, even on error. If the client disconnects,
   abort the upstream call. If the LLM call fails, forward a "say" line
   ("Something went wrong. Please try again.") and "done".
6. Env: ANTHROPIC_API_KEY, CHRONICLE_MODEL, MOCK_LLM. Fail fast if the key is missing
   and MOCK_LLM is not set.

DO NOT BUILD: auth, database, caching, rate limiting, repair loops, analytics.

ACCEPTANCE
- curl -N -X POST localhost:3000/api/turn -d '<valid request>' streams valid NDJSON
  ending in {"t":"done"} in mock mode and in real mode.
- A fixture with a graph edge pointing at a missing node: that line is dropped, the
  others are forwarded, and the console says why.
- Parser tests pass.
```

---

# Part 6: Frontend prompt (paste into your coding agent at M3, extend through M6)

```text
Build the Chronicle v0 frontend in the existing Next.js project. Read /lib/contracts/*
first; they are the source of truth. The backend streams NDJSON from POST /api/turn.
Develop against MOCK_LLM=1.

TECH: Zustand + immer, zod, Radix primitives, Tailwind with CSS-variable tokens,
@xyflow/react for the graph canvas, roughjs for hand-drawn strokes, d3-scale + d3-zoom
for the timeline, react-markdown for articles.

STATE (/lib/store/workspace.ts)
{ topic, blocks: Block[], mode: "reader"|"canvas"|"timeline"|"focus", focusId,
  fullscreen, depth: "brief"|"standard"|"deep", level: "new"|"some"|"advanced",
  chat: { id, role, text, landed: string[], followups }[],
  history: { id, label, undo }[], mastery: Record<string, number>, notes: Note[],
  streaming: boolean }
Persist all but `streaming` to localStorage under a versioned key; discard on schema
mismatch rather than crash.

OPS REDUCER (/lib/store/reducer.ts, pure, unit tested)
- add: insert after the given id (or at the end if null). On id collision, rename the new
  block to the next free id and rewrite references added in the same turn
  (reveals, source_ref).
- patch: shallow-merge, re-validate with the Block schema; if invalid, keep the old block
  and note "update skipped" in history. For article.sections, merge by heading (same
  "h" replaces, new "h" appends).
- remove, layout, focus: straightforward.
- Every applied op adds a history entry with a human label and an undo closure.

STREAM CLIENT (/lib/stream-client.ts)
fetch + ReadableStream + TextDecoder, split on newlines, StreamLine.safeParse each;
say -> chat, op -> reducer, followup -> chat, done -> streaming=false. Support abort
(Esc or Stop). If the request fails or the stream ends without "done", show a calm
inline error with Retry. Never lose the existing Stage on error.

LAYOUT (desktop 1440)
Left chat dock 340px (collapsible, Cmd+\), center Stage with a 680px reading column
and a thin time spine on its left edge, optional right margin 280px, top bar that hides
on scroll-down (editable topic, mode switch, depth switch, lesson-history icon).
Mobile: Stage full screen; chat becomes a bottom sheet (collapsed = composer only);
mode switch becomes a bottom tab bar.

CHAT DOCK
Text rows, not bubbles. Learner lines in muted sans, replies in serif (max two
sentences). Under each reply: "landed" chips (one per block added or patched) that
scroll to and briefly highlight the block, then up to 3 follow-up chips. Composer
placeholder "Ask why, pick a period, or paste something you're reading". Cmd+K opens
a command palette (Test me, Change level, Switch theme, Open canvas).

STAGE
Block wrapper with a slim header: type icon, title, confidence summary
("3 established, 2 likely, 1 contested"), provenance line from `because`, menu
(Fullscreen, Pin, Undo). A block appears when it arrives, with a soft ochre edge
highlight that fades in 1.5s (respect prefers-reduced-motion). Unknown block type ->
fallback showing title and raw JSON collapsed (never crash).

BLOCK RENDERERS (registry: type -> component)
- article: filter sections by the depth toggle (client-side). Markdown plugin:
  [E]/[L]/[C] become small mono tags with the confidence dot (click for a small popover
  explaining the three levels); [[Name|type]] becomes a hoverable entity with a preview
  card and an "Ask about this" action that fires ask_why.
- cause_graph: compact preview (260px) plus full Canvas mode. Layout function in
  /lib/layout/cause-graph-layout.ts (deterministic, unit tested):
    x: causes by `when` ascending left of the event node; event node at center;
       consequences to the right by sqrt(t_offset).
    y: lanes by layer top to bottom: structural, enabling, trigger, contingency,
       consequence; event node on the middle line. Stagger within a lane to prevent
       overlaps; never overlap labels.
  Node shape by layer (square, triangle, diamond, open circle, filled circle; the event
  is a larger rounded square). Edges: established solid; likely dashed; contested
  hand-drawn wobbly (roughjs, seeded by edge id so it does not jitter).
  Interactions: click a node -> side card with label, layer, time, and each incident
  edge's one-sentence `why`, plus an "Ask why" button (fires expand_node);
  "Trace back" highlights ancestors; "Ripple forward" animates descendants in t_offset
  order; a "years later" ruler under the consequence cone. Floating toolbar: Select,
  Note, Highlight path, Fit view.
- timeline: horizontal SVG swimlanes with d3-zoom, BCE/CE axis with no year 0, labels
  re-flow by zoom level (hide lower-importance labels instead of overlapping),
  "Simultaneity" toggle drawing a vertical guide across tracks, minimap scrubber. Click
  an event for a small drawer.
- lineage: people in generation rows (gen 1 at top). Succession links are numbered
  arrows; parent = single line; spouse = double line; claimed = dashed hand-drawn line;
  low-confidence links use the confidence line styles. A person reachable by two paths
  shows a subtle "also here" link. Controls: collapse branch, focus mode that dims
  everyone except the path between two selected people. Each person's key_events
  link to matching timeline event labels if present. Show a small "Approximate" tag on
  the block header.
- predict_gate: inline widget; options as tappable rows; the block whose id equals
  `reveals` is blurred (CSS blur + aria-hidden, with a "Skip" link) until answered or
  skipped. After answering show correct/incorrect with `explanation`; fire
  predict_answer only when the learner answers.
- quiz: renders compact in Stage and fully in Focus mode. mcq: standard options.
  chronology: shuffle events (seeded by item id) and let the learner order by drag or
  tap-to-sequence; check against years. match: tap-to-pair. Feedback is calm and
  immediate, always with "See in lesson" that scrolls to source_ref.block and highlights
  source_ref.node. Update mastery[ref] (+0.25 correct, -0.35 incorrect, clamped 0..1)
  and fire quiz_result.
  ALSO build a client-side "Graph quiz" (no LLM): from any cause_graph, generate
  "What led to X?" questions where the correct option is a source node of an incoming
  edge and distractors are unconnected nodes from other layers; and "Order these
  causes" using `when`. Offer it as a "Quiz this graph" button on the canvas.
- callout: styled per kind (anchor, mnemonic, debate, meanwhile) with its own icon and
  left rule, 0-2px radius.

NOTES (build after the above works)
Selecting article text shows a tiny toolbar: Remember (ochre), Question (brick),
Disagree (violet), each with a distinct underline style (solid, dotted, wavy) so color
is never the only signal. Notes anchor by quote + block id, appear in the right margin
aligned to their paragraph, and fire note_created. A slide-over lists all notes.
"Export as Markdown" exports the lesson (articles, graph edges as bullet list, notes).

ACCESSIBILITY
Visible 2px focus ring, full keyboard navigation (j/k between blocks, f fullscreen, Esc
exit, ? shortcuts), 44px touch targets, text scales to 200%, confidence and layers
always carry a shape/icon in addition to color, an aria-live region announces newly
landed blocks.

TESTS: reducer (add/patch/remove, id collision rename, invalid patch rejected), layout
(no overlapping nodes on the sample fixture), stream client (chunked input, missing
done), graph-quiz generation.
```

---

# Part 7: UX/UI prompt (paste into the design tool, in parallel with M2)

Paste this first, then each screen one at a time.

```text
PRODUCT
"Chronicle": a workspace for learning history. The learner types what they want to
understand; structured lesson blocks appear on a Stage beside a short conversation.
It must feel like a calm archive and a thinking tool, NOT a chatbot with a sidebar and
NOT a gamified ed-tech dashboard.

USERS
Curious learners and students (16-35) on laptop and phone, 20-60 minute sessions. Pain:
forgetting dates and names, tangled dynasties, not understanding WHY things happened.
They want depth without clutter.

REFERENCE DNA (borrow the mechanism, not the look)
- Medium: 680px reading measure, serif body 20px/1.7, chrome disappears while reading,
  header hides on scroll-down, hairline progress bar.
- Educative: interactivity inline in the flow (reveals and quizzes between paragraphs).
- Excalidraw: zero-friction canvas, sparse floating toolbar, hand-drawn strokes as a
  deliberate "this is a sketch, a thinking tool" signal.
- Wikipedia: hover preview cards on names and places.
- Stripe Docs: margin notes aligned to the paragraph they annotate.
- Linear / Raycast: Cmd+K palette, keyboard-first.

PRINCIPLES
1 Time is always visible (slim time spine). 2 Why before what. 3 Three depths
(brief / standard / deep) switched instantly. 4 Predict before reveal. 5 Confidence
visible on every claim. 6 Chat is a remote control; the Stage is the lesson.
7 Every AI change is legible and reversible. 8 Calm, editorial, archival.

TYPOGRAPHY
Source Serif 4 (fallback Charter, Georgia) for content: body 20/1.7 desktop, 18/1.65
mobile, H1 40/1.15, H2 26/1.25, H3 20/1.3. Inter 13-14px for UI, sentence case.
JetBrains Mono 12px tabular for dates and confidence tags. Canvas labels only: a
hand-drawn face (Excalifont / Virgil-style, fallback Caveat).

COLOR (themes: Paper default, Sepia, Ink)
Paper: bg #FAF7F2, surface #FFFFFF, text #1F1B16, muted #6B645A, rule #E6DFD3
Sepia: bg #F1E7D3, surface #F7EEDC, text #3B2F20
Ink: bg #14120F, surface #1C1915, text #E9E3D8
One accent: oxblood #8C2F2B, used sparingly (links, focus, primary actions).

CAUSAL LAYERS (always color + shape, never color alone)
Structural #4C6A92 square; Enabling #7A8B5A triangle; Trigger #B5482F diamond;
Contingency #8A6BA8 open circle; Consequence #C08A2B filled circle; Event: a larger
rounded square in the text color.

CONFIDENCE (in text and in graphics)
Established: filled dot, solid line. Likely: half-filled dot, dashed line.
Contested: hollow dot, hand-drawn wobbly line, small "debate" marker.

SHAPE AND MOTION
8px grid. Radii 6px on controls, 0-2px on content blocks. 1px rules instead of shadows
(shadows only on floating layers). Motion 150-200ms ease-out; reveals animate height and
opacity; respect prefers-reduced-motion.

NEVER USE: gradients, glassmorphism, purple/blue SaaS palette, emoji, stock
illustrations, card grids, chat-bubble tails, confetti, streak flames, badges, mascots.

ACCESSIBILITY: visible 2px focus ring, full keyboard navigation, 44px touch targets,
text scales to 200%.

CONTENT: real content only, no lorem ipsum. Sample topic: the Second Punic War
(Hannibal, Fabius, Scipio; Saguntum, Cannae, Zama); secondary sample: the Mughal
succession. Include real confidence tags, one Contested claim, and one honest "this is
debated" note.

OUTPUT: hi-fi, responsive, light and dark; show default, hover, focus, expanded,
loading and empty states. Reusable components, not one-offs.
```

### S1: Home / empty state

```text
Design the Home screen. No hero illustration. One centered line in serif:
"What do you want to understand?" with a large composer below it and the placeholder
"A topic, a question, or paste a paragraph you're reading". Under the composer: a row
of era chips (Ancient, Medieval, Early modern, Modern) that scope the topic, and a
level selector (New to this / Some background / Revising). Below: four example prompts
in serif italics ("Why did Rome beat Carthage?", "How did the Mughal empire decline?",
"What caused the French Revolution?", "Who succeeded Ashoka, and why did it fall
apart?"). At the bottom, a "Continue" list of recent lessons as text rows with a tiny
time-spine marker, not cards. Show mobile.
```

### S2: Workspace (the hero screen)

```text
Design the Workspace after the learner typed: "Why did Rome beat Carthage?"

Layout (1440px): left chat dock 340px (collapsible), center Stage with a 680px column
and a thin time spine on its left edge (the current block's period marked in oxblood),
optional right margin 280px, top bar that hides on scroll (editable topic title, mode
switch [Reader | Canvas | Timeline | Focus], depth switch [Brief | Standard | Deep],
lesson-history clock icon).

Chat dock: text rows separated by 1px rules, no bubbles. Learner lines muted sans;
replies serif, two sentences max. Under each reply, "landed" chips
[Cause graph: Second Punic War] [Article: Why Rome won] that scroll to the block. Then
three follow-up chips with small icons (Go deeper / Test me / Zoom out). Composer with
a Cmd+K hint.

Stage blocks top to bottom: an article (brief, with inline confidence tags and
hoverable names), a compact cause graph (260px tall) with "Open on canvas", a predict
gate (the next block blurred until answered), then the revealed article, and a
"Remember this" callout (a relative-time anchor).

Block chrome: slim header with type icon, title, confidence summary
("3 established, 2 likely, 1 contested"), provenance line "Because you asked: why Rome
beat Carthage", and a menu (Fullscreen, Pin, Undo).

States: just-sent (nothing flashy; a thin progress rule in the reply row, no spinner
or typing dots), streaming (blocks land one by one with a soft ochre edge that fades in
1.5s), idle, patched block (left-edge marker + "updated" tag with Undo), lesson-history
drawer (a log of ops with Undo).
Mobile: Stage full screen; chat as a bottom sheet (collapsed = composer only); mode
switch as a bottom tab bar; margin notes become inline expandable rows.
```

### S3: Canvas mode (cause graph)

```text
Design Canvas mode for the cause graph of the Second Punic War. Excalidraw feel,
purpose-built. Causes flow in from the left in swim lanes (structural, enabling,
trigger, contingency), the event node at the center, consequences fanning out to the
right over a "years later" ruler. Lines: established solid; likely dashed; contested
hand-drawn wobbly with a small debate marker. Hand-drawn labels. Click a node: a side
card with the layer, the time, and each incident link's ONE-sentence "why", with an
"Ask why" button. Floating toolbar: Select, Note, Highlight path, Fit view. Modes:
"Trace back" (highlight ancestors) and "Ripple forward" (animate consequences outward
in time order). A "Quiz this graph" button. The chat dock collapses to a bottom command
bar. Show: a 14-node dense state, an empty state, and mobile (canvas plus a bottom
sheet for the selected node).
```

### S4: Lineage

```text
Design the Lineage block and its fullscreen view. Not a family-tree engine: an
approximate map of rulers and how they connect. Generation rows top to bottom; people
as compact chips (name, years in mono, "c." when approximate). Succession = numbered
arrows; parent = single line; spouse = double line; disputed claim = dashed hand-drawn
line with a small "claim" marker. A person reachable by two paths shows a subtle
"also here" link. Controls: collapse a branch, and a focus mode that dims everyone
except the path between two selected people. Selecting a person opens a drawer with
their key events as links to the timeline. A small "Approximate" tag in the block
header. Sample: the Mughal succession from Babur to Aurangzeb. Show mobile.
```

### S5: Quiz (focus mode)

```text
Design Quiz in Focus mode: everything else disappears. One question centered at 680px,
hairline progress bar, item counter, Esc to exit. Question types: multiple choice,
chronology (drag or tap-to-sequence rows), and match (tap to pair). Feedback is calm and
immediate: shows the correct answer and a short "why", then "See in lesson", which
scrolls to the exact block and highlights the node. Include the "Graph quiz" variant:
"What led to the Second Punic War?" with options drawn from nodes in the graph. End
screen: a small timeline of the events practised, tinted by recall strength, with a
"Practise weak spots" action. No streaks, confetti or badges. Show mobile.
```

### S6: Notes and fullscreen reading

```text
Design Fullscreen Reading for one article block: everything else disappears except the
680px column on the page background, a hairline progress bar, and a small floating
pill (Esc to exit, Depth, Theme, Notes count). The conversation collapses to a
centered command bar at the bottom. Selecting text shows a tiny toolbar with three
note kinds: Remember (ochre, solid underline), Question (brick, dotted underline),
Disagree (violet, wavy underline). Notes appear in the right margin aligned to their
paragraph. A Notes slide-over lists all notes with filters and "Ask Chronicle about
this". Reading aids: focus paragraph (dim the others), a line-height slider, themes
(Paper, Sepia, Ink), and a keyboard cheat sheet on "?". Show default, text selected,
note being written, Ink theme, and mobile.
```

---

# Part 8: Milestones

| # | Build | Works when |
|---|---|---|
| M0 | Contracts, plus 3 hand-written fixtures (Second Punic War sample above, plus two more topics) | Fixtures parse with no errors; the layout function handles all 3 |
| M1 | Director prompt tested in a plain Claude chat on the 5 turns below | Outputs are valid lines, patch instead of duplicate, and look like the calibration sample |
| M2 | Backend (Part 5), mock and real mode | The acceptance list in Part 5 |
| M3 | Frontend shell: store, reducer, stream client, chat dock, article block | Type a topic in mock mode; an article streams in; reload restores it |
| M4 | Cause graph, timeline, lineage, canvas mode | Line styles are correct; trace-back and ripple work; no overlapping nodes |
| M5 | Predict gate, quiz, graph quiz, focus mode | Blur and reveal works; chronology is checked from years; mastery updates |
| M6 | Notes, fullscreen reading, history and undo, Markdown export | The golden path works end to end on desktop and mobile |

## M1 test turns (do these before any code)

1. `I want to understand the fall of the Western Roman Empire.` Expect 3 to 4 blocks, layered causes, at least one contested point, no single "the cause".
2. `Why did the Mughal empire decline?` with the stage summary pasted in. Expect a patch or an added block next to the existing one, not a restarted lesson.
3. `Who succeeded Akbar, and how did the succession go?` Expect a lineage block plus a timeline, with uncertain links marked.
4. `Quiz me on what we covered.` Expect layout focus plus a quiz built from existing block ids, relation questions first.
5. UI event `note_created` (kind disagree): "I don't think Rome fell mainly because of barbarian invasions." Expect a debate callout that engages with the claim and a one-line `say`.

## When to revisit what is parked

After M6 works and you have shown it to a few people: exam modes, fact verification, evals and guardrails, caching (history does not change, so a normalized topic plus level is the natural key), persistence and accounts. Add them one at a time, and only if what you learned from real users says to.
