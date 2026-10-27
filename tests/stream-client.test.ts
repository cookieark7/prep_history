import { describe, expect, it } from "vitest";
import { readNdjson } from "@/lib/stream-client";
import { readFixture } from "@/lib/fixtures";
import type { StreamLine } from "@/lib/contracts";
import { yearsInText } from "@/lib/period";

function bodyFrom(chunks: string[]) {
  const enc = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(c) {
      for (const ch of chunks) c.enqueue(enc.encode(ch));
      c.close();
    },
  });
}

async function read(chunks: string[]) {
  const lines: StreamLine[] = [];
  const invalid: string[] = [];
  const r = await readNdjson(bodyFrom(chunks), (l) => lines.push(l), (x) => invalid.push(x));
  return { ...r, lines, invalid };
}

describe("readNdjson", () => {
  const text = readFixture("punic-wars.ndjson").join("\n") + "\n";

  it("parses chunked input at any boundary, including split multi-byte characters", async () => {
    for (const size of [1, 5, 33, 4096]) {
      const bytes = new TextEncoder().encode(text + '{"t":"say","text":"Zama — 202 BCE"}\n');
      const chunks: Uint8Array[] = [];
      for (let i = 0; i < bytes.length; i += size) chunks.push(bytes.slice(i, i + size));
      const lines: StreamLine[] = [];
      const body = new ReadableStream<Uint8Array>({ start(c) { chunks.forEach((x) => c.enqueue(x)); c.close(); } });
      const r = await readNdjson(body, (l) => lines.push(l));
      expect(r.sawDone).toBe(true);
      expect(lines).toHaveLength(12);
      expect(lines.at(-1)).toEqual({ t: "say", text: "Zama — 202 BCE" });
    }
  });

  it("reports a stream that ends without done", async () => {
    const r = await read(['{"t":"say","text":"a"}\n{"t":"followup","kind":"test","label":"x"}']);
    expect(r.sawDone).toBe(false);
    expect(r.lines).toHaveLength(2);
  });

  it("skips invalid lines without stopping", async () => {
    const r = await read(['{"t":"say","text":"a"}\nnot json\n{"t":"nope"}\n{"t":"done"}\n']);
    expect(r.lines.map((l) => l.t)).toEqual(["say", "done"]);
    expect(r.invalid).toHaveLength(2);
  });
});

describe("yearsInText", () => {
  it("reads BCE ranges without misreading their first year as CE", () => {
    expect(yearsInText("Rome won the Second Punic War (218-201 BCE) [E] even after Cannae (216 BCE)")).toEqual([-218, -201]);
    expect(yearsInText("The conventional end date is 476")).toEqual([476, 476]);
  });
  it("gives a year with no era the passage's era", () => {
    expect(yearsInText("War broke out in 264 over Messana. Carthage lost Sicily by 241 BC.")).toEqual([-264, -241]);
    expect(yearsInText("Ashoka ruled from 268 BCE; the Gupta age began about 320 CE")).toEqual([-268, 320]);
  });
});
