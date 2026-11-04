import type { BlockType, TurnRequest } from "@/lib/contracts";

// Golden turns for scripts/eval.ts (docs/PROTOTYPE_PLAN.md, section 5.5). They cover the kinds
// of turn the Director must handle; `expect` adds checks on top of the ones every turn gets.

export interface EvalCase {
  id: string;
  label: string;
  req: TurnRequest;
  expect?: {
    /** at least one of these block types is added */
    anyType?: BlockType[];
    /** every one of these block types is added (the exam lesson's parts) */
    allTypes?: BlockType[];
    /** a layout op to this mode */
    layout?: "reader" | "canvas" | "timeline" | "focus";
    /** must not remove blocks or add at the top of an existing stage */
    noRestart?: boolean;
    /** must change something (add or patch) */
    someOp?: boolean;
    /** cause maps may have at most this many nodes */
    maxNodes?: number;
    /** text that must appear somewhere in the added blocks */
    mentions?: RegExp;
  };
}

type Stage = TurnRequest["workspace"]["blocks"];
const req = (message: string | null, opts: { stage?: Stage; level?: TurnRequest["workspace"]["level"]; goal?: TurnRequest["workspace"]["goal"]; event?: TurnRequest["event"]; detail?: string; source_text?: string } = {}): TurnRequest => ({
  message,
  event: opts.event ?? null,
  workspace: { blocks: opts.stage ?? [], level: opts.level ?? "some", ...(opts.goal ? { goal: opts.goal } : {}), mastery: [] },
  ...(opts.detail ? { detail: opts.detail } : {}),
  ...(opts.source_text ? { source_text: opts.source_text } : {}),
});

const punicStage: Stage = [
  { id: "b1", type: "article", title: "Why Rome beat Carthage" },
  { id: "b2", type: "cause_graph", title: "Causes and consequences: Second Punic War" },
];
const mughalStage: Stage = [
  { id: "b1", type: "article", title: "The Mughal Empire at its height" },
  { id: "b2", type: "timeline", title: "Mughal emperors, 1526-1707" },
];
const romeStage: Stage = [{ id: "b1", type: "article", title: "How the Western Roman Empire fell" }];

const PASTED = "In 218 BC Hannibal left Iberia with an army that included war elephants, crossed the Pyrenees and then the Alps, and descended into northern Italy. Over the next two years he destroyed Roman armies at the Trebia, at Lake Trasimene and, most famously, at Cannae in 216 BC, where a much larger Roman force was encircled. Yet Rome did not sue for peace. Most of its allies in central Italy stayed loyal, Rome kept raising new legions, and generals such as Fabius Maximus avoided further pitched battles.";

export const EVAL_CASES: EvalCase[] = [
  { id: "punic-why", label: "why question, empty stage", req: req("Why did Rome beat Carthage?"), expect: { anyType: ["cause_graph"] } },
  { id: "rome-learn", label: "learn a topic", req: req("I want to understand the fall of the Western Roman Empire."), expect: { anyType: ["article"] } },
  { id: "french-rev", label: "causes of an event", req: req("What caused the French Revolution?"), expect: { anyType: ["cause_graph"] } },
  { id: "mughal-decline", label: "why, existing stage", req: req("Why did the Mughal empire decline?", { stage: mughalStage }), expect: { noRestart: true, someOp: true } },
  { id: "mughal-succession", label: "succession question", req: req("Who succeeded Akbar, and how did the succession go?", { stage: mughalStage }), expect: { anyType: ["lineage"] } },
  { id: "maurya", label: "dynasty and decline", req: req("Who succeeded Ashoka, and why did the Maurya empire fall apart?"), expect: { anyType: ["lineage", "cause_graph"] } },
  { id: "quiz", label: "quiz on the stage", req: req("Quiz me on what we covered.", { stage: punicStage }), expect: { anyType: ["quiz"], layout: "focus" } },
  { id: "deeper", label: "go deeper on an article", req: req("Go deeper", { stage: punicStage }), expect: { noRestart: true, someOp: true } },
  {
    id: "ask-why", label: "ask_why event",
    req: req(null, { stage: punicStage, event: { event: "ask_why", block_id: "b1", selection: "Rome kept raising new legions" } }),
    expect: { noRestart: true, someOp: true },
  },
  {
    id: "expand-node", label: "expand_node event",
    req: req(null, {
      stage: punicStage,
      event: { event: "expand_node", block_id: "b2", node_id: "n4", label: "Italian allies stay loyal" },
      detail: 'Node n4 "Italian allies stay loyal" (contingency, L). Edges: n4 -> n9 "Rome outlasts Hannibal" (the allies kept supplying soldiers).',
    }),
    expect: { noRestart: true, someOp: true },
  },
  {
    id: "note-disagree", label: "disagree note",
    req: req(null, { stage: romeStage, event: { event: "note_created", block_id: "b1", kind: "disagree", text: "I don't think Rome fell mainly because of barbarian invasions.", quote: "barbarian invasions" } }),
    expect: { someOp: true }, // a debate callout or a patch to the article both answer it
  },
  { id: "pasted", label: "pasted reading", req: req("Help me understand what I'm reading.", { source_text: PASTED }), expect: { mentions: /Cannae|Hannibal/ } },
  { id: "level-new", label: "level new", req: req("Why did the Industrial Revolution start in Britain?", { level: "new" }), expect: { anyType: ["cause_graph", "article"], maxNodes: 10 } },
  { id: "level-advanced", label: "level advanced", req: req("Why did the Late Bronze Age collapse happen?", { level: "advanced" }), expect: { anyType: ["cause_graph", "article"] } },
  { id: "meanwhile", label: "simultaneity", req: req("What was happening in China while Rome fought Carthage?"), expect: { anyType: ["timeline", "callout", "article"] } },
  { id: "vague", label: "vague request", req: req("Tell me about wars.") },
  // UPSC, many lenses (28 Oct 2026): the lens follows the question, and exam facts are stated
  { id: "marathas-learn", label: "learn a syllabus period", req: req("I want to understand the Maratha Empire."), expect: { anyType: ["article"], mentions: /Shivaji/ } },
  { id: "lens-timeline", label: "timeline lens", req: req("The Marathas (1674 – 1818): a timeline of the main events"), expect: { anyType: ["timeline"] } },
  { id: "lens-people", label: "people lens", req: req("The Marathas (1674 – 1818): the key people and what each did"), expect: { anyType: ["lineage", "article"], mentions: /Peshwa|Baji Rao/ } },
  { id: "prelims-fact", label: "exam fact question", req: req("What were chauth and sardeshmukhi?"), expect: { anyType: ["article", "callout"], mentions: /one[- ]fourth|25|quarter/i } },
  // exam prep (31 Oct 2026): a series part in the five exam parts
  { id: "exam-marathas", label: "exam prep, a series part", req: req("The Marathas, part 1 of 4: Shivaji and the Maratha state (1630 – 1680)", { level: "new", goal: "exam" }), expect: { allTypes: ["article", "timeline", "callout", "quiz"], mentions: /Key facts/ } },
  { id: "exam-khaljis", label: "exam prep, new sources", req: req("Delhi Sultanate, part 2 of 4: The Khaljis (1290 – 1320)", { level: "new", goal: "exam" }), expect: { allTypes: ["article", "timeline", "callout", "quiz"], mentions: /Alauddin|Ala.?ud.?din/i } },
  // one per station given sources on 31 Oct (ancient India, world history); every check also
  // asks that an article cites the passages it was given
  { id: "src-stone-age", label: "sources: Stone Age", req: req("What do the rock paintings at Bhimbetka show?"), expect: { anyType: ["article"], mentions: /Bhimbetka/ } },
  { id: "src-harappan", label: "sources: Harappan", req: req("How were Harappan towns planned, and why the drains?"), expect: { anyType: ["article"], mentions: /Mohenjo|Harappa|Dholavira|Lothal/ } },
  { id: "src-vedic", label: "sources: Vedic age", req: req("How did society change from the early to the later Vedic age?"), expect: { anyType: ["article"], mentions: /Rig ?veda/i } },
  { id: "src-magadha", label: "sources: Magadha", req: req("Why did Magadha become the strongest of the Mahajanapadas?"), expect: { anyType: ["cause_graph", "article"], mentions: /Bimbisara|Ajatashatru|Rajagriha|Pataliputra|Nanda/ } },
  { id: "src-kushanas", label: "sources: after the Mauryas", req: req("Who were the Kushanas, and why does Kanishka matter?"), expect: { anyType: ["article", "lineage"], mentions: /Kanishka/ } },
  { id: "src-gupta-exam", label: "sources: Gupta, exam prep", req: req("Gupta age, part 1 of 3: The Gupta kings (c. 320 – 467 CE)", { level: "new", goal: "exam" }), expect: { allTypes: ["article", "timeline", "callout", "quiz"], mentions: /Samudragupta/ } },
  { id: "src-american", label: "sources: American Revolution", req: req("What did the American Revolution change?"), expect: { anyType: ["article", "cause_graph"], mentions: /1776|Declaration of Independence/ } },
  { id: "src-africa", label: "sources: imperialism", req: req("What was the scramble for Africa?"), expect: { anyType: ["article", "cause_graph"], mentions: /Berlin Conference|1884/ } },
  { id: "src-ww1", label: "sources: First World War", req: req("What caused the First World War?"), expect: { anyType: ["cause_graph"], mentions: /Franz Ferdinand|Sarajevo|July Crisis/ } },
  { id: "src-russia", label: "sources: between the wars", req: req("What happened in the Russian Revolution of 1917?"), expect: { anyType: ["article", "timeline"], mentions: /Bolshevik|Lenin/ } },
  { id: "src-ww2", label: "sources: Second World War", req: req("Why did the Second World War begin in 1939?"), expect: { anyType: ["cause_graph", "article"], mentions: /Poland|Munich|Danzig/ } },
  { id: "src-nam", label: "sources: decolonisation", req: req("What was the Non-Aligned Movement?"), expect: { anyType: ["article"], mentions: /Bandung|Belgrade|Nehru|Tito/ } },
];
