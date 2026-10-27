/**
 * Incremental extractor: feed it text deltas, get back complete top-level JSON object
 * strings. Brace-depth based and string-aware (braces inside strings, escaped quotes).
 * Whitespace and anything outside objects (stray prose, ``` fences) is ignored.
 * Never throws.
 *
 * Resync: the protocol puts one object per line, so when a new line starts with {"t":" while
 * an object is still open, the model forgot its closing brackets. The open object is closed
 * (brackets in the right order) and emitted, and the new one starts; `autoClosed` counts these.
 * Without this, one missing "}" would swallow every line after it.
 */
export class ObjectStreamParser {
  private buf = "";
  private depth = 0; // open braces: an object ends when this returns to 0
  private open: string[] = []; // open { and [ in order, to close them on resync
  private inString = false;
  private escaped = false;
  /** text after a newline inside an object, while deciding whether a new line object started */
  private probe: string | null = null;
  autoClosed = 0;
  /** objects from the last push() that were closed by a resync */
  readonly closedByResync = new Set<string>();

  push(chunk: string): string[] {
    const out: string[] = [];
    this.closedByResync.clear();
    for (const ch of chunk) this.step(ch, out);
    return out;
  }

  private step(ch: string, out: string[]) {
    if (this.depth === 0) {
      // outside any object: only an opening brace matters
      if (ch === "{") {
        this.depth = 1;
        this.open = ["{"];
        this.buf = "{";
      }
      return;
    }
    if (this.probe !== null) {
      this.probe += ch;
      const head = this.probe.trimStart();
      if (NEW_LINE.test(head)) return this.resync(head, out);
      if (head === "" || MAYBE_NEW_LINE.test(head)) return; // not decided yet
      const p = this.probe; // an ordinary newline inside the object (pretty-printed JSON)
      this.probe = null;
      for (const c of p) this.step(c, out);
      return;
    }
    this.consume(ch, out);
  }

  private consume(ch: string, out: string[]) {
    this.buf += ch;
    if (this.inString) {
      if (this.escaped) this.escaped = false;
      else if (ch === "\\") this.escaped = true;
      else if (ch === '"') this.inString = false;
      return;
    }
    if (ch === '"') this.inString = true;
    else if (ch === "[") this.open.push("[");
    else if (ch === "]") { if (this.open.at(-1) === "[") this.open.pop(); }
    else if (ch === "{") { this.depth++; this.open.push("{"); }
    else if (ch === "}") {
      this.depth--;
      while (this.open.length && this.open.pop() !== "{") { /* drop unclosed [ inside it */ }
      if (this.depth === 0) {
        out.push(this.buf);
        this.buf = "";
        this.open = [];
      }
    } else if (ch === "\n") this.probe = "";
  }

  /** Close the open object, emit it, and start the new line object from `head`. */
  private resync(head: string, out: string[]) {
    const closers = [...this.open].reverse().map((c) => (c === "{" ? "}" : "]")).join("");
    const closed = this.buf.trimEnd() + closers;
    out.push(closed);
    this.closedByResync.add(closed);
    this.autoClosed++;
    this.buf = "";
    this.depth = 0;
    this.open = [];
    this.probe = null;
    for (const c of head) this.step(c, out);
  }

  /** Text of an object still being built (useful for diagnostics when a stream is cut off). */
  get pending(): string {
    return this.buf + (this.probe ?? "");
  }
}

const NEW_LINE = /^\{\s*"t"\s*:\s*"/;
// a prefix that could still become NEW_LINE
const MAYBE_NEW_LINE = /^\{\s*(?:"(?:t(?:"\s*(?::\s*)?)?)?)?$/;
