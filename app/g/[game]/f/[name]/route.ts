import { FILE, GAME } from "@/lib/auth";
import { trusted } from "@/lib/guard";
import { read } from "@/lib/storage";

// A picture, sound or clip the board shows. Named by its content, so it never changes — the browser keeps it.
// A clip is played by asking for parts of it (Range) — Safari on a phone plays nothing that cannot be asked for in parts.
export async function GET(req: Request, { params }: { params: Promise<{ game: string; name: string }> }) {
  const { game, name } = await params;
  if (!trusted(req)) return new Response("not from this app", { status: 403 });
  if (!GAME.test(game) || !FILE.test(name)) return new Response("not found", { status: 404 });
  const got = await read(`games/${game}/f/${name}`);
  if (!got) return new Response("not found", { status: 404 });
  const head = { "content-type": got.contentType, "cache-control": "private, max-age=31536000, immutable", "accept-ranges": "bytes" };
  const size = got.body.length;
  const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.get("range") ?? "");
  if (range && (range[1] || range[2])) {
    const start = range[1] ? Number(range[1]) : Math.max(0, size - Number(range[2]));
    const end = range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
    if (start >= size || start > end) return new Response(null, { status: 416, headers: { "content-range": `bytes */${size}` } });
    return new Response(new Uint8Array(got.body.subarray(start, end + 1)), {
      status: 206, headers: { ...head, "content-range": `bytes ${start}-${end}/${size}`, "content-length": String(end - start + 1) },
    });
  }
  return new Response(new Uint8Array(got.body), { headers: { ...head, "content-length": String(size) } });
}
