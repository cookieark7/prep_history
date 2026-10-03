"use client";

import type { ArticleBlock as ArticleT, Depth } from "@/lib/contracts";
import { useWorkspace } from "@/lib/store/workspace";
import { Markdown } from "./Markdown";
import { InlineNotes } from "@/components/notes/NotesMargin";

const RANK: Record<Depth, number> = { brief: 0, standard: 1, deep: 2 };

export function visibleSections(block: ArticleT, depth: Depth) {
  const shown = block.sections.filter((s) => RANK[s.depth] <= RANK[depth]);
  return shown.length ? shown : block.sections.slice(0, 1);
}

export function ArticleBlock({ block }: { block: ArticleT }) {
  const depth = useWorkspace((s) => s.depth);
  const sections = visibleSections(block, depth);
  const hidden = block.sections.length - sections.length;

  return (
    <div className="reading" data-article={block.id}>
      {sections.map((s, i) => {
        return (
          <section key={s.h} data-section={s.h} className={i ? "mt-7" : ""}>
            {(i > 0 || block.sections.length > 1) && (
              <h3 className="mb-2 flex items-baseline gap-2 font-serif text-[20px] font-semibold leading-[1.3]">
                {s.h}
                {s.depth === "deep" && (
                  <span className="font-sans text-[11px] font-normal uppercase tracking-wide text-muted">deep</span>
                )}
              </h3>
            )}
            <Markdown md={s.md} blockId={block.id} />
            <InlineNotes blockId={block.id} section={s.h} />
          </section>
        );
      })}
      {hidden > 0 && (
        <p className="mt-5 font-sans text-[13px] text-muted">
          {hidden} more section{hidden > 1 ? "s" : ""} at a greater depth.{" "}
          <button
            type="button"
            className="text-accent underline-offset-2 hover:underline"
            onClick={() => useWorkspace.getState().setDepth(depth === "brief" ? "standard" : "deep")}
          >
            Show {depth === "brief" ? "standard" : "deep"}
          </button>
        </p>
      )}
    </div>
  );
}
