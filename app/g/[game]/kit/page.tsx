import { notFound } from "next/navigation";
import { GAME } from "@/lib/auth";
import { summary } from "@/lib/games";
import Live from "../live";

export const dynamic = "force-dynamic";

// The kit's own page, as the game drew it — kept beside the dashboard while the two are compared.
export default async function KitPage({ params }: { params: Promise<{ game: string }> }) {
  const { game } = await params;
  if (!GAME.test(game)) notFound();
  const s = await summary(game);
  if (!s) notFound();
  return <Live game={game} name={s.name} received={s.received} share={s.share} back={s.board ? `/g/${game}` : "/"} />;
}
