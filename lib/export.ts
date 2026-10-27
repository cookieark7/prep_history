import type { Block, Confidence, LineageBlock } from "@/lib/contracts";
import { CONFIDENCE_LABEL } from "@/lib/confidence";
import { formatRange, formatYear } from "@/lib/layout/years";

/**
 * The single source of truth for turning lesson content into text (E7): one serializer per
 * block type, as Markdown (text/plain) and HTML (text/html). Block copy, Copy lesson and the
 * Markdown export all go through here.
 */

interface ExportInput {
  topic: string;
  blocks: Block[];
  notes: { blockId: string; kind: string; quote: string; text: string }[];
}

const NOTE_LABEL: Record<string, string> = { remember: "Remember", question: "Question", disagree: "Disagree" };
const CALLOUT_LABEL: Record<string, string> = { anchor: "Remember this", mnemonic: "Mnemonic", debate: "Live debate", meanwhile: "Meanwhile" };

/** Article markdown -> readable text: entities become names, [E] becomes "(established)". */
export function articleText(md: string): string {
  return md
    .replace(/\[\[([^\]|]+)\|[^\]|]*\]\]/g, "$1")
    .replace(/\[\[([^\]|]+)\]\]/g, "$1")
    .replace(/\s?\[(E|L|C)\]/g, (_, c: Confidence) => ` (${CONFIDENCE_LABEL[c]})`)
    .replace(/\[S:\d+\]/g, ""); // source markers: the reader shows them as numbered links
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
/** Escape, then the little inline markdown articles use: **bold**, *italic*. */
const inlineHtml = (md: string) =>
  esc(articleText(md)).replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/\*([^*]+)\*/g, "<em>$1</em>");
const paragraphs = (md: string) => md.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);

/** Succession order: everyone in a "succeeded" link, by reign start. */
function successionOrder(b: LineageBlock): string[] {
  const ids = new Set(b.links.filter((l) => l.rel === "succeeded").flatMap((l) => [l.from, l.to]));
  return b.people.filter((p) => ids.has(p.id)).sort((x, y) => (x.start ?? Infinity) - (y.start ?? Infinity)).map((p) => p.id);
}

function gens(b: LineageBlock) {
  return [...new Set(b.people.map((p) => p.gen))].sort((x, y) => x - y)
    .map((g) => ({ gen: g, people: b.people.filter((p) => p.gen === g) }));
}

/* ------------------------------ Markdown ------------------------------ */

export function blockToMarkdown(b: Block): string {
  const out: string[] = [`## ${b.title}`, ""];
  switch (b.type) {
    case "article":
      b.sections.forEach((s, i) => {
        if (i > 0 || b.sections.length > 1) out.push(`### ${s.h}`, "");
        out.push(articleText(s.md), "");
      });
      break;
    case "callout":
      out.push(`> **${CALLOUT_LABEL[b.kind]}.** ${articleText(b.md)}`, "");
      break;
    case "cause_graph": {
      const label = (id: string) => b.nodes.find((n) => n.id === id)?.label ?? id;
      for (const e of b.edges) out.push(`- ${label(e.from)} → ${label(e.to)}: ${e.why} (${CONFIDENCE_LABEL[e.confidence]})`);
      out.push("");
      break;
    }
    case "timeline": {
      const era = b.range.from < 0;
      out.push("| Year | Event | Track |", "| --- | --- | --- |");
      for (const e of [...b.events].sort((x, y) => x.start - y.start)) {
        const track = b.tracks.find((t) => t.id === e.track)?.label ?? e.track;
        const when = e.end != null && e.end !== e.start ? formatRange(e.start, e.end) : formatYear(e.start, { era });
        out.push(`| ${when} | ${e.label}${e.confidence !== "E" ? ` (${CONFIDENCE_LABEL[e.confidence]})` : ""} | ${track} |`);
      }
      out.push("");
      break;
    }
    case "lineage": {
      const order = successionOrder(b);
      for (const g of gens(b)) {
        out.push(`- Generation ${g.gen}`);
        for (const p of g.people) {
          const n = order.indexOf(p.id);
          const years = formatRange(p.start, p.end, p.approx);
          out.push(`  - ${p.name}${years ? ` (${years})` : ""}${n >= 0 ? ` — succession ${n + 1}` : ""}`);
        }
      }
      out.push("");
      break;
    }
    case "predict_gate": {
      out.push(`**${b.prompt}**`, "");
      b.options.forEach((o, i) => out.push(`${String.fromCharCode(65 + i)}. ${o.label}`));
      const ans = b.options.find((o) => o.id === b.answer_id)?.label ?? "";
      out.push("", `Answer: ${ans}. ${b.explanation}`, "");
      break;
    }
    case "quiz":
      b.items.forEach((it, i) => {
        out.push(`${i + 1}. ${it.stem}`);
        if (it.kind === "mcq") {
          for (const o of it.options) out.push(`   - ${o.text}`);
          out.push(`   - Answer: ${it.options.find((o) => o.id === it.answer_id)?.text ?? ""}. ${it.why}`);
        }
        if (it.kind === "chronology") {
          out.push(`   - Answer: ${[...it.events].sort((x, y) => x.year - y.year).map((e) => `${e.label} (${formatYear(e.year)})`).join(" → ")}`);
        }
        if (it.kind === "match") {
          for (const p of it.pairs) out.push(`   - ${p.left}: ${p.right}`);
          out.push(`   - ${it.explain}`);
        }
      });
      out.push("");
      break;
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}

/* -------------------------------- HTML -------------------------------- */

export function blockToHtml(b: Block): string {
  const h: string[] = [`<h2>${esc(b.title)}</h2>`];
  switch (b.type) {
    case "article":
      b.sections.forEach((s, i) => {
        if (i > 0 || b.sections.length > 1) h.push(`<h3>${esc(s.h)}</h3>`);
        for (const p of paragraphs(s.md)) h.push(`<p>${inlineHtml(p)}</p>`);
      });
      break;
    case "callout":
      h.push(`<blockquote><p><strong>${esc(CALLOUT_LABEL[b.kind])}.</strong> ${inlineHtml(b.md)}</p></blockquote>`);
      break;
    case "cause_graph": {
      const label = (id: string) => esc(b.nodes.find((n) => n.id === id)?.label ?? id);
      h.push("<ul>", ...b.edges.map((e) => `<li>${label(e.from)} → ${label(e.to)}: ${esc(e.why)} <em>(${CONFIDENCE_LABEL[e.confidence]})</em></li>`), "</ul>");
      break;
    }
    case "timeline": {
      const era = b.range.from < 0;
      h.push("<table><thead><tr><th>Year</th><th>Event</th><th>Track</th></tr></thead><tbody>");
      for (const e of [...b.events].sort((x, y) => x.start - y.start)) {
        const track = b.tracks.find((t) => t.id === e.track)?.label ?? e.track;
        const when = e.end != null && e.end !== e.start ? formatRange(e.start, e.end) : formatYear(e.start, { era });
        h.push(`<tr><td>${esc(when)}</td><td>${esc(e.label)}${e.confidence !== "E" ? ` <em>(${CONFIDENCE_LABEL[e.confidence]})</em>` : ""}</td><td>${esc(track)}</td></tr>`);
      }
      h.push("</tbody></table>");
      break;
    }
    case "lineage": {
      const order = successionOrder(b);
      h.push("<ul>");
      for (const g of gens(b)) {
        h.push(`<li>Generation ${g.gen}<ul>`);
        for (const p of g.people) {
          const n = order.indexOf(p.id);
          const years = formatRange(p.start, p.end, p.approx);
          h.push(`<li>${esc(p.name)}${years ? ` (${esc(years)})` : ""}${n >= 0 ? ` — succession ${n + 1}` : ""}</li>`);
        }
        h.push("</ul></li>");
      }
      h.push("</ul>");
      break;
    }
    case "predict_gate": {
      const ans = b.options.find((o) => o.id === b.answer_id)?.label ?? "";
      h.push(`<p><strong>${esc(b.prompt)}</strong></p>`, "<ol type=\"A\">", ...b.options.map((o) => `<li>${esc(o.label)}</li>`), "</ol>",
        `<p>Answer: ${esc(ans)}. ${esc(b.explanation)}</p>`);
      break;
    }
    case "quiz":
      h.push("<ol>");
      for (const it of b.items) {
        const sub: string[] = [];
        if (it.kind === "mcq") {
          sub.push(...it.options.map((o) => `<li>${esc(o.text)}</li>`));
          sub.push(`<li>Answer: ${esc(it.options.find((o) => o.id === it.answer_id)?.text ?? "")}. ${esc(it.why)}</li>`);
        }
        if (it.kind === "chronology") {
          sub.push(`<li>Answer: ${esc([...it.events].sort((x, y) => x.year - y.year).map((e) => `${e.label} (${formatYear(e.year)})`).join(" → "))}</li>`);
        }
        if (it.kind === "match") {
          sub.push(...it.pairs.map((p) => `<li>${esc(p.left)}: ${esc(p.right)}</li>`), `<li>${esc(it.explain)}</li>`);
        }
        h.push(`<li>${esc(it.stem)}<ul>${sub.join("")}</ul></li>`);
      }
      h.push("</ol>");
      break;
  }
  return h.join("\n");
}

/* ------------------------------- Lesson ------------------------------- */

export function lessonToMarkdown({ topic, blocks, notes }: ExportInput): string {
  const out: string[] = [`# ${topic || "Chronicle lesson"}`, ""];
  for (const b of blocks) {
    out.push(blockToMarkdown(b));
    const mine = notes.filter((n) => n.blockId === b.id);
    if (mine.length) {
      out.push("Notes:");
      for (const n of mine) out.push(`- **${NOTE_LABEL[n.kind] ?? n.kind}** “${n.quote}”${n.text ? ` — ${n.text}` : ""}`);
      out.push("");
    }
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}

export function lessonToHtml({ topic, blocks }: Pick<ExportInput, "topic" | "blocks">): string {
  return [`<h1>${esc(topic || "Chronicle lesson")}</h1>`, ...blocks.map(blockToHtml)].join("\n");
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
