import { keys, read } from "./storage";

// The shape of the kit's board.json (board.py writes it beside the board). Fields the kit adds later simply pass through.
export type Summary = {
  game: string;
  name: string;
  drawn: string;
  received: string;
  complete: number;
  share: string | null;
  now: { cycle: string; name: string; stage: string } | null;
  counts: { problems: number; not_made: number; placeholders: number; undecided: number; review: number };
  stages: { name: string; complete: number | null }[];
};

export async function summary(game: string): Promise<Summary | null> {
  const got = await read(`games/${game}/summary.json`);
  return got ? (JSON.parse(got.body.toString("utf8")) as Summary) : null;
}

export async function games(): Promise<Summary[]> {
  const ids = (await keys("games/")).filter((k) => k.endsWith("/summary.json")).map((k) => k.split("/")[1]);
  const all = await Promise.all(ids.map(summary));
  return all.filter((s): s is Summary => s !== null).sort((a, b) => b.received.localeCompare(a.received));
}
