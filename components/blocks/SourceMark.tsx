"use client";

import * as Popover from "@radix-ui/react-popover";
import { useWorkspace } from "@/lib/store/workspace";

/**
 * A citation in lesson text: a small number that opens the passage it rests on, with its
 * article, a link and the licence (docs/PROTOTYPE_PLAN.md, section 6.6). Numbers follow the
 * order in which the lesson's sources arrived, so the same passage keeps its number.
 */
export function SourceMark({ id }: { id: string }) {
  const sources = useWorkspace((s) => s.sources);
  const index = (sources ?? []).findIndex((x) => x.id === id);
  const source = index >= 0 ? sources[index] : null;
  const n = index >= 0 ? index + 1 : null;
  const section = source?.heading.split(" › ").slice(1).join(" › ");

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="mx-px inline-flex translate-y-[-0.45em] items-center rounded-[3px] px-[3px] font-mono text-[10.5px] leading-none text-accent hover:bg-accent-soft"
          aria-label={source ? `Source ${n}: ${source.title}` : "Source"}
        >
          {n ?? "·"}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          sideOffset={6}
          collisionPadding={12}
          className="fade-up z-50 w-80 max-w-[calc(100vw-24px)] rounded-md border border-rule bg-surface p-3 font-sans text-[13px] leading-snug text-text shadow-[var(--shadow-float)]"
        >
          {source ? (
            <>
              <p className="text-[11px] uppercase tracking-wide text-muted">Source {n}</p>
              <p className="mt-0.5 font-heading text-[16px] leading-tight">{source.title}</p>
              {section && <p className="mt-0.5 text-[12px] text-muted">{section}</p>}
              <blockquote className="mt-2 border-l-2 border-rule pl-2.5 text-[13px] leading-relaxed text-muted">{source.excerpt}</blockquote>
              <div className="mt-2.5 flex items-center justify-between gap-3 text-[12px]">
                <a href={source.url} target="_blank" rel="noreferrer" className="font-medium text-accent underline-offset-2 hover:underline">
                  Read the article
                </a>
                <span className="text-muted">Wikipedia · {source.license}</span>
              </div>
            </>
          ) : (
            <p className="text-muted">The source details arrive when this answer finishes.</p>
          )}
          <Popover.Arrow className="fill-[var(--surface)]" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
