"use client";

import { StreamLine, type TurnRequest, type UiEvent } from "@/lib/contracts";
import { newTurnContext } from "@/lib/store/reducer";
import { useWorkspace, workspaceSummary } from "@/lib/store/workspace";

/**
 * Reads an NDJSON body, validating each line. Calls onLine for valid lines and returns
 * whether a {"t":"done"} line arrived. Pure apart from the callbacks (unit tested).
 */
export async function readNdjson(
  body: ReadableStream<Uint8Array>,
  onLine: (line: StreamLine) => void,
  onInvalid: (raw: string) => void = () => {},
): Promise<{ sawDone: boolean }> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let sawDone = false;
  const handle = (raw: string) => {
    const text = raw.trim();
    if (!text) return;
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      return onInvalid(text);
    }
    const r = StreamLine.safeParse(json);
    if (!r.success) return onInvalid(text);
    if (r.data.t === "done") sawDone = true;
    onLine(r.data);
  };
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buf.indexOf("\n")) >= 0) {
      handle(buf.slice(0, nl));
      buf = buf.slice(nl + 1);
    }
  }
  buf += decoder.decode();
  handle(buf);
  return { sawDone };
}

let current: AbortController | null = null;

export function abortTurn() {
  current?.abort();
}

/** Send one turn (a learner message or a UI event) and stream the result into the store. */
export async function sendTurn(input: { message?: string; event?: UiEvent; detail?: string; echo?: string | null }) {
  const store = useWorkspace.getState();
  if (store.streaming) abortTurn();

  const message = input.message?.trim() || null;
  const event = input.event ?? null;
  const echo = input.echo === undefined ? message : input.echo;
  const entryId = store.beginTurn(echo, { message, eventJson: event ? JSON.stringify(event) : null });

  const req: TurnRequest = {
    message,
    event,
    workspace: workspaceSummary(useWorkspace.getState()),
    detail: input.detail ?? null,
  };

  const ctrl = new AbortController();
  current = ctrl;
  const turn = newTurnContext();
  const s = () => useWorkspace.getState();

  try {
    const res = await fetch("/api/turn", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
      signal: ctrl.signal,
    });
    if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
    const { sawDone } = await readNdjson(res.body, (line) => {
      switch (line.t) {
        case "say": return s().say(entryId, line.text);
        case "op": return s().applyDirectorOp(entryId, line.op, turn);
        case "followup": return s().followup(entryId, { kind: line.kind, label: line.label });
        case "done": return;
      }
    }, (raw) => console.warn("[chronicle] ignored invalid line", raw.slice(0, 160)));
    s().finishTurn(entryId, sawDone ? "done" : "error");
  } catch (e) {
    const aborted = (e as Error).name === "AbortError";
    s().finishTurn(entryId, aborted ? "aborted" : "error");
  } finally {
    if (current === ctrl) current = null;
  }
}

/** Replay a failed turn. The learner line is not echoed again. */
export function retryTurn(entryId: string) {
  const entry = useWorkspace.getState().chat.find((c) => c.id === entryId);
  if (!entry?.retry) return;
  const { message, eventJson } = entry.retry;
  void sendTurn({ message: message ?? undefined, event: eventJson ? JSON.parse(eventJson) : undefined, echo: null });
}
