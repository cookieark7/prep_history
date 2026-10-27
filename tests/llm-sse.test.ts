import { describe, expect, it, vi } from "vitest";
import { sseData } from "@/lib/llm/sse";

function bodyOf(chunks: (string | Uint8Array)[], onCancel?: () => void) {
  const enc = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(c) {
      for (const ch of chunks) c.enqueue(typeof ch === "string" ? enc.encode(ch) : ch);
      c.close();
    },
    cancel: onCancel,
  });
}
async function all(body: ReadableStream<Uint8Array>) {
  const out: string[] = [];
  for await (const d of sseData(body)) out.push(d);
  return out;
}

describe("sseData", () => {
  it("yields each event's data and stops at [DONE]", async () => {
    expect(await all(bodyOf(['data: {"a":1}\n\n', 'data: {"a":2}\n\n', "data: [DONE]\n\n", 'data: {"late":1}\n\n']))).toEqual(['{"a":1}', '{"a":2}']);
  });

  it("handles CRLF, comments, other fields and multi-line data", async () => {
    const out = await all(bodyOf([": keep-alive\r\n\r\n", "event: message\r\nid: 7\r\ndata: one\r\ndata: two\r\n\r\n"]));
    expect(out).toEqual(["one\ntwo"]);
  });

  it("joins lines and multi-byte characters split across chunks", async () => {
    const bytes = new TextEncoder().encode('data: {"t":"é—"}\n\n');
    const cut = bytes.indexOf(0xc3) + 1; // inside "é"
    expect(await all(bodyOf(["da", "ta: x", "y\n", "\n", bytes.slice(0, cut), bytes.slice(cut)]))).toEqual(["xy", '{"t":"é—"}']);
  });

  it("yields a last event that has no closing blank line", async () => {
    expect(await all(bodyOf(["data: tail"]))).toEqual(["tail"]);
  });

  it("cancels the body when the consumer stops early", async () => {
    const cancel = vi.fn();
    const enc = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      start(c) { c.enqueue(enc.encode("data: 1\n\ndata: 2\n\n")); }, // never closes, like a live connection
      cancel,
    });
    for await (const d of sseData(body)) { expect(d).toBe("1"); break; }
    expect(cancel).toHaveBeenCalled();
  });
});
