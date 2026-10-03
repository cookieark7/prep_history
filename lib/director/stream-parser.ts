/**
 * Incremental extractor: feed it text deltas, get back complete top-level JSON object
 * strings. Brace-depth based and string-aware (braces inside strings, escaped quotes).
 * Whitespace and anything outside objects (stray prose, ``` fences) is ignored.
 * Never throws.
 */
export class ObjectStreamParser {
  private buf = "";
  private depth = 0;
  private inString = false;
  private escaped = false;

  push(chunk: string): string[] {
    const out: string[] = [];
    for (const ch of chunk) {
      if (this.depth === 0) {
        // outside any object: only an opening brace matters
        if (ch === "{") {
          this.depth = 1;
          this.buf = "{";
        }
        continue;
      }
      this.buf += ch;
      if (this.inString) {
        if (this.escaped) this.escaped = false;
        else if (ch === "\\") this.escaped = true;
        else if (ch === '"') this.inString = false;
        continue;
      }
      if (ch === '"') this.inString = true;
      else if (ch === "{") this.depth++;
      else if (ch === "}") {
        this.depth--;
        if (this.depth === 0) {
          out.push(this.buf);
          this.buf = "";
        }
      }
    }
    return out;
  }

  /** Text of an object still being built (useful for diagnostics when a stream is cut off). */
  get pending(): string {
    return this.buf;
  }
}
