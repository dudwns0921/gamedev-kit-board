import { GAME, ingestOk } from "@/lib/auth";
import { write } from "@/lib/storage";

// The board as the kit drew it: every page in one document. Shown as it is — the service does not redraw it.
export async function PUT(req: Request, { params }: { params: Promise<{ game: string }> }) {
  const { game } = await params;
  if (!ingestOk(req)) return new Response("unauthorized", { status: 401 });
  if (!GAME.test(game)) return new Response("bad game id", { status: 400 });
  await write(`games/${game}/page.html`, Buffer.from(await req.arrayBuffer()), "text/html; charset=utf-8");
  return new Response(null, { status: 204 });
}
