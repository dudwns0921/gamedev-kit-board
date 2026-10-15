import { FILE, GAME } from "@/lib/auth";
import { trusted } from "@/lib/guard";
import { read } from "@/lib/storage";

// A picture or sound the board shows. Named by its content, so it never changes — the browser keeps it.
export async function GET(req: Request, { params }: { params: Promise<{ game: string; name: string }> }) {
  const { game, name } = await params;
  if (!trusted(req)) return new Response("not from this app", { status: 403 });
  if (!GAME.test(game) || !FILE.test(name)) return new Response("not found", { status: 404 });
  const got = await read(`games/${game}/f/${name}`);
  if (!got) return new Response("not found", { status: 404 });
  return new Response(new Uint8Array(got.body), { headers: { "content-type": got.contentType, "cache-control": "private, max-age=31536000, immutable" } });
}
