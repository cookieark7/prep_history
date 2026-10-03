"use client";

import type { CalloutBlock as CalloutT } from "@/lib/contracts";
import { Icon } from "@/components/ui/icons";
import { Markdown } from "./Markdown";

const STYLE: Record<CalloutT["kind"], { label: string; color: string; rule: string }> = {
  anchor: { label: "Remember this", color: "var(--ochre)", rule: "solid" },
  mnemonic: { label: "Mnemonic", color: "var(--l-enabling)", rule: "solid" },
  debate: { label: "Live debate", color: "var(--violet)", rule: "dashed" },
  meanwhile: { label: "Meanwhile", color: "var(--l-structural)", rule: "double" },
};

export function CalloutBlock({ block }: { block: CalloutT }) {
  const s = STYLE[block.kind];
  const KindIcon = Icon[block.kind];
  return (
    <div
      className="rounded-[2px] py-1 pl-4"
      style={{ borderLeft: `3px ${s.rule} ${s.color}` }}
    >
      <p className="mb-1 flex items-center gap-1.5 text-[12px] font-medium uppercase tracking-wide" style={{ color: s.color }}>
        <KindIcon size={14} />
        {s.label}
      </p>
      <div className="reading text-[18px] leading-[1.6]">
        <Markdown md={block.md} blockId={block.id} />
      </div>
    </div>
  );
}
