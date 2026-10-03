import type { HistoryEntry, StepStatus } from "./reducer";

type Loose = Record<string, unknown>;

const OP_BY_LABEL: [RegExp, HistoryEntry["op"]][] = [
  [/^Added /, "add"],
  [/^Update/, "patch"],
  [/^Removed /, "remove"],
  [/^Switched /, "layout"],
  [/^Focused /, "focus"],
];

/**
 * Storage v1 -> v2 (v0.1 E3: one step-trace shape).
 *  - history entries gain `op` (when missing), `status` (from `undone` / skipped) and `turn`
 *  - `turn` is recovered from each reply's old `landed` ids, in order
 *  - chat entries lose `landed`; new fields (`completed`) get defaults
 */
export function migrateV1toV2(state: Loose): Loose {
  const chat = Array.isArray(state.chat) ? (state.chat as Loose[]) : [];
  const history = (Array.isArray(state.history) ? (state.history as Loose[]) : []).map((h) => {
    const label = String(h.label ?? "");
    const status: StepStatus = h.undone ? "undone" : h.inverse ? "applied" : /^Update skipped/.test(label) ? "skipped" : "applied";
    const op = (h.op as HistoryEntry["op"] | undefined) ?? OP_BY_LABEL.find(([re]) => re.test(label))?.[1] ?? "patch";
    const { undone: _u, ...rest } = h;
    void _u;
    return { ...rest, op, status, turn: null as string | null } as Loose & { op: string; blockId?: unknown; turn: string | null };
  });

  // give each reply's landed blocks back to the first unclaimed matching history entries
  let cursor = 0;
  for (const c of chat) {
    if (c.role !== "director" || !Array.isArray(c.landed)) continue;
    for (const id of c.landed as string[]) {
      for (let i = cursor; i < history.length; i++) {
        const h = history[i];
        // v1 never listed skipped updates in `landed`
        if (h.turn == null && h.blockId === id && h.status !== "skipped" && (h.op === "add" || h.op === "patch")) {
          h.turn = String(c.id);
          cursor = i;
          break;
        }
      }
    }
  }

  return {
    ...state,
    history,
    chat: chat.map(({ landed: _l, ...rest }) => { void _l; return rest; }),
    completed: (state.completed as Loose | undefined) ?? {},
  };
}
