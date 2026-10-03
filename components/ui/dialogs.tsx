"use client";

import { useMemo, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useRouter } from "next/navigation";
import { useWorkspace, type Theme } from "@/lib/store/workspace";
import { sendTurn } from "@/lib/stream-client";
import { Icon, type IconName } from "./icons";
import { exportMarkdown } from "@/lib/export";
import type { Level } from "@/lib/contracts";

const overlay = "fixed inset-0 z-40 bg-[color-mix(in_srgb,var(--text)_18%,transparent)]";

/* ---------------- lesson history drawer ---------------- */
export function HistoryDrawer({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const history = useWorkspace((s) => s.history);
  const undo = useWorkspace((s) => s.undo);
  const list = [...history].reverse();
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={overlay} />
        <Dialog.Content className="fade-up fixed inset-y-0 right-0 z-50 flex w-full max-w-[400px] flex-col border-l border-rule bg-bg shadow-[var(--shadow-float)] outline-none">
          <div className="flex h-14 items-center justify-between border-b border-rule px-5">
            <Dialog.Title className="font-serif text-[18px] font-semibold">Lesson history</Dialog.Title>
            <Dialog.Close className="grid h-9 w-9 place-items-center rounded-md text-muted hover:bg-hover" aria-label="Close"><Icon.close /></Dialog.Close>
          </div>
          <Dialog.Description className="px-5 pt-3 text-[13px] text-muted">Every change the Director made to the Stage, newest first. Undo any of them.</Dialog.Description>
          <ol className="scroll-thin mt-2 flex-1 overflow-y-auto px-2 pb-6">
            {list.length === 0 && <li className="px-3 py-6 text-[13px] text-muted">No changes yet.</li>}
            {list.map((h) => (
              <li key={h.id} className="flex items-start gap-3 border-b border-rule px-3 py-2.5 last:border-0">
                <span className="mono-tab mt-0.5 w-12 shrink-0 text-[11px] text-muted">
                  {new Date(h.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
                <span className={`flex-1 text-[13px] leading-snug ${h.undone ? "text-muted line-through" : ""}`}>{h.label}</span>
                {h.inverse && !h.undone && (
                  <button type="button" onClick={() => undo(h.id)} className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-[12px] text-accent hover:bg-accent-soft">
                    <Icon.undo size={12} /> Undo
                  </button>
                )}
                {h.undone && <span className="text-[11.5px] text-muted">undone</span>}
              </li>
            ))}
          </ol>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/* ---------------- command palette ---------------- */
interface Cmd { id: string; label: string; icon: IconName; hint?: string; run: () => void }

export function CommandPalette({
  open, onOpenChange, onHistory, onNotes, onShortcuts,
}: { open: boolean; onOpenChange: (o: boolean) => void; onHistory: () => void; onNotes: () => void; onShortcuts: () => void }) {
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const router = useRouter();
  const level = useWorkspace((s) => s.level);
  const theme = useWorkspace((s) => s.theme);

  const commands = useMemo<Cmd[]>(() => {
    const st = useWorkspace.getState();
    const levels: [Level, string][] = [["new", "New to this"], ["some", "Some background"], ["advanced", "Revising / advanced"]];
    const themes: [Theme, string][] = [["paper", "Paper"], ["sepia", "Sepia"], ["ink", "Ink"]];
    return [
      { id: "test", label: "Test me", icon: "test", run: () => void sendTurn({ message: "Quiz me on what we covered." }) },
      { id: "deeper", label: "Go deeper", icon: "deeper", run: () => void sendTurn({ message: "Go deeper" }) },
      { id: "canvas", label: "Open canvas", icon: "cause_graph", run: () => st.setMode("canvas") },
      { id: "timeline", label: "Open timeline view", icon: "timeline", run: () => st.setMode("timeline") },
      { id: "reader", label: "Back to reader", icon: "article", run: () => st.setMode("reader") },
      ...levels.map(([l, name]): Cmd => ({ id: `level-${l}`, label: `Change level: ${name}`, icon: "chevronRight", hint: l === level ? "current" : undefined, run: () => st.setLevel(l) })),
      ...themes.map(([t, name]): Cmd => ({ id: `theme-${t}`, label: `Switch theme: ${name}`, icon: "theme", hint: t === theme ? "current" : undefined, run: () => st.setTheme(t) })),
      { id: "history", label: "Lesson history", icon: "clock", run: onHistory },
      { id: "notes", label: "Notes", icon: "note", run: onNotes },
      { id: "export", label: "Export as Markdown", icon: "download", run: () => exportMarkdown(useWorkspace.getState()) },
      { id: "shortcuts", label: "Keyboard shortcuts", icon: "keyboard", hint: "?", run: onShortcuts },
      { id: "new", label: "New lesson", icon: "back", run: () => router.push("/") },
    ];
  }, [level, theme, onHistory, onNotes, onShortcuts, router]);

  const filtered = commands.filter((c) => c.label.toLowerCase().includes(q.trim().toLowerCase()));
  const run = (c: Cmd | undefined) => {
    if (!c) return;
    onOpenChange(false);
    setQ("");
    setTimeout(c.run, 0);
  };

  return (
    <Dialog.Root open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setQ(""); setActive(0); }}>
      <Dialog.Portal>
        <Dialog.Overlay className={overlay} />
        <Dialog.Content
          className="fade-up fixed left-1/2 top-[14vh] z-50 w-[min(560px,calc(100vw-32px))] -translate-x-1/2 overflow-hidden rounded-md border border-rule bg-surface shadow-[var(--shadow-float)] outline-none"
          aria-describedby={undefined}
        >
          <Dialog.Title className="sr-only">Command palette</Dialog.Title>
          <div className="flex items-center gap-2 border-b border-rule px-4">
            <Icon.search className="text-muted" />
            <input
              autoFocus
              value={q}
              onChange={(e) => { setQ(e.target.value); setActive(0); }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, filtered.length - 1)); }
                if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
                if (e.key === "Enter") { e.preventDefault(); run(filtered[active]); }
              }}
              placeholder="Type a command"
              aria-label="Command"
              className="h-12 flex-1 bg-transparent text-[14px] outline-none placeholder:text-muted"
            />
          </div>
          <ul className="scroll-thin max-h-[50vh] overflow-y-auto p-1.5" role="listbox">
            {filtered.map((c, i) => {
              const I = Icon[c.icon];
              return (
                <li key={c.id} role="option" aria-selected={i === active}>
                  <button
                    type="button"
                    onMouseEnter={() => setActive(i)}
                    onClick={() => run(c)}
                    className={`flex h-10 w-full items-center gap-3 rounded-md px-3 text-left text-[13.5px] ${i === active ? "bg-hover" : ""}`}
                  >
                    <I size={14} className="text-muted" />
                    {c.label}
                    {c.hint && <span className="ml-auto font-mono text-[11px] text-muted">{c.hint}</span>}
                  </button>
                </li>
              );
            })}
            {!filtered.length && <li className="px-3 py-4 text-[13px] text-muted">No matching command.</li>}
          </ul>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/* ---------------- shortcuts ---------------- */
const SHORTCUTS: [string, string][] = [
  ["j / k", "Next / previous block"],
  ["f", "Fullscreen the current block"],
  ["Esc", "Exit fullscreen or focus; stop a reply"],
  ["⌘K", "Command palette"],
  ["⌘\\", "Show or hide the chat"],
  ["/", "Jump to the composer"],
  ["?", "This sheet"],
];

export function ShortcutsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={overlay} />
        <Dialog.Content className="fade-up fixed left-1/2 top-[18vh] z-50 w-[min(420px,calc(100vw-32px))] -translate-x-1/2 rounded-md border border-rule bg-surface p-5 shadow-[var(--shadow-float)] outline-none" aria-describedby={undefined}>
          <Dialog.Title className="mb-3 font-serif text-[18px] font-semibold">Keyboard shortcuts</Dialog.Title>
          <dl className="space-y-2 text-[13.5px]">
            {SHORTCUTS.map(([k, v]) => (
              <div key={k} className="flex items-center justify-between gap-4">
                <dt className="text-muted">{v}</dt>
                <dd><kbd className="rounded border border-rule px-1.5 py-0.5 font-mono text-[12px]">{k}</kbd></dd>
              </div>
            ))}
          </dl>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
