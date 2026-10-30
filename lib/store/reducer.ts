import { Block, blockProblem, type ArticleBlock, type Mode, type Op } from "@/lib/contracts";

type ArticleSection = ArticleBlock["sections"][number];

/** The part of the workspace that Director ops act on. */
export interface StageState {
  blocks: Block[];
  mode: Mode;
  focusId: string | null;
  fullscreen: boolean;
}

/** Serializable inverse of an applied op (an undo "closure" that survives localStorage). */
export type Inverse =
  | { kind: "remove"; id: string }
  | { kind: "restore"; block: Block; index: number }
  | { kind: "replace"; block: Block }
  /** undo one article-section patch: drop the headings it appended, restore the ones it replaced */
  | { kind: "sections"; id: string; remove: string[]; restore: ArticleSection[] }
  | { kind: "view"; mode: Mode; focusId: string | null; fullscreen: boolean };

export type StepStatus = "applied" | "skipped" | "undone";

/**
 * One step of the trace (v0.1 E3). The landed chips in a reply, the lesson-history drawer
 * and the lesson rail all read these entries; there is no parallel structure.
 */
export interface HistoryEntry {
  id: string;
  op: Op["op"];
  label: string;
  blockId: string | null;
  status: StepStatus;
  at: number;
  /** id of the Director chat entry (turn) that produced it */
  turn: string | null;
  inverse: Inverse | null; // null: nothing to undo (e.g. a skipped update)
}

/** Per-turn bookkeeping so ids renamed on collision are rewritten in later ops of the same turn. */
export interface TurnContext {
  renames: Record<string, string>;
  addedIds: string[];
}

export const newTurnContext = (): TurnContext => ({ renames: {}, addedIds: [] });

export interface OpResult {
  state: StageState;
  entry: HistoryEntry | null;
  /** block id that was added or patched in this op, for "landed" chips */
  landed: string | null;
}

export const TYPE_LABEL: Record<Block["type"], string> = {
  article: "Article",
  cause_graph: "Cause map",
  timeline: "Timeline",
  lineage: "Lineage",
  predict_gate: "Prediction",
  quiz: "Quiz",
  callout: "Aside",
};

let seq = 0;
const entryId = () => `h${Date.now().toString(36)}${(seq++).toString(36)}`;

function nextFreeId(blocks: Block[], taken: Iterable<string> = []): string {
  const used = new Set([...blocks.map((b) => b.id), ...taken]);
  let max = 0;
  for (const id of used) {
    const m = /^b(\d+)$/.exec(id);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `b${max + 1}`;
}

/** Rewrite same-turn references (reveals, source_ref) from a renamed id. */
function rewriteRefs(block: Block, renames: Record<string, string>): Block {
  const map = (id: string) => renames[id] ?? id;
  if (block.type === "predict_gate" && renames[block.reveals]) return { ...block, reveals: map(block.reveals) };
  if (block.type === "quiz" && block.items.some((i) => renames[i.source_ref.block])) {
    return {
      ...block,
      items: block.items.map((i) => ({ ...i, source_ref: { ...i.source_ref, block: map(i.source_ref.block) } })),
    };
  }
  return block;
}

/** Merge a patch into a block. Article sections merge by heading. */
export function mergePatch(block: Block, set: Record<string, unknown>): unknown {
  const { id: _id, type: _type, ...rest } = set; // a patch never changes identity
  void _id; void _type;
  const merged: Record<string, unknown> = { ...block, ...rest };
  if (block.type === "article" && Array.isArray(rest.sections)) {
    const sections = [...block.sections];
    for (const s of rest.sections as { h?: unknown }[]) {
      const i = sections.findIndex((x) => x.h === s.h);
      if (i >= 0) sections[i] = { ...sections[i], ...(s as object) };
      else sections.push(s as (typeof sections)[number]);
    }
    merged.sections = sections;
  }
  return merged;
}

function describe(b: Block) {
  return `${TYPE_LABEL[b.type]}: ${b.title}`;
}

const onlySections = (set: Record<string, unknown>) =>
  Object.keys(set).every((k) => k === "sections" || k === "id" || k === "type") && Array.isArray(set.sections);

/**
 * Article patches that only touch sections get a section-level inverse, so undoing one
 * streamed section removes just that section (not the ones that arrived after it).
 */
function patchInverse(old: Block, set: Record<string, unknown>): Inverse {
  if (old.type !== "article" || !onlySections(set)) return { kind: "replace", block: old };
  const heads = (set.sections as { h?: unknown }[]).map((x) => String(x.h));
  return {
    kind: "sections",
    id: old.id,
    remove: heads.filter((h) => !old.sections.some((x) => x.h === h)),
    restore: old.sections.filter((x) => heads.includes(x.h)),
  };
}

function patchLabel(old: Block, set: Record<string, unknown>): string {
  if (old.type === "article" && onlySections(set)) {
    const heads = (set.sections as { h?: unknown }[]).map((x) => `“${String(x.h)}”`).join(", ");
    return `Updated ${describe(old)}: ${heads}`;
  }
  return `Updated ${describe(old)}`;
}

/** Pure: apply one Director op. Never throws; an unusable op becomes a no-op with a history note. */
export function applyOp(state: StageState, op: Op, turn: TurnContext = newTurnContext()): OpResult {
  const at = Date.now();
  const mapId = (id: string) => turn.renames[id] ?? id;

  switch (op.op) {
    case "add": {
      let block = op.block;
      if (state.blocks.some((b) => b.id === block.id)) {
        const fresh = nextFreeId(state.blocks);
        turn.renames[block.id] = fresh;
        block = { ...block, id: fresh };
      }
      block = rewriteRefs(block, turn.renames);
      // earlier blocks of this turn that point at a now-renamed id
      const blocks = state.blocks.map((b) => (turn.addedIds.includes(b.id) ? rewriteRefs(b, turn.renames) : b));
      const after = op.after == null ? null : mapId(op.after);
      const afterIdx = after == null ? -1 : blocks.findIndex((b) => b.id === after);
      const index = afterIdx >= 0 ? afterIdx + 1 : blocks.length;
      blocks.splice(index, 0, block);
      turn.addedIds.push(block.id);
      return {
        state: { ...state, blocks },
        entry: { id: entryId(), op: "add", status: "applied", turn: null, at, blockId: block.id, label: `Added ${describe(block)}`, inverse: { kind: "remove", id: block.id } },
        landed: block.id,
      };
    }

    case "patch": {
      const id = mapId(op.id);
      const idx = state.blocks.findIndex((b) => b.id === id);
      if (idx < 0) {
        return { state, landed: null, entry: { id: entryId(), op: "patch", status: "skipped", turn: null, at, blockId: id, label: `Update skipped: no block ${id}`, inverse: null } };
      }
      const old = state.blocks[idx];
      const parsed = Block.safeParse(mergePatch(old, op.set));
      const problem = parsed.success ? blockProblem(parsed.data) : parsed.error.issues[0]?.message;
      if (!parsed.success || problem) {
        return {
          state, landed: null,
          entry: { id: entryId(), op: "patch", status: "skipped", turn: null, at, blockId: id, label: `Update skipped for ${describe(old)} (${problem ?? "invalid"})`, inverse: null },
        };
      }
      const blocks = [...state.blocks];
      blocks[idx] = parsed.data;
      return {
        state: { ...state, blocks },
        entry: { id: entryId(), op: "patch", status: "applied", turn: null, at, blockId: id, label: patchLabel(old, op.set), inverse: patchInverse(old, op.set) },
        landed: id,
      };
    }

    case "remove": {
      const id = mapId(op.id);
      const index = state.blocks.findIndex((b) => b.id === id);
      if (index < 0) return { state, entry: null, landed: null };
      const block = state.blocks[index];
      return {
        state: {
          ...state,
          blocks: state.blocks.filter((b) => b.id !== id),
          focusId: state.focusId === id ? null : state.focusId,
        },
        entry: { id: entryId(), op: "remove", status: "applied", turn: null, at, blockId: id, label: `Removed ${describe(block)}`, inverse: { kind: "restore", block, index } },
        landed: null,
      };
    }

    case "layout": {
      if (state.mode === op.mode) return { state, entry: null, landed: null };
      return {
        state: { ...state, mode: op.mode },
        entry: {
          id: entryId(), op: "layout", status: "applied", turn: null, at, blockId: null, label: `Switched to ${op.mode}`,
          inverse: { kind: "view", mode: state.mode, focusId: state.focusId, fullscreen: state.fullscreen },
        },
        landed: null,
      };
    }

    case "focus": {
      const id = mapId(op.id);
      const block = state.blocks.find((b) => b.id === id);
      if (!block) return { state, entry: null, landed: null };
      return {
        state: { ...state, focusId: id, fullscreen: op.fullscreen },
        entry: {
          id: entryId(), op: "focus", status: "applied", turn: null, at, blockId: id, label: `Focused ${describe(block)}${op.fullscreen ? " (fullscreen)" : ""}`,
          inverse: { kind: "view", mode: state.mode, focusId: state.focusId, fullscreen: state.fullscreen },
        },
        landed: null,
      };
    }
  }
}

/** Pure: apply an inverse. Returns the state unchanged if the inverse no longer applies. */
export function applyInverse(state: StageState, inv: Inverse): StageState {
  switch (inv.kind) {
    case "remove":
      return { ...state, blocks: state.blocks.filter((b) => b.id !== inv.id), focusId: state.focusId === inv.id ? null : state.focusId };
    case "restore": {
      if (state.blocks.some((b) => b.id === inv.block.id)) return state;
      const blocks = [...state.blocks];
      blocks.splice(Math.min(inv.index, blocks.length), 0, inv.block);
      return { ...state, blocks };
    }
    case "sections":
      return {
        ...state,
        blocks: state.blocks.map((b) => {
          if (b.id !== inv.id || b.type !== "article") return b;
          const sections = b.sections
            .filter((x) => !inv.remove.includes(x.h))
            .map((x) => inv.restore.find((r) => r.h === x.h) ?? x);
          return sections.length ? { ...b, sections } : b;
        }),
      };
    case "replace":
      return { ...state, blocks: state.blocks.map((b) => (b.id === inv.block.id ? inv.block : b)) };
    case "view":
      return { ...state, mode: inv.mode, focusId: inv.focusId, fullscreen: inv.fullscreen };
  }
}
