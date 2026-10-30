"use client";

import { useEffect, useState } from "react";
import type { Depth, Mode } from "@/lib/contracts";
import Link from "next/link";
import * as Popover from "@radix-ui/react-popover";
import { useWorkspace } from "@/lib/store/workspace";
import { Icon } from "@/components/ui/icons";
import { JumpToSheet, LessonProgress } from "./LessonRail";
import { copyLesson } from "@/lib/copy-actions";

// Plain names for the four views of one lesson (the ids stay as the contracts have them).
export const MODES: { id: Mode; label: string }[] = [
  { id: "reader", label: "Read" },
  { id: "canvas", label: "Map" },
  { id: "timeline", label: "Timeline" },
  { id: "focus", label: "Quiz" },
];
const DEPTHS: { id: Depth; label: string }[] = [
  { id: "brief", label: "Brief" },
  { id: "standard", label: "Standard" },
  { id: "deep", label: "Deep" },
];

export function Segmented<T extends string>({
  value, options, onChange, label, size = "md",
}: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void; label: string; size?: "sm" | "md" }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-md border border-rule bg-surface p-0.5">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={value === o.id}
          onClick={() => onChange(o.id)}
          className={`rounded-[5px] px-2.5 ${size === "sm" ? "h-7 text-[12px]" : "h-8 text-[13px]"} ${
            value === o.id ? "bg-text text-bg" : "text-muted hover:text-text"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function TopBar({ onHistory, onPalette }: { onHistory: () => void; onPalette: () => void }) {
  const mode = useWorkspace((s) => s.mode);
  const chatOpen = useWorkspace((s) => s.chatOpen);
  const { hidden, progress } = useScrollChrome();
  const setMode = (m: Mode) => useWorkspace.getState().setMode(m);

  return (
    <header
      className={`sticky top-0 z-20 border-b border-rule bg-[color-mix(in_srgb,var(--bg)_94%,transparent)] backdrop-blur-[2px] transition-transform duration-200 ${
        hidden ? "-translate-y-full" : ""
      }`}
    >
      <div className="flex h-14 min-w-0 items-center gap-1 px-2 md:gap-3 md:px-6">
        {!chatOpen && (
          <button
            type="button"
            onClick={() => useWorkspace.getState().setChatOpen(true)}
            className="hidden h-9 w-9 place-items-center rounded-md text-muted hover:bg-hover hover:text-text md:grid"
            aria-label="Open chat (Cmd+\)"
            title="Open chat (⌘\)"
          >
            <Icon.sidebar />
          </button>
        )}
        <Link href="/start" className="grid h-11 w-11 place-items-center rounded-md text-muted hover:bg-hover hover:text-text md:hidden" aria-label="Back to Learn">
          <Icon.back size={18} />
        </Link>
        <nav aria-label="Lesson view" className="hidden h-14 items-stretch md:flex">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              aria-pressed={mode === m.id}
              onClick={() => setMode(m.id)}
              className={`-mb-px border-b-2 px-3 text-[14.5px] ${mode === m.id ? "border-line font-semibold text-text" : "border-transparent text-muted hover:text-text"}`}
            >
              {m.label}
            </button>
          ))}
        </nav>
        <ViewMenu mode={mode} onChange={setMode} />
        <div className="ml-auto flex items-center gap-1">
          <JumpToSheet />
          <MoreMenu onHistory={onHistory} onPalette={onPalette} />
        </div>
      </div>
      {mode === "reader" && <LessonProgress className="md:hidden" />}
      <div className="h-px bg-transparent">
        <div className="h-px bg-accent transition-[width] duration-100" style={{ width: `${progress * 100}%` }} />
      </div>
    </header>
  );
}

/** Phones: the four views behind one button, so the lesson keeps the screen. */
function ViewMenu({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button type="button" className="inline-flex h-11 items-center gap-1.5 rounded-md px-2.5 text-[15px] font-semibold hover:bg-hover md:hidden" aria-label={`View: ${MODES.find((m) => m.id === mode)?.label}. Change view`}>
          {MODES.find((m) => m.id === mode)?.label} <Icon.chevronDown size={14} className="text-muted" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="start" sideOffset={4} className="pop z-50 w-48 rounded-md border border-rule bg-surface p-1 text-text shadow-[var(--shadow-float)]">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              aria-pressed={mode === m.id}
              onClick={() => { onChange(m.id); setOpen(false); }}
              className={`flex h-11 w-full items-center gap-2 rounded px-2.5 text-left text-[15px] hover:bg-hover ${mode === m.id ? "font-semibold" : ""}`}
            >
              {m.label}
              {mode === m.id && <Icon.check size={14} className="ml-auto" />}
            </button>
          ))}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

/** Everything that is not reading: how much of each article to show, the change history, copy, commands. */
function MoreMenu({ onHistory, onPalette }: { onHistory: () => void; onPalette: () => void }) {
  const depth = useWorkspace((s) => s.depth);
  const historyCount = useWorkspace((s) => s.history.filter((h) => h.status !== "undone").length);
  const hasBlocks = useWorkspace((s) => s.blocks.length > 0);
  const [copied, setCopied] = useState(false);
  const item = "flex h-10 w-full items-center gap-2.5 rounded px-2.5 text-left text-[14px] hover:bg-hover disabled:opacity-40";
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button type="button" className="grid h-11 w-11 place-items-center rounded-md text-muted hover:bg-hover hover:text-text md:h-9 md:w-9" aria-label="More">
          <Icon.more />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="end" sideOffset={4} className="pop z-50 w-64 rounded-md border border-rule bg-surface p-1 text-text shadow-[var(--shadow-float)]">
          <p className="px-2.5 pb-1.5 pt-2 text-[12.5px] text-muted">How much of each article to show</p>
          <div className="px-1.5 pb-2">
            <Segmented label="How much of each article to show" size="sm" value={depth} options={DEPTHS} onChange={(d) => useWorkspace.getState().setDepth(d)} />
          </div>
          <div className="my-1 h-px bg-rule" />
          <Popover.Close asChild>
            <button type="button" className={item} onClick={onHistory}>
              <Icon.clock size={15} /> Lesson history <span className="ml-auto text-[12.5px] text-muted tnum">{historyCount}</span>
            </button>
          </Popover.Close>
          <button
            type="button"
            className={item}
            disabled={!hasBlocks}
            onClick={async () => {
              if (await copyLesson()) {
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }
            }}
          >
            {copied ? <Icon.check size={15} className="text-ok" /> : <Icon.article size={15} />}
            <span aria-live="polite">{copied ? "Copied" : "Copy lesson"}</span>
          </button>
          <Popover.Close asChild>
            <button type="button" className={`${item} pointer-coarse:hidden`} onClick={onPalette}>
              <Icon.search size={15} /> Commands <kbd className="ml-auto font-mono text-[12.5px] text-muted">⌘K</kbd>
            </button>
          </Popover.Close>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

/** Hide chrome on scroll-down, show on scroll-up; report reading progress. */
function useScrollChrome() {
  const [hidden, setHidden] = useState(false);
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? Math.min(1, y / max) : 0);
      if (Math.abs(y - last) < 6) return;
      setHidden(y > last && y > 80);
      last = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return { hidden, progress };
}
