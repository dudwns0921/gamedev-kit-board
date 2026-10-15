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

const UNTAKEN = 8_000; // a batch no watcher took in this long: no session of the game is open
const STRANDED = 60_000; // a batch taken this long ago, never read, with no watcher alive: the session it was meant to wake did not wake (or has gone)
const BEAT = 10_000; // the kit's monitor touches .watching every couple of seconds
const WORK = 10 * 60_000; // the kit marks .active on every prompt and tool — a session this recently at work takes answers when its turn ends

function alive(pid: number): boolean {
  try { process.kill(pid, 0); return true; } catch (e) { return (e as NodeJS.ErrnoException).code === "EPERM"; }
}

/** A watcher of the kit still holds this game: a monitor beating, or the after-turn hook waiting. */
async function watched(board: string): Promise<boolean> {
  const beat = await fs.stat(path.join(board, ".watching")).catch(() => null);
  if (beat && Date.now() - beat.mtimeMs < BEAT) return true;
  const pid = Number((await fs.readFile(path.join(board, ".rewake"), "utf8").catch(() => "")).trim());
  return Number.isInteger(pid) && pid > 0 && alive(pid);
}

/** Why the kit's after-turn hook last stopped waiting — the line it leaves in .rewake.log, without its time and pid. */
async function lastEnd(board: string): Promise<string> {
  const line = (await fs.readFile(path.join(board, ".rewake.log"), "utf8").catch(() => "")).trim();
  return line.split(" · ").slice(2).join(" · ");
}

/** Which keys are waiting to be taken, taken by the session, or relayed to it and being worked on (until the board stops asking them).
 *  untaken: a batch has waited long enough that no open session will take it. listening: a watcher of the kit holds the game now —
 *  answers sent wake its session; when none does, ended says why the last one stopped. */
export async function status(s: Summary): Promise<{ sent: string[]; taken: string[]; relayed: string[]; untaken: boolean; listening: boolean | null; working: boolean; ended: string; batches: string[] }> {
  const dir = box(s);
  const out = { sent: [] as string[], taken: [] as string[], relayed: [] as string[], untaken: false, listening: null as boolean | null, working: false, ended: "", batches: [] as string[] };
  if (!dir) return out;
  const names = await fs.readdir(dir).catch(() => [] as string[]);
  out.listening = await watched(s.local!.board!);
  if (!out.listening) {
    // mid-turn no watcher waits, but the turn's end brings one: the kit marks .active on every prompt and tool — and a batch it took
    // or relayed lately says the same, from a session started on a kit that does not mark it yet
    const recent = async (n: string) => {
      const st = await fs.stat(n.startsWith(".") ? path.join(s.local!.board!, n) : path.join(dir, n)).catch(() => null);
      return Boolean(st && Date.now() - st.mtimeMs < WORK);
    };
    out.working = (await recent(".active")) || (await Promise.all(names.filter((n) => /\.(taken|relayed)$/.test(n)).map(recent))).some(Boolean);
    if (!out.working) out.ended = await lastEnd(s.local!.board!);
  }
  const held = names.some((n) => n.endsWith(".taken")) ? await watched(s.local!.board!) : true;
  for (const n of names) {
    if (n.endsWith(".taken") && !held) {
      const at = (await fs.stat(path.join(dir, n)).catch(() => null))?.mtimeMs ?? Date.now();
      if (Date.now() - at > STRANDED) {
        out.untaken = true;
        out.batches.push(n);
      }
    }
    if (n.endsWith(".json")) {
      const at = Number(n.split("-")[0]);
      if (Number.isFinite(at) && Date.now() - at > UNTAKEN) {
        out.untaken = true;
        out.batches.push(n);
      }
    }
    const where = n.endsWith(".json") ? out.sent : n.endsWith(".taken") ? out.taken : n.endsWith(".relayed") ? out.relayed : null;
    if (!where) continue;
    const rows = JSON.parse(await fs.readFile(path.join(dir, n), "utf8").catch(() => "[]")) as Answer[];
    where.push(...rows.map((r) => r.key));
  }
  return out;
}
