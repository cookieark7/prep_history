"use client";

import ReactMarkdown, { defaultUrlTransform } from "react-markdown";
import * as HoverCard from "@radix-ui/react-hover-card";
import type { Confidence } from "@/lib/contracts";
import { ConfidenceTag } from "@/components/ui/marks";
import { SourceMark } from "./SourceMark";
import { findMentions, preprocessMarkdown, type EntityType } from "@/lib/entities";
import { useWorkspace } from "@/lib/store/workspace";
import { sendTurn } from "@/lib/stream-client";
import { TYPE_LABEL } from "@/lib/store/reducer";
import { scrollToEl } from "@/lib/scroll";

const urlTransform = (url: string) =>
  /^(entity|conf|src):/.test(url) ? url : defaultUrlTransform(url);

export function Markdown({ md, blockId }: { md: string; blockId: string }) {
  const source = preprocessMarkdown(md);
  return (
    <ReactMarkdown
      urlTransform={urlTransform}
      components={{
        a: ({ href = "", children }) => {
          if (href.startsWith("conf:")) return <ConfidenceTag c={href.slice(5) as Confidence} />;
          if (href.startsWith("src:")) return <SourceMark id={href.slice(4)} />;
          if (href.startsWith("entity:")) {
            return <Entity name={String(children)} type={href.slice(7) as EntityType} blockId={blockId} />;
          }
          return <a href={href} target="_blank" rel="noreferrer" className="text-accent underline underline-offset-2">{children}</a>;
        },
      }}
    >
      {source}
    </ReactMarkdown>
  );
}

const TYPE_WORD: Record<EntityType, string> = { person: "Person", place: "Place", event: "Event", term: "Term" };

function Entity({ name, type, blockId }: { name: string; type: EntityType; blockId: string }) {
  const blocks = useWorkspace((s) => s.blocks);
  const flashBlock = useWorkspace((s) => s.flashBlock);
  const mentions = findMentions(blocks, name).filter((m) => m.blockId !== blockId || m.node);
  return (
    <HoverCard.Root openDelay={250} closeDelay={120}>
      <HoverCard.Trigger asChild>
        <button
          type="button"
          className="cursor-help border-b border-dotted border-[color-mix(in_srgb,var(--text)_45%,transparent)] text-inherit hover:border-accent hover:text-accent"
          onClick={() => askAbout(name, blockId)}
        >
          {name}
        </button>
      </HoverCard.Trigger>
      <HoverCard.Portal>
        <HoverCard.Content
          sideOffset={6}
          className="fade-up z-50 w-72 rounded-md border border-rule bg-surface p-3 font-sans text-[13px] text-text shadow-[var(--shadow-float)]"
        >
          <p className="text-[11px] uppercase tracking-wide text-muted">{TYPE_WORD[type]}</p>
          <p className="mt-0.5 font-heading text-[17px] leading-tight">{name}</p>
          {mentions.length > 0 ? (
            <ul className="mt-2 space-y-1 border-t border-rule pt-2">
              {mentions.map((m) => (
                <li key={`${m.blockId}-${m.node}`}>
                  <button
                    type="button"
                    className="w-full rounded px-1 py-0.5 text-left hover:bg-hover"
                    onClick={() => scrollToBlock(m.blockId, m.node, flashBlock)}
                  >
                    <span className="text-muted">{m.where}:</span> {m.label}
                    {m.when && <span className="tnum text-[12px] ml-1 text-muted">{m.when}</span>}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-muted">Not elsewhere in this lesson yet.</p>
          )}
          <button
            type="button"
            onClick={() => askAbout(name, blockId)}
            className="mt-3 inline-flex h-8 items-center rounded-md border border-rule px-2.5 text-[13px] hover:border-accent hover:text-accent"
          >
            Ask about this
          </button>
          <HoverCard.Arrow className="fill-[var(--surface)]" />
        </HoverCard.Content>
      </HoverCard.Portal>
    </HoverCard.Root>
  );
}

function askAbout(name: string, blockId: string) {
  void sendTurn({ event: { event: "ask_why", block_id: blockId, selection: name }, echo: `Ask about ${name}` });
}

export function scrollToBlock(id: string, node: string | null, flash: (id: string, node?: string | null) => void) {
  const el = document.getElementById(`block-${id}`);
  scrollToEl(el);
  flash(id, node);
}

export function blockLabel(type: keyof typeof TYPE_LABEL, title: string) {
  return `${TYPE_LABEL[type]}: ${title}`;
}
