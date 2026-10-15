import { notFound } from "next/navigation";
import { GAME, requireSession } from "@/lib/auth";
import { summary } from "@/lib/games";
import Live from "./live";

export const dynamic = "force-dynamic";

export default async function Board({ params }: { params: Promise<{ game: string }> }) {
  await requireSession();
  const { game } = await params;
  if (!GAME.test(game)) notFound();
  const s = await summary(game);
  if (!s) notFound();
  return <Live game={game} name={s.name} received={s.received} share={s.share} />;
}
