import type { Summary } from "./board";
import { keys, read } from "./storage";

export * from "./board";

export async function summary(game: string): Promise<Summary | null> {
  const got = await read(`games/${game}/summary.json`);
  return got ? (JSON.parse(got.body.toString("utf8")) as Summary) : null;
}

export async function games(): Promise<Summary[]> {
  const ids = (await keys("games/")).filter((k) => k.endsWith("/summary.json")).map((k) => k.split("/")[1]);
  const all = await Promise.all(ids.map(summary));
  return all.filter((s): s is Summary => s !== null).sort((a, b) => b.received.localeCompare(a.received));
}
