import { FILE, GAME, ingestOk } from "@/lib/auth";
import { keys } from "@/lib/storage";

// The kit lists the files its page shows (named by content); the answer is the ones not stored yet — only those are sent.
export async function POST(req: Request, { params }: { params: Promise<{ game: string }> }) {
  const { game } = await params;
  if (!ingestOk(req)) return new Response("unauthorized", { status: 401 });
  if (!GAME.test(game)) return new Response("bad game id", { status: 400 });
  const body = (await req.json().catch(() => null)) as { files?: unknown } | null;
  const files = Array.isArray(body?.files) ? body!.files.filter((f): f is string => typeof f === "string") : [];
  const have = new Set((await keys(`games/${game}/f/`)).map((k) => "f/" + k.split("/").pop()));
  const missing = files.filter((f) => f.startsWith("f/") && FILE.test(f.slice(2)) && !have.has(f));
  return Response.json({ missing });
}
