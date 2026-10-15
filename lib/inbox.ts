import { promises as fs } from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import type { Answer, Summary } from "./board";

// The game's inbox: one file per batch the user sends, in <board>/inbox/. The kit's watcher renames a batch to .taken when it hands it to
// the session, and removes it once relayed. Written whole and renamed in, so a watcher never reads half a file.

const KEY = /^[\w.-]{1,120}$/;

function box(s: Summary): string | null {
  return s.local?.board ? path.join(s.local.board, "inbox") : null;
}

export async function send(s: Summary, rows: Answer[]): Promise<{ ok: boolean; said: string }> {
  const dir = box(s);
  if (!dir) return { ok: false, said: "This game's board did not come from this machine." };
  const clean = rows.filter((r) => KEY.test(r.key) && (r.pick || r.note))
    .map((r) => ({ key: r.key, pick: String(r.pick).slice(0, 40), note: String(r.note ?? "").replace(/\s+/g, " ").trim().slice(0, 1000) }));
  if (!clean.length) return { ok: false, said: "Pick an answer first." };
  await fs.mkdir(dir, { recursive: true });
  const name = `${Date.now()}-${randomBytes(3).toString("hex")}`;
  await fs.writeFile(path.join(dir, name + ".part"), JSON.stringify(clean));
  await fs.rename(path.join(dir, name + ".part"), path.join(dir, name + ".json"));
  return { ok: true, said: `Sent ${clean.length} to the session.` };
}

/** Which keys are waiting to be taken, and which the session has taken but not yet relayed. */
export async function status(s: Summary): Promise<{ sent: string[]; taken: string[] }> {
  const dir = box(s);
  const out = { sent: [] as string[], taken: [] as string[] };
  if (!dir) return out;
  const names = await fs.readdir(dir).catch(() => [] as string[]);
  for (const n of names) {
    const where = n.endsWith(".json") ? out.sent : n.endsWith(".taken") ? out.taken : null;
    if (!where) continue;
    const rows = JSON.parse(await fs.readFile(path.join(dir, n), "utf8").catch(() => "[]")) as Answer[];
    where.push(...rows.map((r) => r.key));
  }
  return out;
}
