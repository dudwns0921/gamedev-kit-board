import { GAME, signedIn } from "@/lib/auth";
import { read } from "@/lib/storage";

// The board page itself. Its pictures are relative (f/<hash>.png), so they load from /g/<game>/f/… beside it.
export async function GET(_req: Request, { params }: { params: Promise<{ game: string }> }) {
  const { game } = await params;
  if (!(await signedIn())) return new Response("sign in first", { status: 401 });
  if (!GAME.test(game)) return new Response("not found", { status: 404 });
  const got = await read(`games/${game}/page.html`);
  if (!got) return new Response("no board sent yet", { status: 404 });
  // The kit's page is a body without a head of its own — give it one that sets the charset and the phone width.
  const page = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body style="margin:0">'
    + got.body.toString("utf8") + "</body></html>";
  return new Response(page, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
}
