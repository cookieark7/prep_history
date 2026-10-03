"use client";

import type { ComponentType } from "react";
import type { Block } from "@/lib/contracts";
import { ArticleBlock } from "./ArticleBlock";
import { CalloutBlock } from "./CalloutBlock";

export interface BlockProps<T extends Block = Block> {
  block: T;
  /** rendered inside fullscreen / focus rather than in the reading column */
  expanded?: boolean;
}

// type -> renderer. Unknown types (or types not built yet) fall back to raw JSON.
const registry: Partial<Record<Block["type"], ComponentType<BlockProps<never>>>> = {
  article: ArticleBlock as ComponentType<BlockProps<never>>,
  callout: CalloutBlock as ComponentType<BlockProps<never>>,
};

export function registerBlock<T extends Block>(type: T["type"], c: ComponentType<BlockProps<T>>) {
  registry[type] = c as ComponentType<BlockProps<never>>;
}

export function BlockBody({ block, expanded }: BlockProps) {
  const C = registry[block.type] as ComponentType<BlockProps> | undefined;
  if (!C) return <Fallback block={block} />;
  return <C block={block} expanded={expanded} />;
}

export function Fallback({ block }: { block: { title?: string } }) {
  return (
    <details className="rounded-[2px] border border-dashed border-rule p-3 text-[13px] text-muted">
      <summary className="cursor-pointer">This block type can&apos;t be drawn yet. Show raw data</summary>
      <pre className="scroll-thin mt-2 max-h-80 overflow-auto font-mono text-[11px] leading-relaxed">{JSON.stringify(block, null, 2)}</pre>
    </details>
  );
}
