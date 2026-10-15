import { GAME } from "@/lib/auth";
import { trusted } from "@/lib/guard";
import { summary } from "@/lib/games";
import { status } from "@/lib/inbox";
import { due, start, view } from "@/lib/jobs";

// Where the answers sent to this game stand — waiting for the session, or taken by it — and Claude run here for them.
// A batch no open session took: the dashboard runs Claude on it, if the user has allowed that for this game.
export async function GET(req: Request, { params }: { params: Promise<{ game: string }> }) {
  const { game } = await params;
  if (!trusted(req)) return new Response("not from this app", { status: 403 });
  if (!GAME.test(game)) return new Response("not found", { status: 404 });
  const s = await summary(game);
  if (!s) return new Response("not found", { status: 404 });
  const { batches, ...box } = await status(s);
  if (s.local && (await due(game, batches))) await start(s, batches);
  return Response.json({ ...box, job: await view(game) }, { headers: { "cache-control": "no-store" } });
}
