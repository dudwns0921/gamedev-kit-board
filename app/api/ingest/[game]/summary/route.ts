import { GAME, ingestOk, failed } from "@/lib/auth";
import { where, write } from "@/lib/storage";

// The board as data (the kit's board.json): what the list of games and the refresh read. Stamped with when it arrived.
export async function PUT(req: Request, { params }: { params: Promise<{ game: string }> }) {
  const { game } = await params;
  if (!ingestOk(req)) return new Response("unauthorized", { status: 401 });
  if (!GAME.test(game)) return new Response("bad game id", { status: 400 });
  const data = await req.json().catch(() => null);
  if (!data || typeof data !== "object" || Array.isArray(data)) return new Response("not a JSON object", { status: 400 });
  const stored = { ...data, game, received: new Date().toISOString() };
  try {
  await write(`games/${game}/summary.json`, Buffer.from(JSON.stringify(stored)), "application/json");
  } catch (err) {
    return failed(err, where());
  }
  return new Response(null, { status: 204 });
}
