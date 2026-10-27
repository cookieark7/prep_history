"use client";

import type { CauseGraphBlock } from "@/lib/contracts";
import { ConfidenceDot, LAYER_LABEL, LayerShape } from "@/components/ui/marks";
import { Icon } from "@/components/ui/icons";
import { CONFIDENCE_LABEL } from "@/lib/confidence";
import { incident, nodeDetail, nodeTimeLabel } from "@/lib/graph";
import { sendTurn } from "@/lib/stream-client";

/** Side card for a selected node: layer, time, and each incident link's one-sentence why. */
export function NodeCard({
  block, nodeId, onClose, onTrace, onRipple, onSelect,
}: {
  block: CauseGraphBlock;
  nodeId: string;
  onClose: () => void;
  onTrace: () => void;
  onRipple: () => void;
  onSelect: (id: string) => void;
}) {
  const n = block.nodes.find((x) => x.id === nodeId);
  if (!n) return null;
  const { incoming, outgoing } = incident(block, nodeId);
  const label = (id: string) => block.nodes.find((x) => x.id === id)?.label ?? id;

  return (
    <aside className="fade-up flex max-h-full w-full flex-col overflow-hidden rounded-md border border-rule bg-surface shadow-[var(--shadow-float)]" aria-label={`Node: ${n.label}`}>
      <div className="flex items-start gap-2 border-b border-rule p-4">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-[12px] text-muted">
            <LayerShape layer={n.layer} size={11} /> {LAYER_LABEL[n.layer]}
            <span className="tnum text-[12px] ml-1">{nodeTimeLabel(block, n)}</span>
          </p>
          <h3 className="mt-1 font-heading text-[19px] font-semibold leading-tight">{n.label}</h3>
          <p className="mt-1 flex items-center gap-1.5 text-[12px] text-muted">
            <ConfidenceDot c={n.confidence} /> {CONFIDENCE_LABEL[n.confidence]}
          </p>
        </div>
        <button type="button" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-md text-muted hover:bg-hover" aria-label="Close">
          <Icon.close size={14} />
        </button>
      </div>
      <div className="scroll-thin flex-1 overflow-y-auto overscroll-contain p-4 text-[13.5px] leading-snug">
        {incoming.length > 0 && (
          <>
            <p className="mb-1.5 text-[11.5px] font-medium uppercase tracking-wide text-muted">Caused by</p>
            <ul className="mb-4 space-y-2.5">
              {incoming.map((e) => (
                <li key={e.from}>
                  <button type="button" onClick={() => onSelect(e.from)} className="flex items-center gap-1.5 text-left font-medium hover:text-accent">
                    <ConfidenceDot c={e.confidence} /> {label(e.from)}
                  </button>
                  <p className="mt-0.5 pl-[14px] text-[15px] text-muted">{e.why}</p>
                </li>
              ))}
            </ul>
          </>
        )}
        {outgoing.length > 0 && (
          <>
            <p className="mb-1.5 text-[11.5px] font-medium uppercase tracking-wide text-muted">Led to</p>
            <ul className="space-y-2.5">
              {outgoing.map((e) => (
                <li key={e.to}>
                  <button type="button" onClick={() => onSelect(e.to)} className="flex items-center gap-1.5 text-left font-medium hover:text-accent">
                    <ConfidenceDot c={e.confidence} /> {label(e.to)}
                  </button>
                  <p className="mt-0.5 pl-[14px] text-[15px] text-muted">{e.why}</p>
                </li>
              ))}
            </ul>
          </>
        )}
        {!incoming.length && !outgoing.length && <p className="text-muted">No links recorded for this node.</p>}
      </div>
      <div className="flex flex-wrap gap-1.5 border-t border-rule p-3">
        <button
          type="button"
          onClick={() => void sendTurn({
            event: { event: "expand_node", block_id: block.id, node_id: n.id, label: n.label },
            detail: nodeDetail(block, n.id),
            echo: `Why: ${n.label}`,
          })}
          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-text px-3 text-[13px] text-bg"
        >
          Ask why
        </button>
        <button type="button" onClick={onTrace} className="inline-flex h-9 items-center gap-1.5 rounded-md border border-rule px-2.5 text-[13px] hover:bg-hover">
          <Icon.back_trace size={13} /> Trace back
        </button>
        <button type="button" onClick={onRipple} className="inline-flex h-9 items-center gap-1.5 rounded-md border border-rule px-2.5 text-[13px] hover:bg-hover">
          <Icon.ripple size={13} /> Ripple forward
        </button>
      </div>
    </aside>
  );
}
