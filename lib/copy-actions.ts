"use client";

import { copyRich } from "@/lib/clipboard";
import { blockToHtml, blockToMarkdown, lessonToHtml, lessonToMarkdown } from "@/lib/export";
import { orderedBlocks } from "@/lib/rail";
import { useWorkspace } from "@/lib/store/workspace";
import { TYPE_LABEL } from "@/lib/store/reducer";

export async function copyBlock(id: string): Promise<boolean> {
  const b = useWorkspace.getState().blocks.find((x) => x.id === id);
  if (!b) return false;
  const ok = await copyRich(blockToMarkdown(b), blockToHtml(b));
  useWorkspace.getState().showToast(ok ? `Copied ${TYPE_LABEL[b.type].toLowerCase()}: ${b.title}` : "Could not copy");
  return ok;
}

/** All blocks, in Stage order. */
export async function copyLesson(): Promise<boolean> {
  const s = useWorkspace.getState();
  const blocks = orderedBlocks(s.blocks, s.pinned);
  if (!blocks.length) return false;
  const ok = await copyRich(lessonToMarkdown({ topic: s.topic, blocks, notes: [] }), lessonToHtml({ topic: s.topic, blocks }));
  s.showToast(ok ? `Copied the lesson (${blocks.length} blocks)` : "Could not copy");
  return ok;
}
