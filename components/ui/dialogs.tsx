"use client";

import { useMemo, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useRouter } from "next/navigation";
import { useWorkspace, type Theme } from "@/lib/store/workspace";
import { sendTurn } from "@/lib/stream-client";
import { Icon, type IconName } from "./icons";
import { exportMarkdown } from "@/lib/export";
import { copyLesson } from "@/lib/copy-actions";
import { makeExamNotes } from "@/lib/goal";

const overlay = "scrim fixed inset-0 z-40 bg-[color-mix(in_srgb,var(--text)_18%,transparent)]";

/* ---------------- lesson history drawer ---------------- */
export function HistoryDrawer({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const history = useWorkspace((s) => s.history);
  const undo = useWorkspace((s) => s.undo);
  const list = [...history].reverse();
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={overlay} />
        <Dialog.Content className="panel-right fixed inset-y-0 right-0 z-50 flex w-full max-w-[400px] flex-col border-l border-rule bg-bg shadow-[var(--shadow-float)] outline-none">
          <div className="flex h-14 items-center justify-between border-b border-rule px-5">
            <Dialog.Title className="font-heading text-[18px] font-semibold">Lesson history</Dialog.Title>
            <Dialog.Close className="grid h-9 w-9 place-items-center rounded-md text-muted hover:bg-hover" aria-label="Close"><Icon.close /></Dialog.Close>
          </div>
          <Dialog.Description className="px-5 pt-3 text-[13px] text-muted">Every change made to this lesson, newest first. Undo any of them.</Dialog.Description>
          <ol className="scroll-thin mt-2 flex-1 overflow-y-auto overscroll-contain px-2 pb-6">
            {list.length === 0 && <li className="px-3 py-6 text-[13px] text-muted">No changes yet.</li>}
            {list.map((h) => (
              <li key={h.id} className="flex items-start gap-3 border-b border-rule px-3 py-2.5 last:border-0">
                <span className="tnum mt-0.5 w-12 shrink-0 text-[12px] text-muted">
                  {new Date(h.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
                <span className={`flex-1 text-[13px] leading-snug ${h.status === "undone" ? "text-muted line-through" : ""}`}>{h.label}</span>
                {h.inverse && h.status !== "undone" && (
                  <button type="button" onClick={() => undo(h.id)} className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-[12px] text-accent hover:bg-accent-soft">
                    <Icon.undo size={12} /> Undo
                  </button>
                )}
                {h.status === "undone" && <span className="text-[12.5px] text-muted">undone</span>}
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
  const goal = useWorkspace((s) => s.goal);
  const streaming = useWorkspace((s) => s.streaming);
  const theme = useWorkspace((s) => s.theme);

  const commands = useMemo<Cmd[]>(() => {
    const st = useWorkspace.getState();
    const themes: [Theme, string][] = [["light", "Light"], ["dark", "Dark"]];
    return [
      { id: "test", label: "Test me", icon: "test", run: () => void sendTurn({ message: "Quiz me on what we covered." }) },
      { id: "deeper", label: "Go deeper", icon: "deeper", run: () => void sendTurn({ message: "Go deeper" }) },
      { id: "canvas", label: "Open canvas", icon: "cause_graph", run: () => st.setMode("canvas") },
      { id: "timeline", label: "Open timeline view", icon: "timeline", run: () => st.setMode("timeline") },
      { id: "reader", label: "Back to reader", icon: "article", run: () => st.setMode("reader") },
      ...(goal === "explore" && st.blocks.length && !streaming ? [{ id: "exam-notes", label: "Make exam notes", icon: "test", run: () => void makeExamNotes() } satisfies Cmd] : []),
      ...themes.map(([t, name]): Cmd => ({ id: `theme-${t}`, label: `Switch theme: ${name}`, icon: "theme", hint: t === theme ? "current" : undefined, run: () => st.setTheme(t) })),
      { id: "history", label: "Lesson history", icon: "clock", run: onHistory },
      { id: "notes", label: "Notes", icon: "note", run: onNotes },
      { id: "copy", label: "Copy lesson", icon: "article", run: () => void copyLesson() },
      { id: "export", label: "Export as Markdown", icon: "download", run: () => exportMarkdown(useWorkspace.getState()) },
      { id: "dock", label: "Toggle dock", icon: "sidebar", hint: "⌘\\", run: () => st.setChatOpen(!useWorkspace.getState().chatOpen) },
      { id: "shortcuts", label: "Keyboard shortcuts", icon: "keyboard", hint: "?", run: onShortcuts },
      { id: "new", label: "New lesson", icon: "back", hint: "N", run: () => router.push("/start") },
      { id: "review", label: "Review cards", icon: "test", run: () => router.push("/review") },
      { id: "progress", label: "Your progress", icon: "clock", run: () => router.push("/stats") },
    ];
  }, [goal, streaming, theme, onHistory, onNotes, onShortcuts, router]);

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
          className="fixed left-1/2 top-[14dvh] z-50 w-[min(560px,calc(100vw-32px))] -translate-x-1/2 overflow-hidden rounded-md border border-rule bg-surface shadow-[var(--shadow-float)] outline-none"
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
              className="h-12 flex-1 bg-transparent text-[14px] pointer-coarse:text-[16px] outline-none placeholder:text-muted"
            />
          </div>
          <ul className="scroll-thin max-h-[50dvh] overflow-y-auto overscroll-contain p-1.5" role="listbox">
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
                    {c.hint && <span className="ml-auto font-mono text-[12px] text-muted">{c.hint}</span>}
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
// Exactly what components/stage/useShortcuts.ts (and the canvas, rail, composer, quiz) wire up.
const SHORTCUTS: { group: string; keys: [string, string][] }[] = [
  { group: "Lesson", keys: [
    ["j / k", "Next / previous part"],
    ["f", "Fullscreen the current part"],
    ["c", "Copy the current part"],
    ["p", "Pin or unpin the current part"],
    ["u", "Undo the last change to the current part"],
    ["N", "New lesson"],
    ["Esc", "Exit fullscreen, focus or canvas; stop a reply"],
  ] },
  { group: "Anywhere", keys: [
    ["/", "Jump to the composer"],
    ["⌘K", "Command palette"],
    ["⌘\\", "Show or hide the chat"],
    ["?", "This sheet"],
  ] },
  { group: "Composer", keys: [["Enter", "Send"], ["Shift Enter", "New line"]] },
  { group: "Canvas", keys: [["v / n / p", "Select / Note / Highlight path"]] },
  { group: "Lesson line", keys: [["↑ / ↓", "Move between parts"], ["Enter", "Jump to the part"]] },
  { group: "Quiz", keys: [["1-5", "Choose an option"], ["Enter", "Check, then next"]] },
];

export function ShortcutsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={overlay} />
        <Dialog.Content className="fixed left-1/2 top-[18dvh] z-50 w-[min(420px,calc(100vw-32px))] -translate-x-1/2 rounded-md border border-rule bg-surface p-5 shadow-[var(--shadow-float)] outline-none" aria-describedby={undefined}>
          <Dialog.Title className="mb-3 font-heading text-[18px] font-semibold">Keyboard shortcuts</Dialog.Title>
          <div className="scroll-thin max-h-[60dvh] space-y-4 overflow-y-auto overscroll-contain pr-1">
            {SHORTCUTS.map((g) => (
              <section key={g.group}>
                <h3 className="mb-1.5 text-[12.5px] font-medium text-muted">{g.group}</h3>
                <dl className="space-y-1.5 text-[13.5px]">
                  {g.keys.map(([k, v]) => (
                    <div key={k + v} className="flex items-center justify-between gap-4">
                      <dt className="text-muted">{v}</dt>
                      <dd><kbd className="whitespace-nowrap rounded border border-rule px-1.5 py-0.5 font-mono text-[12px]">{k}</kbd></dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
