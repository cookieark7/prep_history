"use client";

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { persist, createJSONStorage } from "zustand/middleware";
import { z } from "zod";
import {
  Block, type Depth, type FollowupKind, type Level, type Mode, type NoteKind, type Op, type QuizBlock,
} from "@/lib/contracts";
import { applyInverse, applyOp, type HistoryEntry, type StageState, type TurnContext } from "./reducer";
import { archiveLesson } from "./lessons";

export type Theme = "paper" | "sepia" | "ink";

export interface ChatEntry {
  id: string;
  role: "learner" | "director";
  text: string;
  landed: string[];
  followups: { kind: FollowupKind; label: string }[];
  status?: "streaming" | "done" | "error" | "aborted";
  /** the request to replay on Retry */
  retry?: { message: string | null; eventJson: string | null; sourceText?: string | null };
  /** learner line sent with a pasted-text card */
  attachment?: { words: number };
}

export interface Note {
  id: string;
  blockId: string;
  kind: NoteKind;
  quote: string;
  text: string;
  /** heading of the article section the quote came from, for margin alignment */
  section: string | null;
  at: number;
}

export interface GateState {
  answer: string | null;
  skipped: boolean;
}

export interface WorkspaceState extends StageState {
  lessonId: string;
  topic: string;
  depth: Depth;
  level: Level;
  theme: Theme;
  /** reading aids (fullscreen reading) */
  lineHeight: number;
  focusParagraph: boolean;
  chat: ChatEntry[];
  history: HistoryEntry[];
  mastery: Record<string, number>;
  notes: Note[];
  pinned: string[];
  gates: Record<string, GateState>;
  /** block id -> history entry id of the latest Director patch (shows "updated" + Undo) */
  patched: Record<string, string>;
  /** a client-built quiz (graph quiz / weak spots) shown in focus mode */
  localQuiz: QuizBlock | null;
  /** quiz id -> item id -> answered correctly */
  quizRuns: Record<string, Record<string, boolean>>;
  streaming: boolean;
  /** transient UI signals (not persisted) */
  flash: { id: string; node: string | null; nonce: number } | null;
  arrivals: Record<string, number>;
  chatOpen: boolean;
}

interface Actions {
  startLesson: (topic: string, level: Level) => void;
  loadSnapshot: (snap: PersistedWorkspace) => void;
  setTopic: (topic: string) => void;
  setMode: (mode: Mode) => void;
  setDepth: (depth: Depth) => void;
  setLevel: (level: Level) => void;
  setTheme: (theme: Theme) => void;
  setChatOpen: (open: boolean) => void;
  setReading: (p: { lineHeight?: number; focusParagraph?: boolean }) => void;
  focusBlock: (id: string | null, fullscreen: boolean) => void;
  exitFocus: () => void;

  beginTurn: (learnerText: string | null, retry: ChatEntry["retry"], attachmentWords?: number) => string;
  say: (entryId: string, text: string) => void;
  applyDirectorOp: (entryId: string, op: Op, turn: TurnContext) => void;
  followup: (entryId: string, f: { kind: FollowupKind; label: string }) => void;
  finishTurn: (entryId: string, status: "done" | "error" | "aborted") => void;

  undo: (historyId: string) => void;
  undoLatestFor: (blockId: string) => void;
  togglePin: (blockId: string) => void;
  flashBlock: (id: string, node?: string | null) => void;

  answerGate: (gateId: string, answer: string | null) => void;
  startQuiz: (quizId: string, local?: QuizBlock) => void;
  recordAnswer: (quizId: string, itemId: string, correct: boolean) => void;
  resetRun: (quizId: string) => void;
  updateMastery: (ref: string, correct: boolean) => void;
  addNote: (n: Omit<Note, "id" | "at">) => Note;
  removeNote: (id: string) => void;
}

const uid = (p: string) => `${p}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

const fresh = (): Omit<WorkspaceState, "theme" | "level" | "depth" | "chatOpen" | "lineHeight" | "focusParagraph"> => ({
  lessonId: uid("l"),
  topic: "",
  blocks: [],
  mode: "reader",
  focusId: null,
  fullscreen: false,
  chat: [],
  history: [],
  mastery: {},
  notes: [],
  pinned: [],
  gates: {},
  patched: {},
  localQuiz: null,
  quizRuns: {},
  streaming: false,
  flash: null,
  arrivals: {},
});

const TRANSIENT = ["streaming", "flash", "arrivals"] as const;
export type PersistedWorkspace = Omit<WorkspaceState, (typeof TRANSIENT)[number]>;

export const STORAGE_KEY = "chronicle:workspace";
export const STORAGE_VERSION = 1;

// Enough shape-checking to refuse a stale or corrupted save instead of crashing.
const PersistedShape = z.object({
  lessonId: z.string(),
  topic: z.string(),
  blocks: z.array(Block),
  mode: z.enum(["reader", "canvas", "timeline", "focus"]),
  depth: z.enum(["brief", "standard", "deep"]),
  level: z.enum(["new", "some", "advanced"]),
  chat: z.array(z.object({ id: z.string(), role: z.enum(["learner", "director"]), text: z.string() }).loose()),
  history: z.array(z.object({ id: z.string(), label: z.string() }).loose()),
  notes: z.array(z.object({ id: z.string(), blockId: z.string(), kind: z.string() }).loose()),
}).loose();

export const useWorkspace = create<WorkspaceState & Actions>()(
  persist(
    immer((set, get) => ({
      ...fresh(),
      depth: "standard",
      level: "some",
      theme: "paper",
      chatOpen: true,
      lineHeight: 1.7,
      focusParagraph: false,

      startLesson: (topic, level) => {
        const cur = get();
        if (cur.blocks.length) archiveLesson(snapshot(cur));
        set(() => ({ ...fresh(), topic, level, depth: "standard" }));
      },
      loadSnapshot: (snap) => {
        const cur = get();
        if (cur.blocks.length && cur.lessonId !== snap.lessonId) archiveLesson(snapshot(cur));
        set(() => ({ ...snap, streaming: false, flash: null, arrivals: {} }));
      },
      setTopic: (topic) => set((s) => { s.topic = topic; }),
      setMode: (mode) => set((s) => {
        s.mode = mode;
        if (mode !== "focus") s.fullscreen = false;
      }),
      setDepth: (depth) => set((s) => { s.depth = depth; }),
      setLevel: (level) => set((s) => { s.level = level; }),
      setTheme: (theme) => set((s) => { s.theme = theme; }),
      setChatOpen: (open) => set((s) => { s.chatOpen = open; }),
      setReading: (p) => set((s) => {
        if (p.lineHeight != null) s.lineHeight = Math.min(2.2, Math.max(1.4, p.lineHeight));
        if (p.focusParagraph != null) s.focusParagraph = p.focusParagraph;
      }),
      focusBlock: (id, fullscreen) => set((s) => { s.focusId = id; s.fullscreen = fullscreen; }),
      exitFocus: () => set((s) => {
        s.fullscreen = false;
        s.focusId = null;
        if (s.mode === "focus") s.mode = "reader";
      }),

      beginTurn: (learnerText, retry, attachmentWords) => {
        const id = uid("c");
        set((s) => {
          if (learnerText) {
            s.chat.push({
              id: uid("c"), role: "learner", text: learnerText, landed: [], followups: [],
              ...(attachmentWords ? { attachment: { words: attachmentWords } } : {}),
            });
          }
          s.chat.push({ id, role: "director", text: "", landed: [], followups: [], status: "streaming", retry });
          s.streaming = true;
          s.patched = {};
        });
        return id;
      },
      say: (entryId, text) => set((s) => {
        const e = s.chat.find((c) => c.id === entryId);
        if (e) e.text = text;
      }),
      applyDirectorOp: (entryId, op, turn) => {
        const s0 = get();
        const sameTurn = op.op === "patch" && turn.addedIds.includes(turn.renames[op.id] ?? op.id);
        const r = applyOp({ blocks: s0.blocks, mode: s0.mode, focusId: s0.focusId, fullscreen: s0.fullscreen }, op, turn);
        const stamp = Date.now();
        set((s) => {
          s.blocks = r.state.blocks as Block[];
          s.mode = r.state.mode;
          s.focusId = r.state.focusId;
          s.fullscreen = r.state.fullscreen;
          if (r.entry) s.history.push(r.entry);
          if (r.landed) {
            const e = s.chat.find((c) => c.id === entryId);
            if (e && !e.landed.includes(r.landed)) e.landed.push(r.landed);
            s.arrivals[r.landed] = stamp;
          }
          if (op.op === "patch" && r.landed && r.entry) {
            // E5: a section streamed into a block added earlier in this same turn just gets the
            // soft arrival edge; "updated / Undo" is for changes to blocks from earlier turns
            if (!sameTurn) s.patched[r.landed] = r.entry.id;
            // a Director patch that adds deep sections should be visible right away
            const set_ = op.set as { sections?: { depth?: string }[] };
            if (set_.sections?.some((x) => x.depth === "deep")) s.depth = "deep";
          }
          if (op.op === "remove") s.pinned = s.pinned.filter((p) => p !== op.id);
        });
        // the arrival highlight fades in 1.5s; drop the marker afterwards
        if (r.landed) {
          const id = r.landed;
          setTimeout(() => set((s) => { if (s.arrivals[id] === stamp) delete s.arrivals[id]; }), 1600);
        }
      },
      followup: (entryId, f) => set((s) => {
        const e = s.chat.find((c) => c.id === entryId);
        if (e && e.followups.length < 3) e.followups.push(f);
      }),
      finishTurn: (entryId, status) => set((s) => {
        const e = s.chat.find((c) => c.id === entryId);
        if (e) {
          e.status = status;
          if (status === "done") delete e.retry;
        }
        s.streaming = false;
      }),

      undo: (historyId) => {
        const s0 = get();
        const entry = s0.history.find((h) => h.id === historyId);
        if (!entry || entry.undone || !entry.inverse) return;
        const next = applyInverse({ blocks: s0.blocks, mode: s0.mode, focusId: s0.focusId, fullscreen: s0.fullscreen }, entry.inverse);
        set((s) => {
          s.blocks = next.blocks as Block[];
          s.mode = next.mode;
          s.focusId = next.focusId;
          s.fullscreen = next.fullscreen;
          const h = s.history.find((x) => x.id === historyId);
          if (h) h.undone = true;
          for (const [bid, hid] of Object.entries(s.patched)) if (hid === historyId) delete s.patched[bid];
        });
      },
      undoLatestFor: (blockId) => {
        const h = [...get().history].reverse().find((x) => x.blockId === blockId && !x.undone && x.inverse);
        if (h) get().undo(h.id);
      },
      togglePin: (blockId) => set((s) => {
        s.pinned = s.pinned.includes(blockId) ? s.pinned.filter((p) => p !== blockId) : [...s.pinned, blockId];
      }),
      flashBlock: (id, node = null) => set((s) => { s.flash = { id, node, nonce: Date.now() }; }),

      answerGate: (gateId, answer) => set((s) => {
        s.gates[gateId] = { answer, skipped: answer == null };
      }),
      startQuiz: (quizId, local) => set((s) => {
        if (local) s.localQuiz = local;
        s.mode = "focus";
        s.focusId = quizId;
        s.fullscreen = false;
      }),
      recordAnswer: (quizId, itemId, correct) => set((s) => {
        (s.quizRuns[quizId] ??= {})[itemId] = correct;
      }),
      resetRun: (quizId) => set((s) => { delete s.quizRuns[quizId]; }),
      updateMastery: (ref, correct) => set((s) => {
        const cur = s.mastery[ref] ?? 0.5;
        s.mastery[ref] = Math.min(1, Math.max(0, cur + (correct ? 0.25 : -0.35)));
      }),
      addNote: (n) => {
        const note: Note = { ...n, id: uid("n"), at: Date.now() };
        set((s) => { s.notes.push(note); });
        return note;
      },
      removeNote: (id) => set((s) => { s.notes = s.notes.filter((n) => n.id !== id); }),
    })),
    {
      name: STORAGE_KEY,
      version: STORAGE_VERSION,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (s) => persistable(s),
      // Schema mismatch: discard the save rather than crash.
      migrate: () => undefined as unknown as WorkspaceState,
      merge: (persisted, current) => {
        const ok = PersistedShape.safeParse(persisted);
        if (!ok.success) {
          if (persisted) console.warn("[chronicle] discarded saved workspace:", ok.error.issues[0]);
          return current;
        }
        return { ...current, ...(persisted as Partial<WorkspaceState>), streaming: false };
      },
    },
  ),
);

function persistable(s: WorkspaceState & Partial<Actions>): PersistedWorkspace {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(s)) {
    if (typeof v === "function" || (TRANSIENT as readonly string[]).includes(k)) continue;
    out[k] = v;
  }
  return out as unknown as PersistedWorkspace;
}

export function snapshot(s: WorkspaceState): PersistedWorkspace {
  return JSON.parse(JSON.stringify(persistable(s)));
}

/** Compact summary for the Director (id/type/title only) plus lowest mastery. */
export function workspaceSummary(s: WorkspaceState) {
  return {
    blocks: s.blocks.map((b) => ({ id: b.id, type: b.type, title: b.title })),
    level: s.level,
    mastery: Object.entries(s.mastery)
      .sort((a, b) => a[1] - b[1])
      .slice(0, 20)
      .map(([ref, strength]) => ({ ref, strength })),
  };
}
