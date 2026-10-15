import { GAME } from "@/lib/auth";
import { follow } from "@/lib/follow";
import { trusted } from "@/lib/guard";

export const dynamic = "force-dynamic";

// The open page's one connection: it is told when a newer board arrives and when the game's inbox changes — it never asks on a clock.
// A dropped connection is opened again by the browser, and is told where things stand as it opens.
export async function GET(req: Request, { params }: { params: Promise<{ game: string }> }) {
  const { game } = await params;
  if (!trusted(req)) return new Response("not from this app", { status: 403 });
  if (!GAME.test(game)) return new Response("not found", { status: 404 });
  const enc = new TextEncoder();
  let stop = () => {};
  const body = new ReadableStream({
    start(out) {
      const tell = (event: string, data: unknown) => {
        try {
          out.enqueue(enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch { stop(); }
      };
      stop = follow(game, tell);
      req.signal.addEventListener("abort", () => {
        stop();
        try { out.close(); } catch { /* already closed */ }
      });
    },
    cancel() {
      stop();
    },
  });
  return new Response(body, { headers: { "content-type": "text/event-stream", "cache-control": "no-store, no-transform", connection: "keep-alive", "x-accel-buffering": "no" } });
}
