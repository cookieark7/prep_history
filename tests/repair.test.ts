import { describe, expect, it, vi } from "vitest";
import { validateLine, type StreamLine } from "@/lib/contracts";
import { newLineStats, validLines } from "@/lib/director/pipeline";
import { clip, fillMissingValues, mendJson, rebalanceJson, repairLine } from "@/lib/director/repair";

const graphLine = (nodeConf: string, edgeConf = "high") => ({
  t: "op",
  op: {
    op: "add", after: null,
    block: {
      id: "b1", type: "cause_graph", title: "Why Rome won", because: "You asked why",
      nodes: [
        { id: "n1", label: "Second Punic War", layer: "event", when: "218 BCE", t_offset: null, confidence: nodeConf },
        { id: "n2", label: "Rome's Italian alliance system, which supplied soldiers year after year without fail", layer: "structural", when: -338, t_offset: null, confidence: "E" },
        { id: "n3", label: "Rome dominates the west", layer: "consequence", when: null, t_offset: 17, confidence: "medium" },
      ],
      edges: [{ from: "n2", to: "n1", confidence: edgeConf, why: "Manpower let Rome absorb defeats." }],
    },
  },
});

describe("repairLine", () => {
  it("maps confidence words, years as text and long labels, so the block validates", () => {
    expect(validateLine(JSON.stringify(graphLine("high"))).ok).toBe(false);
    const { value, fixes } = repairLine(graphLine("high"));
    expect(fixes).toEqual(expect.arrayContaining(["confidence words", "years as text", "label too long"]));
    const r = validateLine(JSON.stringify(value));
    expect(r.ok).toBe(true);
    const nodes = (value as ReturnType<typeof graphLine>).op.block.nodes;
    expect(nodes.map((n) => n.confidence)).toEqual(["E", "E", "L"]);
    expect(nodes[0].when).toBe(-218);
    expect(nodes[1].label.length).toBeLessThanOrEqual(60);
    expect(nodes[1].label.endsWith("…")).toBe(true);
  });

  it("gives a callout without a title its kind's name", () => {
    const line = { t: "op", op: { op: "add", after: "b1", block: { id: "b2", type: "callout", kind: "debate", because: "x", md: "Two views." } } };
    const { value, fixes } = repairLine(line);
    expect(fixes).toEqual(["callout title"]);
    expect(validateLine(JSON.stringify(value))).toMatchObject({ ok: true, line: { op: { block: { title: "Live debate" } } } });
  });

  it("clips long followup labels and clamps importance", () => {
    const f = repairLine({ t: "followup", kind: "deeper", label: "What were the key battles and events that led to Rome's victory?" });
    expect((f.value as { label: string }).label.length).toBeLessThanOrEqual(60);
    const t = repairLine({ t: "op", op: { op: "patch", id: "b3", set: { events: [{ id: "e1", importance: 5, confidence: "likely", start: "-216" }] } } });
    expect(t.value).toMatchObject({ op: { set: { events: [{ importance: 3, confidence: "L", start: -216 }] } } });
  });

  it("fills in a cause-graph node's missing when / t_offset with null", () => {
    const line = graphLine("E", "E");
    const nodes = line.op.block.nodes as Record<string, unknown>[];
    delete nodes[1].t_offset;
    delete nodes[2].when;
    const { value, fixes } = repairLine(line);
    expect(fixes).toContain("missing when/t_offset");
    expect(validateLine(JSON.stringify(value)).ok).toBe(true);
  });

  it("turns numeric text into numbers in lineage gen and chronology years", () => {
    const { value } = repairLine({ t: "op", op: { op: "patch", id: "b3", set: { people: [{ id: "p1", gen: "2", start: "1605" }], items: [{ kind: "chronology", events: [{ id: "e1", year: "216 BC" }] }] } } });
    expect(value).toMatchObject({ op: { set: { people: [{ gen: 2, start: 1605 }], items: [{ events: [{ year: -216 }] }] } } });
  });

  it("works out lineage generations from parent links when they are not numbers", () => {
    const people = [
      { id: "p1", name: "Akbar", gen: "M", start: 1556, end: 1605, approx: false, key_events: [] },
      { id: "p2", name: "Jahangir", gen: "M", start: 1605, end: 1627, approx: false, key_events: [] },
      { id: "p3", name: "Shah Jahan", gen: "M", start: 1628, end: 1658, approx: false, key_events: [] },
    ];
    const links = [{ from: "p1", to: "p2", rel: "parent", confidence: "E" }, { from: "p2", to: "p3", rel: "parent", confidence: "E" }];
    const { value, fixes } = repairLine({ t: "op", op: { op: "add", after: null, block: { id: "b3", type: "lineage", title: "Mughals", because: "x", people, links } } });
    expect(fixes).toContain("lineage generations");
    expect((value as { op: { block: { people: { gen: number }[] } } }).op.block.people.map((p) => p.gen)).toEqual([1, 2, 3]);
    expect(validateLine(JSON.stringify(value)).ok).toBe(true);
  });

  it("leaves valid lines and unknown values alone", () => {
    const ok = { t: "say", text: "Fine." };
    expect(repairLine(ok)).toEqual({ value: ok, fixes: [] });
    const odd = repairLine(graphLine("maybe-ish", "E"));
    expect((odd.value as ReturnType<typeof graphLine>).op.block.nodes[0].confidence).toBe("maybe-ish");
    expect(validateLine(JSON.stringify(odd.value)).ok).toBe(false);
  });

  it("does not touch ranges or prose in year fields", () => {
    const { value } = repairLine({ t: "op", op: { op: "patch", id: "b2", set: { nodes: [{ id: "n1", when: "218–201 BCE" }] } } });
    expect(value).toMatchObject({ op: { set: { nodes: [{ when: "218–201 BCE" }] } } });
  });

  it("clips at a word boundary", () => {
    expect(clip("short", 10)).toBe("short");
    expect(clip("the quick brown fox jumps over", 16)).toBe("the quick brown…");
  });
});

describe("article section depth", () => {
  it("makes a new article's first section brief and any other standard, and lowercases the word", () => {
    const add = { t: "op", op: { op: "add", after: null, block: { id: "b1", type: "article", title: "Khaljis", because: "x", sections: [{ h: "Key facts", md: "- 1290 [E]" }, { h: "Rise", md: "x", depth: "Standard" }] } } };
    const r = repairLine(add);
    const sections = (r.value as { op: { block: { sections: { depth: string }[] } } }).op.block.sections;
    expect(sections.map((s) => s.depth)).toEqual(["brief", "standard"]);
    expect(r.fixes).toContain("section depth");
    const patch = repairLine({ t: "op", op: { op: "patch", id: "b1", set: { sections: [{ h: "Decline", md: "x" }] } } });
    expect((patch.value as { op: { set: { sections: { depth: string }[] } } }).op.set.sections[0].depth).toBe("standard");
  });
});

describe("mendJson", () => {
  it("removes the stray quote free models put between two quiz items", () => {
    const broken = '{"items":[{"id":"q1","ref":{"b":1}},"},{"id":"q2"}]}';
    const m = mendJson(broken)!;
    expect(JSON.parse(m.text)).toEqual({ items: [{ id: "q1", ref: { b: 1 } }, { id: "q2" }] });
    expect(m.fixes).toEqual(["removed a stray quote between items"]);
  });

  it("falls back to balancing brackets, and gives up on text it can't mend", () => {
    expect(mendJson('{"a":[{"b":1}}]}')!.fixes).toEqual(["balanced its brackets"]);
    expect(mendJson('{"a": nonsense}')).toBeNull();
  });
});

describe("rebalanceJson", () => {
  it("drops a closing bracket that closes nothing open", () => {
    const broken = '{"items":[{"id":"q1","ref":{"b":1}}},{"id":"q2"}]}';
    expect(JSON.parse(rebalanceJson(broken)!)).toEqual({ items: [{ id: "q1", ref: { b: 1 } }, { id: "q2" }] });
  });

  it("closes what is still open, and ignores brackets inside strings", () => {
    expect(JSON.parse(rebalanceJson('{"md":"a } and ] here","x":[1,2')!)).toEqual({ md: "a } and ] here", x: [1, 2] });
  });

  it("leaves balanced text alone, and gives up inside an open string", () => {
    expect(rebalanceJson('{"a":[1]}')).toBeNull();
    expect(rebalanceJson('{"a":"open')).toBeNull();
  });
});

describe("slips seen in the 28 and 31 Oct evals (replayed raw output)", () => {
  it("reads a ')' typed for a closing bracket as that bracket (the people-lens family tree)", () => {
    const broken = '{"t":"op","op":{"op":"add","block":{"links":[{"from":"p1","to":"p2"}]}})';
    expect(JSON.parse(rebalanceJson(broken)!)).toEqual({ t: "op", op: { op: "add", block: { links: [{ from: "p1", to: "p2" }] } } });
    // after a resync has already added the brace it was missing, the ")" still closes the line
    expect(JSON.parse(rebalanceJson('{"a":{"b":1})}')!)).toEqual({ a: { b: 1 } });
  });

  it("moves a section's depth back inside the section the model closed too early (the people lens)", () => {
    const broken = '{"t":"op","op":{"op":"patch","id":"b1","set":{"sections":[{"h":"Peshwa era","md":"Baji Rao I expanded north. [E][S1]"},"depth":"standard"}}}';
    const m = mendJson(broken)!;
    expect(JSON.parse(m.text)).toEqual({ t: "op", op: { op: "patch", id: "b1", set: { sections: [{ h: "Peshwa era", md: "Baji Rao I expanded north. [E][S1]", depth: "standard" }] } } });
    expect(m.fixes).toContain("moved a section's depth back inside it");
  });

  it("fills a value the model left out with null, but never inside a string", () => {
    expect(fillMissingValues('{"when":,"t_offset":-,"x":1,"y":-}')).toBe('{"when":null,"t_offset":null,"x":1,"y":null}');
    expect(fillMissingValues('{"md":"Note:, then ratio 3:}"}')).toBeNull();
    const m = mendJson('{"nodes":[{"id":"n1","when":,"t_offset":null}]}')!;
    expect(JSON.parse(m.text)).toEqual({ nodes: [{ id: "n1", when: null, t_offset: null }] });
    expect(m.fixes).toEqual(["filled a missing value with null"]);
  });

  it("maps a card kind a free model invents to its closest real kind, and leaves the unknown alone", () => {
    const card = (kind: string) => ({ t: "card", card: { id: "c1", kind, front: "Did it matter?", back: "Yes.", source_ref: { block: "b1", node: null } } });
    const debate = repairLine(card("debate"));
    expect((debate.value as { card: { kind: string } }).card.kind).toBe("significance");
    expect(debate.fixes).toContain("card kind");
    expect((repairLine(card("Why")).value as { card: { kind: string } }).card.kind).toBe("why");
    expect((repairLine(card("compare")).value as { card: { kind: string } }).card.kind).toBe("significance");
    expect(repairLine(card("riddle")).fixes).not.toContain("card kind");
    expect(repairLine(card("fact")).fixes).toEqual([]);
  });

  it("reads list items written as JSON text back into objects (the Maurya cause map)", () => {
    const line = { t: "op", op: { op: "add", after: null, block: {
      id: "b2", type: "cause_graph", title: "Why the Mauryas fell", because: "",
      nodes: [
        { id: "n0", label: "Collapse", layer: "event", when: -180, t_offset: null, confidence: "E" },
        '{"id":"n1","label":"Weak successors","layer":"trigger","when":-232,"t_offset":null,"confidence":"E"}',
        "plain words stay as they are",
      ],
      edges: [],
    } } };
    const r = repairLine(line);
    const nodes = (r.value as { op: { block: { nodes: unknown[] } } }).op.block.nodes;
    expect(nodes[1]).toEqual({ id: "n1", label: "Weak successors", layer: "trigger", when: -232, t_offset: null, confidence: "E" });
    expect(nodes[2]).toBe("plain words stay as they are");
    expect(r.fixes).toContain("items written as text");
  });

  it("turns the year 0 into 1 BCE in calendar years, but not in offsets or generations", () => {
    const line = {
      t: "op", op: { op: "add", after: null, block: {
        id: "b2", type: "timeline", title: "Bhimbetka", because: "",
        range: { from: -40000, to: 0 },
        events: [{ id: "e1", track: "t1", start: 0, end: null, label: "Later paintings", importance: 2, confidence: "L" }],
      } },
    };
    const r = repairLine(line);
    const b = (r.value as { op: { block: { range: { to: number }; events: { start: number }[] } } }).op.block;
    expect(b.range.to).toBe(-1);
    expect(b.events[0].start).toBe(-1);
    expect(r.fixes).toContain("year 0");
    const node = repairLine({ t: "op", op: { op: "add", after: null, block: { id: "b1", type: "cause_graph", title: "x", because: "", nodes: [{ id: "n1", label: "x", layer: "event", when: null, t_offset: 0, confidence: "E" }], edges: [] } } });
    expect(node.fixes).not.toContain("year 0");
  });
});

describe("validLines with repair", () => {
  it("passes a repaired line, counts it, and logs what was fixed", async () => {
    const stats = newLineStats();
    const log = vi.fn();
    const out: StreamLine[] = [];
    async function* src() { yield JSON.stringify(graphLine("high")) + "\n" + '{"t":"done"}'; }
    for await (const l of validLines(src(), log, stats)) out.push(l);
    expect(out.map((l) => l.t)).toEqual(["op", "done"]);
    expect(stats).toMatchObject({ repaired: 1, dropped: 0, forwarded: 2 });
    expect(log).toHaveBeenCalledWith(expect.stringContaining("repaired line (confidence words"));
  });

  it("counts a line that is still invalid after repair as dropped only", async () => {
    const stats = newLineStats();
    async function* src() { yield JSON.stringify(graphLine("maybe-ish")); }
    for await (const l of validLines(src(), () => {}, stats)) void l;
    expect(stats).toMatchObject({ repaired: 0, dropped: 1 });
  });
});
