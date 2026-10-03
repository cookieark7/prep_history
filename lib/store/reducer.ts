import { Block, blockProblem, type Mode, type Op } from "@/lib/contracts";

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
  | { kind: "view"; mode: Mode; focusId: string | null; fullscreen: boolean };

export interface HistoryEntry {
  id: string;
  /** which Director op produced this entry (optional on entries saved before v0.1) */
  op?: Op["op"];
  label: string;
  at: number;
  blockId: string | null;
  inverse: Inverse | null; // null: nothing to undo (e.g. a skipped update)
  undone?: boolean;
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
  cause_graph: "Cause graph",
  timeline: "Timeline",
  lineage: "Lineage",
  predict_gate: "Prediction",
  quiz: "Quiz",
  callout: "Callout",
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
        entry: { id: entryId(), op: "add", at, blockId: block.id, label: `Added ${describe(block)}`, inverse: { kind: "remove", id: block.id } },
        landed: block.id,
      };
    }

    case "patch": {
      const id = mapId(op.id);
      const idx = state.blocks.findIndex((b) => b.id === id);
      if (idx < 0) {
        return { state, landed: null, entry: { id: entryId(), op: "patch", at, blockId: id, label: `Update skipped: no block ${id}`, inverse: null } };
      }
      const old = state.blocks[idx];
      const parsed = Block.safeParse(mergePatch(old, op.set));
      const problem = parsed.success ? blockProblem(parsed.data) : parsed.error.issues[0]?.message;
      if (!parsed.success || problem) {
        return {
          state, landed: null,
          entry: { id: entryId(), op: "patch", at, blockId: id, label: `Update skipped for ${describe(old)} (${problem ?? "invalid"})`, inverse: null },
        };
      }
      const blocks = [...state.blocks];
      blocks[idx] = parsed.data;
      return {
        state: { ...state, blocks },
        entry: { id: entryId(), op: "patch", at, blockId: id, label: `Updated ${describe(old)}`, inverse: { kind: "replace", block: old } },
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
        entry: { id: entryId(), op: "remove", at, blockId: id, label: `Removed ${describe(block)}`, inverse: { kind: "restore", block, index } },
        landed: null,
      };
    }

    case "layout": {
      if (state.mode === op.mode) return { state, entry: null, landed: null };
      return {
        state: { ...state, mode: op.mode },
        entry: {
          id: entryId(), op: "layout", at, blockId: null, label: `Switched to ${op.mode}`,
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
          id: entryId(), op: "focus", at, blockId: id, label: `Focused ${describe(block)}${op.fullscreen ? " (fullscreen)" : ""}`,
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
    case "replace":
      return { ...state, blocks: state.blocks.map((b) => (b.id === inv.block.id ? inv.block : b)) };
    case "view":
      return { ...state, mode: inv.mode, focusId: inv.focusId, fullscreen: inv.fullscreen };
  }
}
