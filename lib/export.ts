import type { Block } from "@/lib/contracts";
import { CONFIDENCE_LABEL } from "@/lib/confidence";
import { formatRange, formatYear } from "@/lib/layout/years";
import { plainText } from "@/lib/entities";

interface ExportInput {
  topic: string;
  blocks: Block[];
  notes: { blockId: string; kind: string; quote: string; text: string }[];
}

const NOTE_LABEL: Record<string, string> = { remember: "Remember", question: "Question", disagree: "Disagree" };

/** The whole lesson as Markdown: articles, graph edges as bullets, timelines, lineage, notes. */
export function lessonToMarkdown({ topic, blocks, notes }: ExportInput): string {
  const out: string[] = [`# ${topic || "Chronicle lesson"}`, ""];
  for (const b of blocks) {
    out.push(`## ${b.title}`, "", `_${b.because}_`, "");
    switch (b.type) {
      case "article":
        for (const s of b.sections) out.push(`### ${s.h}${s.depth === "deep" ? " (deep)" : ""}`, "", plainText(s.md), "");
        break;
      case "callout":
        out.push(`> **${b.kind}**: ${plainText(b.md)}`, "");
        break;
      case "cause_graph": {
        const label = (id: string) => b.nodes.find((n) => n.id === id)?.label ?? id;
        for (const e of b.edges)
          out.push(`- ${label(e.from)} → ${label(e.to)} (${CONFIDENCE_LABEL[e.confidence]}): ${e.why}`);
        out.push("");
        break;
      }
      case "timeline":
        for (const e of [...b.events].sort((x, y) => x.start - y.start))
          out.push(`- ${formatRange(e.start, e.end)}: ${e.label}${e.confidence !== "E" ? ` (${CONFIDENCE_LABEL[e.confidence]})` : ""}`);
        out.push("");
        break;
      case "lineage": {
        const name = (id: string) => b.people.find((p) => p.id === id)?.name ?? id;
        for (const p of [...b.people].sort((x, y) => x.gen - y.gen))
          out.push(`- ${p.name} (${formatRange(p.start, p.end, p.approx)})`);
        out.push("", "Succession:");
        for (const l of b.links.filter((l) => l.rel === "succeeded")) out.push(`- ${name(l.from)} → ${name(l.to)}`);
        out.push("");
        break;
      }
      case "predict_gate":
        out.push(`**${b.prompt}**`, "", b.explanation, "");
        break;
      case "quiz":
        for (const it of b.items) {
          if (it.kind === "mcq") out.push(`- ${it.stem} — ${it.options.find((o) => o.id === it.answer_id)?.text ?? ""}`);
          if (it.kind === "chronology") out.push(`- ${it.stem} — ${[...it.events].sort((x, y) => x.year - y.year).map((e) => `${e.label} (${formatYear(e.year)})`).join(", ")}`);
          if (it.kind === "match") out.push(`- ${it.stem} — ${it.pairs.map((p) => `${p.left}: ${p.right}`).join("; ")}`);
        }
        out.push("");
        break;
    }
    const mine = notes.filter((n) => n.blockId === b.id);
    if (mine.length) {
      out.push("Notes:");
      for (const n of mine) out.push(`- **${NOTE_LABEL[n.kind] ?? n.kind}** “${n.quote}”${n.text ? ` — ${n.text}` : ""}`);
      out.push("");
    }
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}

export function exportMarkdown(input: ExportInput) {
  const md = lessonToMarkdown(input);
  const slug = (input.topic || "chronicle-lesson").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
  const url = URL.createObjectURL(new Blob([md], { type: "text/markdown" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slug || "lesson"}.md`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
