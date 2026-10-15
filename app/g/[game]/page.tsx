import { notFound } from "next/navigation";
import { GAME } from "@/lib/auth";
import { summary } from "@/lib/games";
import Dashboard from "./dashboard";
import Live from "./live";

export const dynamic = "force-dynamic";

export default async function Board({ params, searchParams }: { params: Promise<{ game: string }>; searchParams: Promise<{ tab?: string }> }) {
  const { game } = await params;
  if (!GAME.test(game)) notFound();
  const s = await summary(game);
  if (!s) notFound();
  // A kit older than 0.43.0 sends no data to draw from — its own page is shown as it is
  if (!s.board) return <Live game={game} name={s.name} received={s.received} share={s.share} />;
  return <Dashboard first={s} tab={(await searchParams).tab ?? ""} />;
}
