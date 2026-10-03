import { validateLine, type StreamLine } from "@/lib/contracts";
import { ObjectStreamParser } from "./stream-parser";

export const ERROR_SAY: StreamLine = { t: "say", text: "Something went wrong. Please try again." };

/**
 * Text deltas in, validated stream lines out. Invalid objects are dropped and logged.
 * Always ends with exactly one {"t":"done"}; nothing after "done" is forwarded.
 * If the source throws, a calm "say" is forwarded (only if no say was sent yet) before "done".
 */
export async function* validatedLines(
  deltas: AsyncIterable<string>,
  log: (msg: string) => void = (m) => console.warn(m),
): AsyncGenerator<StreamLine> {
  const parser = new ObjectStreamParser();
  let saidSomething = false;
  try {
    for await (const delta of deltas) {
      for (const obj of parser.push(delta)) {
        const r = validateLine(obj);
        if (!r.ok) {
          log(`[turn] dropped line: ${r.reason} :: ${obj.slice(0, 200)}`);
          continue;
        }
        if (r.line.t === "done") {
          yield r.line;
          return;
        }
        if (r.line.t === "say") {
          if (saidSomething) continue; // exactly one say
          saidSomething = true;
        }
        yield r.line;
      }
    }
    if (parser.pending) log(`[turn] stream ended inside an object: ${parser.pending.slice(0, 200)}`);
  } catch (e) {
    if ((e as Error).name === "AbortError") return; // client went away; nothing to send
    log(`[turn] upstream error: ${(e as Error).message}`);
    if (!saidSomething) yield ERROR_SAY;
  }
  yield { t: "done" };
}
