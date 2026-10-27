/**
 * Server-sent events from a fetch body: yields the `data` payload of each event.
 * Handles CRLF, comment lines and multi-line data; stops at the OpenAI-style "[DONE]".
 */
export async function* sseData(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let data: string[] = [];
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      let nl: number;
      while ((nl = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, nl).replace(/\r$/, "");
        buf = buf.slice(nl + 1);
        if (line === "") {
          // a blank line ends the event
          if (data.length) {
            const payload = data.join("\n");
            data = [];
            if (payload === "[DONE]") return;
            yield payload;
          }
        } else if (line.startsWith("data:")) {
          data.push(line.slice(5).replace(/^ /, ""));
        }
        // "event:", "id:", "retry:" and ":" comments are not needed here
      }
    }
    const tail = (buf + decoder.decode()).replace(/\r$/, "");
    if (tail.startsWith("data:")) data.push(tail.slice(5).replace(/^ /, ""));
    if (data.length && data.join("\n") !== "[DONE]") yield data.join("\n");
  } finally {
    // also runs when the consumer stops early: close the connection instead of leaving it open
    await reader.cancel().catch(() => {});
  }
}
