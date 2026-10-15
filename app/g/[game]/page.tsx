import { notFound } from "next/navigation";
import { GAME } from "@/lib/auth";
import { summary } from "@/lib/games";
import Dashboard from "./dashboard";

export const dynamic = "force-dynamic";

export default async function Board({ params, searchParams }: { params: Promise<{ game: string }>; searchParams: Promise<{ tab?: string }> }) {
  const { game } = await params;
  if (!GAME.test(game)) notFound();
  const s = await summary(game);
  if (!s) notFound();
  if (!s.board) return <div className="empty">This game&apos;s board has not arrived in full yet — the game&apos;s next Claude turn sends it.</div>;
  return <Dashboard first={s} tab={(await searchParams).tab ?? ""} />;
}
