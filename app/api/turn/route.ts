import Anthropic from "@anthropic-ai/sdk";
import { TurnRequest, type StreamLine } from "@/lib/contracts";
import { DIRECTOR_SYSTEM_PROMPT } from "@/lib/director/system-prompt";
import { buildContext } from "@/lib/director/context";
import { mockLines } from "@/lib/director/mock";
import { validatedLines } from "@/lib/director/pipeline";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MOCK = process.env.MOCK_LLM === "1";
const MOCK_DELAY_MS = 150;

const HEADERS = {
  "Content-Type": "application/x-ndjson; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Accel-Buffering": "no",
};

export async function POST(request: Request) {
  if (!MOCK && (!process.env.ANTHROPIC_API_KEY || !process.env.CHRONICLE_MODEL)) {
    console.error("[turn] ANTHROPIC_API_KEY and CHRONICLE_MODEL are required unless MOCK_LLM=1");
    return Response.json(
      { error: "Server is not configured: set ANTHROPIC_API_KEY and CHRONICLE_MODEL, or MOCK_LLM=1." },
      { status: 500 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Body must be JSON." }, { status: 400 });
  }
  const parsed = TurnRequest.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid turn request.", issues: parsed.error.issues }, { status: 400 });
  }
  const turn = parsed.data;
  if (!turn.message && !turn.event) {
    return Response.json({ error: "Send a message or an event." }, { status: 400 });
  }

  const upstream = new AbortController();
  request.signal.addEventListener("abort", () => upstream.abort());

  const deltas = MOCK ? mockDeltas(turn, upstream.signal) : llmDeltas(turn, upstream.signal);
  const encoder = new TextEncoder();
  const lines = validatedLines(deltas);

  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { value, done } = await lines.next();
        if (done) return controller.close();
        controller.enqueue(encoder.encode(JSON.stringify(value satisfies StreamLine) + "\n"));
      } catch (e) {
        console.error("[turn] stream failure", e);
        controller.close();
      }
    },
    cancel() {
      upstream.abort();
      void lines.return(undefined);
    },
  });

  return new Response(stream, { headers: HEADERS });
}

async function* mockDeltas(turn: TurnRequest, signal: AbortSignal): AsyncGenerator<string> {
  const lines = mockLines(turn);
  for (const [i, line] of lines.entries()) {
    if (signal.aborted) return;
    if (i > 0) await sleep(MOCK_DELAY_MS, signal);
    yield line + "\n";
  }
}

async function* llmDeltas(turn: TurnRequest, signal: AbortSignal): AsyncGenerator<string> {
  const client = new Anthropic();
  const stream = client.messages.stream(
    {
      model: process.env.CHRONICLE_MODEL!,
      max_tokens: 6000,
      temperature: 0.3,
      system: [{ type: "text", text: DIRECTOR_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: buildContext(turn) }],
    },
    { signal },
  );
  for await (const ev of stream) {
    if (ev.type === "content_block_delta" && ev.delta.type === "text_delta") yield ev.delta.text;
  }
}

function sleep(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve) => {
    const t = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => { clearTimeout(t); resolve(); }, { once: true });
  });
}
