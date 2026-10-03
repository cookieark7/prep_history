/** v0.1 prompt re-test in mock mode: the three turns from the enhancement guide (section 6). */
import { validateLine, type TurnRequest } from "../lib/contracts";

const BASE = process.env.CHRONICLE_URL ?? "http://localhost:3000";
const mughalStage = [
  { id: "b1", type: "lineage", title: "Mughal succession: Babur to Aurangzeb" },
  { id: "b2", type: "timeline", title: "Reigns and succession fights, 1526-1707" },
  { id: "b3", type: "callout", title: "A live debate: no rule of succession" },
];
const pasted = "Hannibal crossed the Alps and won at Cannae, yet Rome refused to make peace. ".repeat(40);
const turns: [string, TurnRequest][] = [
  ["1 Rome", { message: "I want to understand the fall of the Western Roman Empire.", event: null, workspace: { blocks: [], level: "some", mastery: [] } }],
  ["2 Mughal decline (existing stage)", { message: "Why did the Mughal empire decline?", event: null, workspace: { blocks: mughalStage, level: "some", mastery: [] } }],
  ["3 long source_text", { message: "Help me understand what I'm reading.", event: null, workspace: { blocks: [], level: "some", mastery: [] }, source_text: pasted }],
];

async function main() {
for (const [name, body] of turns) {
  const res = await fetch(`${BASE}/api/turn`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const lines = (await res.text()).trim().split("\n");
  const valid = lines.every((l) => validateLine(l).ok);
  const objs = lines.map((l) => JSON.parse(l));
  const ops = objs.filter((o) => o.t === "op").map((o) => o.op);
  const adds = ops.filter((o) => o.op === "add");
  const briefOnly = adds.every((o) => o.block.type !== "article" || o.block.sections.length === 1);
  const ownPatches = ops.filter((o) => o.op === "patch" && adds.some((a) => a.block.id === o.id));
  const lastAdd = ops.map((o) => o.op).lastIndexOf("add");
  const patchesAfterAdds = ops.every((o, i) => o.op !== "patch" || !adds.some((a) => a.block.id === o.id) || i > lastAdd);
  const restarted = ops.some((o) => o.op === "remove");
  const dup = adds.some((a) => body.workspace.blocks.some((b) => b.title === a.block.title));
  console.log(`${name}: ${lines.length} lines | valid=${valid} briefOnly=${briefOnly} sectionPatches=${ownPatches.length} patchesAfterAdds=${patchesAfterAdds} restarted=${restarted} duplicate=${dup}`);
  console.log("   " + objs.map((o) => (o.t === "op" ? `${o.op.op}:${o.op.block?.id ?? o.op.id}` : o.t)).join(" "));
}
}

void main();
