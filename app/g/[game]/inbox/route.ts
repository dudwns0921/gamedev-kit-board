import { GAME, signedIn } from "@/lib/auth";
import { summary } from "@/lib/games";
import { status } from "@/lib/inbox";

// Where the answers sent to this game stand: waiting for the session, or taken by it.
export async function GET(_req: Request, { params }: { params: Promise<{ game: string }> }) {
  const { game } = await params;
  if (!(await signedIn())) return new Response("sign in first", { status: 401 });
  if (!GAME.test(game)) return new Response("not found", { status: 404 });
  const s = await summary(game);
  if (!s) return new Response("not found", { status: 404 });
  return Response.json(await status(s), { headers: { "cache-control": "no-store" } });
}
