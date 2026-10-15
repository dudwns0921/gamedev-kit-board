import { GAME } from "@/lib/auth";
import { trusted } from "@/lib/guard";
import { summary } from "@/lib/games";

// The board as it stands now — read by the page's Refresh (the page is otherwise told of a newer one over /events).
export async function GET(req: Request, { params }: { params: Promise<{ game: string }> }) {
  const { game } = await params;
  if (!trusted(req)) return new Response("not from this app", { status: 403 });
  if (!GAME.test(game)) return new Response("not found", { status: 404 });
  const s = await summary(game);
  return s ? Response.json(s, { headers: { "cache-control": "no-store" } }) : new Response("not found", { status: 404 });
}
