"use client";

import { useEffect, useState } from "react";
import type { Depth, Mode } from "@/lib/contracts";
import Link from "next/link";
import { useWorkspace } from "@/lib/store/workspace";
import { Icon } from "@/components/ui/icons";

export const MODES: { id: Mode; label: string }[] = [
  { id: "reader", label: "Reader" },
  { id: "canvas", label: "Canvas" },
  { id: "timeline", label: "Timeline" },
  { id: "focus", label: "Focus" },
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
  const topic = useWorkspace((s) => s.topic);
  const mode = useWorkspace((s) => s.mode);
  const depth = useWorkspace((s) => s.depth);
  const chatOpen = useWorkspace((s) => s.chatOpen);
  const historyCount = useWorkspace((s) => s.history.filter((h) => !h.undone).length);
  const { hidden, progress } = useScrollChrome();

  return (
    <header
      className={`sticky top-0 z-20 border-b border-rule bg-[color-mix(in_srgb,var(--bg)_94%,transparent)] backdrop-blur-[2px] transition-transform duration-200 ${
        hidden ? "-translate-y-full" : ""
      }`}
    >
      <div className="flex h-14 items-center gap-3 px-4 md:px-6">
        {!chatOpen && (
          <button
            type="button"
            onClick={() => useWorkspace.getState().setChatOpen(true)}
            className="hidden h-8 w-8 place-items-center rounded-md text-muted hover:bg-hover hover:text-text md:grid"
            aria-label="Open chat (Cmd+\)"
            title="Open chat (⌘\)"
          >
            <Icon.sidebar />
          </button>
        )}
        <Link href="/" className="font-serif text-[17px] font-semibold md:hidden">Chronicle</Link>
        <label className="sr-only" htmlFor="topic">Lesson topic</label>
        <input
          id="topic"
          value={topic}
          onChange={(e) => useWorkspace.getState().setTopic(e.target.value)}
          placeholder="Untitled lesson"
          className="hidden min-w-0 flex-1 truncate rounded-md bg-transparent px-1.5 py-1 font-serif text-[17px] text-text outline-none hover:bg-hover focus:bg-hover sm:block"
        />
        <div className="ml-auto flex items-center gap-2">
          <div className="hidden lg:block">
            <Segmented label="Mode" value={mode} options={MODES} onChange={(m) => useWorkspace.getState().setMode(m)} />
          </div>
          <Segmented label="Depth" size="sm" value={depth} options={DEPTHS} onChange={(d) => useWorkspace.getState().setDepth(d)} />
          <button
            type="button"
            onClick={onHistory}
            className="relative grid h-9 w-9 place-items-center rounded-md text-muted hover:bg-hover hover:text-text"
            aria-label={`Lesson history (${historyCount} changes)`}
            title="Lesson history"
          >
            <Icon.clock />
          </button>
          <button
            type="button"
            onClick={onPalette}
            className="hidden h-9 w-9 place-items-center rounded-md text-muted hover:bg-hover hover:text-text sm:grid"
            aria-label="Command palette (Cmd+K)"
            title="Commands (⌘K)"
          >
            <Icon.search />
          </button>
        </div>
      </div>
      <div className="h-px bg-transparent">
        <div className="h-px bg-accent transition-[width] duration-100" style={{ width: `${progress * 100}%` }} />
      </div>
    </header>
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
