import { act, type Act } from "@/lib/act";
import { GAME } from "@/lib/auth";
import { trusted } from "@/lib/guard";
import { summary } from "@/lib/games";

// The dashboard acting on a game (signed in only): body is one Act.
export async function POST(req: Request, { params }: { params: Promise<{ game: string }> }) {
  const { game } = await params;
  if (!trusted(req)) return new Response("not from this app", { status: 403 });
  if (!GAME.test(game)) return new Response("not found", { status: 404 });
  const s = await summary(game);
  if (!s) return new Response("not found", { status: 404 });
  const body = (await req.json().catch(() => null)) as Act | null;
  if (!body) return new Response("bad request", { status: 400 });
  const got = await act(s, body);
  return Response.json(got, { status: got.ok ? 200 : 400 });
}
