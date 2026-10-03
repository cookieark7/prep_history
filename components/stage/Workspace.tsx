"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useWorkspace } from "@/lib/store/workspace";
import { useHydrated, ThemeSync } from "@/components/ui/hydration";
import { ChatDock } from "@/components/chat/ChatDock";
import { CommandBar } from "@/components/chat/CommandBar";
import { CommandPalette, HistoryDrawer, ShortcutsDialog } from "@/components/ui/dialogs";
import { TopBar } from "./TopBar";
import { ReaderStage } from "./Stage";
import { MobileChrome } from "./Mobile";
import { FullscreenOverlay } from "./Fullscreen";
import { Announcer } from "./Announcer";
import { useShortcuts } from "./useShortcuts";
import { ModeView } from "./ModeView";
import { FocusView } from "@/components/quiz/FocusView";
import { NotesMargin, NotesPanel } from "@/components/notes/NotesMargin";
import { SelectionToolbar, useNoteHighlights } from "@/components/notes/NotesLayer";
import "@/components/blocks/all";

export function Workspace() {
  const hydrated = useHydrated();
  const chatOpen = useWorkspace((s) => s.chatOpen);
  const dockWidth = useWorkspace((s) => s.dockWidth);
  const mode = useWorkspace((s) => s.mode);
  const wide = mode === "canvas" || mode === "timeline";
  const [historyOpen, setHistoryOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);

  const openPalette = useCallback(() => setPaletteOpen(true), []);
  const openShortcuts = useCallback(() => setShortcutsOpen(true), []);
  const openHistory = useCallback(() => setHistoryOpen(true), []);
  const openNotes = useCallback(() => setNotesOpen(true), []);
  // each mode starts at the top, with the top bar visible
  useEffect(() => { window.scrollTo(0, 0); }, [mode]);
  const anyDialogOpen = historyOpen || paletteOpen || shortcutsOpen || notesOpen;
  useShortcuts(useMemo(() => ({ palette: openPalette, shortcuts: openShortcuts, anyDialogOpen }), [openPalette, openShortcuts, anyDialogOpen]));

  useNoteHighlights();

  if (!hydrated) return <div className="min-h-screen bg-bg" />;

  return (
    <>
      <ThemeSync />
      {wide ? <CommandBar /> : <ChatDock />}
      <main
        style={{ "--dock-w": `${dockWidth}px` } as React.CSSProperties}
        className={`min-h-screen ${chatOpen && !wide ? "md:pl-[var(--dock-w)]" : ""} pb-44 md:pb-0`}
      >
        <TopBar onHistory={openHistory} onPalette={openPalette} />
        {mode === "reader" || mode === "focus" ? <ReaderStage margin={<NotesMargin />} /> : <ModeView mode={mode} />}
      </main>
      <MobileChrome />
      {mode === "focus" && <FocusView />}
      <FullscreenOverlay onNotes={openNotes} />
      <SelectionToolbar />
      <Announcer />
      <HistoryDrawer open={historyOpen} onOpenChange={setHistoryOpen} />
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} onHistory={openHistory} onNotes={openNotes} onShortcuts={openShortcuts} />
      <ShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
      <NotesPanel open={notesOpen} onOpenChange={setNotesOpen} />
    </>
  );
}
