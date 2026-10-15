import { GAME, signedIn } from "@/lib/auth";
import { summary } from "@/lib/games";

// What the open board polls to know a newer one arrived.
export async function GET(_req: Request, { params }: { params: Promise<{ game: string }> }) {
  const { game } = await params;
  if (!(await signedIn())) return new Response("sign in first", { status: 401 });
  if (!GAME.test(game)) return new Response("not found", { status: 404 });
  const s = await summary(game);
  return s ? Response.json(s, { headers: { "cache-control": "no-store" } }) : new Response("not found", { status: 404 });
}
