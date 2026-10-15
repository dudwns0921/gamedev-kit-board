import { GAME, failed, ingestOk } from "@/lib/auth";
import { removeAll, where } from "@/lib/storage";

// Takes a game off the board: its page, its summary and its files. The next push from that game puts it back.
export async function DELETE(req: Request, { params }: { params: Promise<{ game: string }> }) {
  const { game } = await params;
  if (!ingestOk(req)) return new Response("unauthorized", { status: 401 });
  if (!GAME.test(game)) return new Response("bad game id", { status: 400 });
  try {
    return Response.json({ removed: await removeAll(`games/${game}/`) });
  } catch (err) {
    return failed(err, where());
  }
}
