"use client";

import type { CalloutBlock as CalloutT } from "@/lib/contracts";
import { Icon } from "@/components/ui/icons";
import { Markdown } from "./Markdown";

// Each kind of aside is a panel tinted with its colour (no side stripe). A live debate also gets a
// dashed outline, the same mark contested links use.
const STYLE: Record<CalloutT["kind"], { label: string; color: string; dashed?: boolean }> = {
  anchor: { label: "Remember this", color: "var(--ochre)" },
  mnemonic: { label: "Mnemonic", color: "var(--l-enabling)" },
  debate: { label: "Live debate", color: "var(--violet)", dashed: true },
  meanwhile: { label: "Meanwhile", color: "var(--l-structural)" },
  terms: { label: "Terms", color: "var(--text)" }, // an exam lesson's glossary
};

export function CalloutBlock({ block }: { block: CalloutT }) {
  const s = STYLE[block.kind];
  const KindIcon = Icon[block.kind];
  return (
    <div
      className="rounded-lg px-4 pb-3.5 pt-3"
      style={{
        background: `color-mix(in srgb, ${s.color} 7%, var(--bg))`,
        border: s.dashed ? `1.5px dashed color-mix(in srgb, ${s.color} 70%, transparent)` : undefined,
      }}
    >
      <p className="mb-1 flex items-center gap-1.5 text-[13px] font-medium" style={{ color: s.color }}>
        <KindIcon size={14} />
        {s.label}
      </p>
      <div className="reading text-[18px] leading-[1.6]">
        <Markdown md={block.md} blockId={block.id} />
      </div>
    </div>
  );
}
