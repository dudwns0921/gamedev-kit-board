import { FILE, GAME, ingestOk } from "@/lib/auth";
import { write } from "@/lib/storage";

const LIMIT = 30 * 1024 * 1024;

export async function PUT(req: Request, { params }: { params: Promise<{ game: string; name: string }> }) {
  const { game, name } = await params;
  if (!ingestOk(req)) return new Response("unauthorized", { status: 401 });
  if (!GAME.test(game) || !FILE.test(name)) return new Response("bad name", { status: 400 });
  const body = Buffer.from(await req.arrayBuffer());
  if (body.length > LIMIT) return new Response("too large", { status: 413 });
  await write(`games/${game}/f/${name}`, body, req.headers.get("content-type") ?? "application/octet-stream");
  return new Response(null, { status: 204 });
}
