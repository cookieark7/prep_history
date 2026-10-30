"use client";

import type { CauseGraphBlock as GraphT, Layer } from "@/lib/contracts";
import { formatYear } from "@/lib/layout/years";
import { ConfidenceDot, LAYER_LABEL, LayerShape } from "@/components/ui/marks";

// The cause map as the product's line (phones, where the drawn map is too small to read):
// causes in order down to the event on its yellow board, then what it led to. Each step says
// why it connects, with its confidence; contested links say so in words, not only by line style.

const ORDER: Layer[] = ["structural", "enabling", "contingency", "trigger", "event", "consequence"];
const CONF_WORD = { E: "Established", L: "Likely", C: "Contested" } as const;

export function CauseList({ block, onOpen }: { block: GraphT; onOpen?: (nodeId: string) => void }) {
  const event = block.nodes.find((n) => n.layer === "event");
  const era = block.nodes.some((n) => (n.when ?? 0) < 0);
  const at = (n: GraphT["nodes"][number]) => (n.when ?? (event?.when ?? 0) + (n.t_offset ?? 0));
  // causes in time order, then the event, then what it led to in time order
  const group = (l: Layer) => (l === "event" ? 1 : l === "consequence" ? 2 : 0);
  const nodes = [...block.nodes].sort((a, b) => group(a.layer) - group(b.layer) || at(a) - at(b) || ORDER.indexOf(a.layer) - ORDER.indexOf(b.layer));
  // a cause explains its link onward; a consequence explains the link that reached it
  const linkOf = (id: string, layer: Layer) =>
    layer === "consequence" ? block.edges.find((e) => e.to === id) : block.edges.find((e) => e.from === id && e.to === event?.id) ?? block.edges.find((e) => e.from === id);
  const when = (n: GraphT["nodes"][number]) =>
    n.when != null ? formatYear(n.when, { era }) : n.t_offset != null ? `${n.t_offset} ${Math.abs(n.t_offset) === 1 ? "year" : "years"} later` : null;

  return (
    <ol className="relative" aria-label={`Cause map: ${block.title}, as a list`}>
      <span aria-hidden className="absolute bottom-6 left-[13px] top-6 w-[3px] bg-line" />
      {nodes.map((n) => {
        const w = when(n);
        if (n.layer === "event") {
          return (
            <li key={n.id} className="relative flex items-center gap-3 py-3">
              <span className="grid w-7 shrink-0 place-items-center"><span aria-hidden className="block h-5 w-5 rounded-full border-[3px] border-line bg-board" /></span>
              <button type="button" onClick={() => onOpen?.(n.id)} className="min-w-0 flex-1 border-[3px] border-line bg-board px-3 pb-1.5 pt-2 text-left text-board-ink">
                <span className="board-type block text-[20px]">{n.label}</span>
                {w && <span className="mt-1 block text-[13.5px] font-bold tnum">{w}</span>}
              </button>
            </li>
          );
        }
        const link = linkOf(n.id, n.layer);
        return (
          <li key={n.id} className="relative flex gap-3 py-2.5">
            <span className="relative z-[1] mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 border-line bg-bg">
              <LayerShape layer={n.layer} size={11} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] text-muted">{LAYER_LABEL[n.layer]}{w ? <span className="tnum"> · {w}</span> : null}</p>
              <button type="button" onClick={() => onOpen?.(n.id)} className="mt-0.5 block text-left text-[16px] font-semibold leading-snug">{n.label}</button>
              {link?.why && (
                <p className={`mt-1 flex gap-1.5 text-[14.5px] leading-snug ${link.confidence === "C" ? "text-brick" : "text-muted"}`}>
                  <span className="mt-[5px]"><ConfidenceDot c={link.confidence} /></span>
                  <span><span className="sr-only">{CONF_WORD[link.confidence]}: </span>{link.confidence === "C" ? "Contested: " : ""}{link.why}</span>
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
