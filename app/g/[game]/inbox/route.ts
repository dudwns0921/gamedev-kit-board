import { GAME } from "@/lib/auth";
import { trusted } from "@/lib/guard";
import { summary } from "@/lib/games";
import { status } from "@/lib/inbox";

// Where the answers sent to this game stand: waiting for the session, taken by it, or waiting with no session to take them.
export async function GET(req: Request, { params }: { params: Promise<{ game: string }> }) {
  const { game } = await params;
  if (!trusted(req)) return new Response("not from this app", { status: 403 });
  if (!GAME.test(game)) return new Response("not found", { status: 404 });
  const s = await summary(game);
  if (!s) return new Response("not found", { status: 404 });
  const { batches: _, ...box } = await status(s);
  return Response.json(box, { headers: { "cache-control": "no-store" } });
}
